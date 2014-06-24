/**
 * @name local-history (utils)
 * @author Nicolas Tallefourtane <dev@nicolab.net>
 * @link https://github.com/Nicolab/atom-local-history
 * @license MIT https://github.com/Nicolab/atom-local-history/blob/master/LICENSE.md
 */

var fs               = require('fs-plus');
var path             = require('path');
var localHistoryPath = path.join(__dirname, '..', '..', '..', 'local-history');

module.exports.getFileDate = function getFileDate(filePath) {
  return path.basename(filePath).substr(0, 19).replace('_', ' ');
};

module.exports.getOriginBaseName = function getOriginBaseName(filePath) {
  return path.basename(filePath).substr(20);
};

module.exports.getFileRevisionList = function getFileRevisionList(filePath) {

  var isItsRev;
  var files        = [];
  var fileBaseName = path.basename(filePath);

  // list the directory (recursively) of the file
  var list         = fs.listTreeSync(path.join(
    this.getLocalHistoryPath(),
    path.dirname(filePath)
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
