/**
 * @name local-history (utils)
 * @author Nicolas Tallefourtane <dev@nicolab.net>
 * @link https://github.com/Nicolab/atom-local-history
 * @license MIT https://github.com/Nicolab/atom-local-history/blob/master/LICENSE.md
 */

const fs = require('fs-plus');
const path = require('path');

let localHistoryPath =  atom.config.get('local-history.historyStoragePath');

if (!localHistoryPath) {
  localHistoryPath = path.join(__dirname, '..', '..', '..', 'local-history');
}

const utils = {
  normalizeFileName(filePath, defaultValue) {
    if (typeof filePath === 'string' && filePath.length) {
      return filePath;
    }

    if (typeof filePath === 'number') {
      return String(filePath);
    }

    return defaultValue;
  },

  getFileDate(filePath) {
    let basePath  = path.basename(filePath);
    let splitPath = basePath.split('_');
    let date      = splitPath[0];
    let time      = splitPath[1] ? splitPath[1].split('-') : ['00', '00', '00'];

    time = time[0] + ':' + time[1]  + ':' + time[2];
    return date + ' ' + time;
  },

  getOriginBaseName(filePath) {
    if (this.normalizeFileName(filePath) === undefined) {
      return;
    }

    let basePath = path.basename(filePath);

    return basePath.substr(basePath.split('_', 2).join('_').length + 1);
  },

  getFileRevisionList(filePath) {
    let isItsRev, originBaseName, files, fileBaseName, pathDirName, list;

    files        = [];
    fileBaseName = path.basename(filePath);
    pathDirName  = path.dirname(filePath);

    if (process.platform === 'win32') {
      pathDirName = pathDirName.replace(/:/g,'');
    }

    // list the directory (recursively) of the file
    list = fs.listTreeSync(path.join(
      this.getLocalHistoryPath(),
      pathDirName
    ));

    for (let i in list) {
      originBaseName = this.getOriginBaseName(list[i]);

      isItsRev = (
        typeof originBaseName === 'string'
        && path.basename(originBaseName) === fileBaseName
      );

      if (isItsRev && fs.isFileSync(list[i])) {
        files.push(list[i]);
      }
    }

    return files.sort().reverse();
  },

  getLocalHistoryPath() {
    return localHistoryPath;
  }
};

module.exports = utils;
