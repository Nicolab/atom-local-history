/**
 * @name local-history (utils)
 * @author Nicolas Tallefourtane <dev@nicolab.net>
 * @link https://github.com/Nicolab/atom-local-history
 * @license MIT https://github.com/Nicolab/atom-local-history/blob/master/LICENSE.md
 */

var fs               = require('fs-plus');
var path             = require('path');
var localHistoryPath =  atom.config.get('local-history.historyStoragePath');

if(!localHistoryPath) {
  localHistoryPath = path.join(__dirname, '..', '..', '..', 'local-history');
}

module.exports.getFileDate = function getFileDate(filePath) {
  var basePath  = path.basename(filePath);
  var splitPath = basePath.split('_');
  var date      = splitPath[0];
  var time      = splitPath[1].split('-');

  time = time[0] + ':' + time[1]  + ':' + time[2];
  return date + ' ' + time;
};

module.exports.getOriginBaseName = function getOriginBaseName(filePath) {
  var basePath = path.basename(filePath);
  return basePath.substr(basePath.split('_', 2).join('_').length + 1);
};

module.exports.getFileRevisionList = function getFileRevisionList(filePath) {
  var isItsRev, files, fileBaseName, pathDirName, list;

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

  for(var i in list) {
    isItsRev = (path.basename(this.getOriginBaseName(list[i])) === fileBaseName);

    if(isItsRev && fs.isFileSync(list[i])) {
      files.push(list[i]);
    }
  }

  return files.sort().reverse();
};

module.exports.getLocalHistoryPath = function getLocalHistoryPath() {
  return localHistoryPath;
};
