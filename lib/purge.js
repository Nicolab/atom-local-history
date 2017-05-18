'use strict';

/**
 * @name local-history (purge)
 * @author Nicolas Tallefourtane <dev@nicolab.net>
 * @link https://github.com/Nicolab/atom-local-history
 * @license MIT https://github.com/Nicolab/atom-local-history/blob/master/LICENSE.md
 */

const utils            = require('./utils');
const promise          = require("bluebird");
const fs               = promise.promisifyAll(require("fs"));
const path             = require('path');
const messagePanel     = require('atom-message-panel');
const MessagePanelView = messagePanel.MessagePanelView;
const PlainMessageView = messagePanel.PlainMessageView;
const localHistoryPath = utils.getLocalHistoryPath();

/**
 * Remove empty directories (asynchronous).
 *
 * @param {array} directories Array of directory paths to remove if empty.
 * @param {object} onError    Error handler
 */
function removeEmptyDirectories(directories, onError) {
  for (let i in directories) {
    // if the directory is empty, it is removed
    fs.rmdir(directories[i], function(err) {
      if (err && err.code != 'ENOTEMPTY') {
        onError && onError(err);
      }
    });
  }

  return true;
}

/**
 * Handle the flow of the purge.
 */
class Purge {
  /**
   * @constructor
   */
  constructor() {
    this.files  = {};
  }

  /**
   * Error handler.
   *
   * @param {object} error       Error object
   * @param {string} revFilePath Revision file path
   */
  onError(error, revFilePath) {
    let messages, message;
    let report = {localHistoryPath, error};

    messages = new MessagePanelView({
      title: 'Local history: <strong class="text-error">purge error</strong>',
      rawTitle: true
    });

    message = '- Can not purge the local history: <em>'
      + localHistoryPath + '</em>'
    ;

    if (revFilePath) {
      message += '<br>- path: <em>' + revFilePath + '</em>';
      report.path = revFilePath;
    }

    message += '<div class="text-error">- ' + error.toString() + '</div>';

    messages.attach();
    messages.add(new PlainMessageView({message, raw: true}));

    console.error('local-history:error-purge', report);
  }

  /**
   * Add a revision in the `files` container.
   *
   * @param {object} files       Files container
   * @param {string} revFilePath Revision file path
   * @return {object} Returns `files` container with `revFilePath` added inside
   */
  addRevFile(files, revFilePath) {
    let originBaseName = utils.getOriginBaseName(revFilePath);
    let key            = path.join(path.dirname(revFilePath), originBaseName);
    let day            = utils.getFileDate(revFilePath).substr(0, 10);

    if (!files[key]) {
      files[key] = {
        days: {}
      };
    }

    if (!files[key].days[day]) {
      files[key].days[day] = [];
    }

    files[key].days[day].push(revFilePath);

    return files;
  }

  /**
   * Purge expired revisions (asynchronous).
   *
   * @param {object} files A container of revision `files`.
   * @return {Promise|number} The `Promise` of last removed file(s) number.
   * @see Purge.addRevFile()
   */
  purgeRevFiles(files) {
    let daysLimit, lastRemoved, fileDays, days, day;

    daysLimit   = atom.config.get('local-history.daysLimit');
    lastRemoved = 0;

    for (let key in files) {
      fileDays = files[key].days;
      days     = Object.keys(fileDays);

      if (days.length <= daysLimit) {
        continue;
      }

      days = days.sort().slice(0, days.length - daysLimit);

      for (let i in days) {
        day = days[i];

        for (let iDay in fileDays[day]) {
          lastRemoved = fs
            .unlinkAsync(fileDays[day][iDay])
            .then(() => lastRemoved + 1)
            .catch((err) => this.onError(err, fileDays[i]))
          ;
        }
      }

      if (lastRemoved === days.length) {
        throw new Error(
          'Some files are not removed: <br>expected: ' + days.length +
          ' / removed: ' + lastRemoved
        );
      }
    }

    return lastRemoved;
  }

  /**
   * Scan a directory (recursive and asynchronous).
   *
   * @param {string} dirPath         The path of directory to scan.
   *
   * @param {function} [onFile]      The {function} to execute on each file,
   *                                 receives a single argument the absolute path.
   *
   * @param {function} [onDirectory] The {function} to execute on each directory,
   *                                 receives a single argument the absolute path.
   *
   * @return {Promise|array} Returns a `Promise` of an array of files / directories paths.
   */
  scanDir(dirPath, onFile, onDirectory) {
    return fs
      .readdirAsync(dirPath)
      .map((fileName) => {
        let filePath = path.join(dirPath, fileName);

        return fs.statAsync(filePath).then((stat) => {
          if (stat.isDirectory()) {
            onDirectory && onDirectory(filePath);

            return this.scanDir(filePath, onFile, onDirectory);
          }

          onFile && onFile(filePath);

          return filePath;
        });
      })
      .reduce((filePaths, val) => filePaths.concat(val), [])
    ;
  }

  /**
   * Purge a directory (recursive and asynchronous).
   *
   * @param {string}   dirPath       See `Purge.scanDir()`
   * @param {function} [onFile]      See `Purge.scanDir()`
   * @param {function} [onDirectory] See `Purge.scanDir()`
   * @return {Promise|number} See Purge.purgeRevFiles()
   */
  purgeDir(dirPath, onFile, onDirectory) {
    return this
      .scanDir(dirPath, onFile, onDirectory)
      .then((filePaths) => {
        let files = {};

        for (let i in filePaths) {
          files = this.addRevFile(files, filePaths[i]);
        }

        return files;
      })
      .then((files) => this.purgeRevFiles(files))
    ;
  }

  /**
   * Run the purge.
   * Purge expired revisions, then purge the empty directories.
   */
  run() {
    let directories = [];

    console.log('local-history:purge start');

    return this
      .purgeDir(
        localHistoryPath,
        null,
        (dirPath) => directories.push(dirPath)
      )
      .then(() => removeEmptyDirectories(directories, this.onError))
      .then(() => console.log('local-history:purge end'))
      .catch(this.onError)
    ;
  }
}

/**
 * Purge the old revisions files of local history.
 *
 * @see Purge.run()
 */
module.exports = function purge() {
  let p = new Purge();

  p.run();
};
