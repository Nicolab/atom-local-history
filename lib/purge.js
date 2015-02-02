/**
 * @name local-history (purge)
 * @author Nicolas Tallefourtane <dev@nicolab.net>
 * @link https://github.com/Nicolab/atom-local-history
 * @license MIT https://github.com/Nicolab/atom-local-history/blob/master/LICENSE.md
 */

var utils            = require('./utils');
var promise          = require("bluebird");
var fs               = promise.promisifyAll(require("fs"));
var path             = require('path');
var messagePanel     = require('atom-message-panel');
var MessagePanelView = messagePanel.MessagePanelView;
var PlainMessageView = messagePanel.PlainMessageView;
var localHistoryPath = utils.getLocalHistoryPath();

/**
 * @constructor
 */
function Purge() {
  this.files  = {};
}

/**
 * Error handler
 * @param {object} err         Error object
 * @param {string} revFilePath Revision file path
 */
Purge.prototype.onError = function onError(err, revFilePath) {
  var report, messages, message;

  report = {
    localHistoryPath: localHistoryPath,
    error: err
  };

  messages = new MessagePanelView({
    title: 'Local history: <strong class="text-error">purge error</strong>',
    rawTitle: true
  });

  message = '- Can not purge the local history: <em>' + localHistoryPath + '</em>';

  if(revFilePath) {
    message += '<br>- path: <em>' + revFilePath + '</em>';
    report.path = revFilePath;
  }

  message += '<div class="text-error">- ' + err.toString() + '</div>';

  messages.attach();

  messages.add(new PlainMessageView({
    message: message,
    raw: true
  }));

  atom.emit('local-history:error-purge', report);
};

/**
 * Add a revision in the `files` container
 * @param {object} files       Files container
 * @param {string} revFilePath Revision file path
 * @return {object} Returns `files` container with `revFilePath` added inside
 */
Purge.prototype.addRevFile = function addRevFile(files, revFilePath) {
  var originBaseName = utils.getOriginBaseName(revFilePath);
  var key            = path.join(path.dirname(revFilePath), originBaseName);
  var day            = utils.getFileDate(revFilePath).substr(0, 10);

  if(!files[key]) {
    files[key] = {
      days: {}
    };
  }

  if(!files[key].days[day]) {
    files[key].days[day] = [];
  }

  files[key].days[day].push(revFilePath);

  return files;
};

/**
 * Purge expired revisions (asynchronous).
 * @param {object} files A container of revision `files`.
 * @return {Promise|number} The `Promise` of last removed file(s) number.
 * @see Purge.addRevFile()
 */
Purge.prototype.purgeRevFiles = function purgeRevFiles(files) {
  var _this, daysLimit, lastRemoved, fileDays, days, day;

  _this       = this;
  daysLimit   = atom.config.get('local-history.daysLimit');
  lastRemoved = 0;

  for(var key in files) {
    fileDays = files[key].days;
    days     = Object.keys(fileDays);

    if(days.length <= daysLimit) {
      continue;
    }

    days = days.sort().slice(0, days.length - daysLimit);

    for(var i in days) {
      day = days[i];

      for(var iDay in fileDays[day]) {
        lastRemoved = fs.unlinkAsync(fileDays[day][iDay])
          .then(function() {
            return lastRemoved + 1;
          })
          .catch(function(err) {
            _this.onError(err, fileDays[i]);
          })
        ;
      }
    }

    if(lastRemoved === days.length) {
      throw new Error(
        'Some files are not removed: <br>expected: ' + days.length +
        ' / removed: ' + lastRemoved
      );
    }
  }

  return lastRemoved;
};

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
Purge.prototype.scanDir = function scanDir(dirPath, onFile, onDirectory) {
  var _this = this;

  return fs.readdirAsync(dirPath).map(function (fileName) {
    var filePath = path.join(dirPath, fileName);

    return fs.statAsync(filePath).then(function(stat) {

      if(stat.isDirectory()) {
        onDirectory && onDirectory(filePath);
        return _this.scanDir(filePath, onFile, onDirectory);
      }else{
        onFile && onFile(filePath);
        return filePath;
      }
    });
  })
  .reduce(function (filePaths, val) {
    return filePaths.concat(val);
  }, []);
};

/**
 * Purge a directory (recursive and asynchronous).
 * @param {string}   dirPath       See `Purge.scanDir()`
 * @param {function} [onFile]      See `Purge.scanDir()`
 * @param {function} [onDirectory] See `Purge.scanDir()`
 * @return {Promise|number} See Purge.purgeRevFiles()
 */
Purge.prototype.purgeDir = function purgeDir(dirPath, onFile, onDirectory) {
  var _this = this;

  return this.scanDir(dirPath, onFile, onDirectory)
    .then(function(filePaths) {
      var files = {};

      for(var i in filePaths) {
        files = _this.addRevFile(files, filePaths[i]);
      }

      return files;
    })
    .then(function(files) {
      return _this.purgeRevFiles(files);
    })
  ;
};

/**
 * Run the purge.
 * Purge expired revisions, then purge the empty directories
 */
Purge.prototype.run = function run() {
  var _this       = this;
  var directories = [];

  this.purgeDir(localHistoryPath, null, function(dirPath) {
      directories.push(dirPath);
    })
    .catch(_this.onError)
    .then(function() {
      removeEmptyDirectories(directories, _this.onError);
    })
  ;
};

/**
 * Purge the old revisions files of local history.
 * @see Purge.run()
 */
module.exports = function purge() {
  var p = new Purge();
  p.run();
};


//----------------------------------------------------------------------------//

/**
 * Remove empty directories (asynchronous).
 * @param {array} directories Array of directory paths to remove if empty.
 * @param {object} onError    Error handler
 */
function removeEmptyDirectories(directories, onError) {

  for(var i in directories) {

    // if the directory is empty, it is removed
    fs.rmdir(directories[i], function(err) {
      if(err && err.code != 'ENOTEMPTY') {
        onError && onError(err);
      }
    });
  }
}
