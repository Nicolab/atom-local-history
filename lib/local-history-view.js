/**
 * @name local-history (view)
 * @author Nicolas Tallefourtane <dev@nicolab.net>
 * @link https://github.com/Nicolab/atom-local-history
 * @license MIT https://github.com/Nicolab/atom-local-history/blob/master/LICENSE.md
 */

var helpers          = require('atom-helpers');
var SelectListView   = require('atom-space-pen-views').SelectListView;
var exec             = require("child_process").exec;
var path             = require('path');
var fsPlus           = require('fs-plus');
var humanize         = require('humanize-plus');
var utils            = require('./utils');
var purge            = require('./purge');
var messagePanel     = require('atom-message-panel');
var MessagePanelView = messagePanel.MessagePanelView;
var PlainMessageView = messagePanel.PlainMessageView;
var localHistoryPath = utils.getLocalHistoryPath();
var fileSizeLimit;

function LocalHistoryView() {
  SelectListView.__super__.constructor.apply(this, arguments);
  this.currentCommand = null;
}

helpers.extends(LocalHistoryView, SelectListView);

LocalHistoryView.prototype.purge = purge;

LocalHistoryView.prototype.initialize = function() {
  LocalHistoryView.__super__.initialize.apply(this, arguments);
  fileSizeLimit = atom.config.get('local-history.fileSizeLimit');
  return this;
};

LocalHistoryView.prototype.destroy = function() {
  this.currentCommand = null;
  return LocalHistoryView.__super__.detach.apply(this, arguments);
};

LocalHistoryView.prototype.cancelled = function() {
  this.hide();
};

LocalHistoryView.prototype.hide = function() {
  this.modalPanel.hide();
};

LocalHistoryView.prototype.viewForItem = function(item) {
  var ext       = path.extname(item);
  var typeClass = 'icon-file-text';

  if(fsPlus.isReadmePath(item)) {
    typeClass = 'icon-book';
  }else if(fsPlus.isCompressedExtension(ext)) {
    typeClass = 'icon-file-zip';
  }else if(fsPlus.isImageExtension(ext)) {
    typeClass = 'icon-file-media';
  }else if(fsPlus.isPdfExtension(ext)) {
    typeClass = 'icon-file-pdf';
  }else if(fsPlus.isBinaryExtension(ext)) {
    typeClass = 'icon-file-binary';
  }

  return '<li class="two-lines">' +

    '<div class="primary-line file icon ' + typeClass + '" data-name="' +
      path.extname(item) + '" data-path="' + item + '">' +
      utils.getFileDate(item) + ' - ' + utils.getOriginBaseName(item) +
    '</div>' +

    '<div class="secondary-line path no-icon">' + item.substr(localHistoryPath.length) + '</div>' +
  '</li>';
};

LocalHistoryView.prototype.confirmed = function(item) {
  var fileSize, messages;

  fileSize = fsPlus.getSizeSync(item);

  if(fileSizeLimit < fileSize) {
    messages = new MessagePanelView({
      title: 'Local history: <strong class="text-error">file size limit</strong>',
      rawTitle: true
    });

    messages.attach();

    messages.add(new PlainMessageView({
      message: 'The size of the selected file (' + humanize.fileSize(fileSize) +
        ') is larger than the value of your configuration (' +
        humanize.fileSize(fileSize) + ').<br>' +
        'If you want, you can open directly the file <em>' + item + '</em>',
      raw: true
    }));

    return this;
  }

  if(this.currentCommand === 'difftool-current-file') {
    this.openDifftoolForCurrentFile(item);
  }else if(this.currentCommand === 'current-file'){
    atom.workspace.open(item);
  }

  return this;
};

LocalHistoryView.prototype.findLocalHistory = function() {
  var currentFilePath, needRevList, workspaceView;

  workspaceView = atom.views.getView(atom.workspace);
  currentFilePath = helpers.editor.getCurrentFilePath();

  needRevList = [
      'current-file',
      'difftool-current-file'
    ].indexOf(this.currentCommand) !== -1;

  this.addClass('local-history overlay from-top');

  if(needRevList && currentFilePath) {
    this.setItems(utils.getFileRevisionList(currentFilePath));
  }

  if(!this.has('.local-history-path').length) {
    this.append('<div class="local-history-path">' +
      'Local history path: <em>' + localHistoryPath + '</em></div>');
  }

  this.modalPanel = atom.workspace.addModalPanel({item: this});
  this.modalPanel.show();

  this.focusFilterEditor();
};

LocalHistoryView.prototype.openDifftoolForCurrentFile = function openDifftoolForCurrentFile(revision) {
  var currentFilePath = helpers.editor.getCurrentFilePath();

  if (currentFilePath) {
    return this.openDifftool(currentFilePath, revision);
  }
};

LocalHistoryView.prototype.openDifftool = function openDifftool(current, revision) {
  var basePath = atom.project.getPaths()[0];
  var diffCmd  = atom.config.get('local-history.difftoolCommand');

  if (diffCmd && basePath && current && revision) {
    diffCmd = diffCmd
      .replace(/\{current-file\}/g, current)
      .replace(/\{revision-file\}/g, revision)
    ;

    return exec('cd ' + basePath + ' && ' + diffCmd, function (err) {
      var messages;

      if(!err) {
        return;
      }

      messages = new MessagePanelView({
        title: 'Local history: <strong class="text-error">difftool Command</strong>',
        rawTitle: true
      });

      messages.attach();

      messages.add(new PlainMessageView({
        message:  'Check the field value of <strong>difftool Command</strong> ' +
        'in your settings (local-history package).' +
        '<hr><strong>Command error:</strong> <code>' + diffCmd + '</code>' +
        '<br><br><strong>Error details:</strong> ' + err.toString(),
        raw: true
      }));
    });
  }
};

LocalHistoryView.prototype.saveRevision = function saveRevision(buffer) {
  var now, day, month, pathDirName, file, revFileName;

  now         = new Date();
  day         = '' + now.getDate();
  month       = '' + (now.getMonth() + 1);
  pathDirName = path.dirname(buffer.file.path);

  if(day.length === 1) {
    day = '0' + day;
  }

  if(month.length === 1) {
    month = '0' + month;
  }

  // YYYY-mm-dd_HH-ii-ss_basename
  revFileName  = now.getFullYear() +
    '-' + month +
    '-' + day +
    '_' + now.toLocaleTimeString().replace(/:/g, '-') +
    '_' + path.basename(buffer.file.path)
  ;

  if(process.platform === 'win32') {
    pathDirName = pathDirName.replace(/:/g,'');
  }

  file = path.join(localHistoryPath, pathDirName, revFileName);

  fsPlus.writeFile(file, buffer.cachedText, function(err) {
    var messages;

    if(err) {
      messages = new MessagePanelView({
        title: 'Local history: <strong class="text-error">write error</strong>',
        rawTitle: true
      });

      messages.attach();

      messages.add(new PlainMessageView({
        message: '- Can not save the revision of the file: <em>' +
          buffer.file.path + '</em><br>' +
          '- Revision file is not saved: <em>' + file + '</em>' +
          '<div class="text-error">- ' + err.toString() + '</div>',
        raw: true
      }));
    }
  });
};

module.exports = LocalHistoryView;
