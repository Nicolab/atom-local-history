/**
 * @name local-history (view)
 * @author Nicolas Tallefourtane <dev@nicolab.net>
 * @link https://github.com/Nicolab/atom-local-history
 * @license MIT https://github.com/Nicolab/atom-local-history/blob/master/LICENSE.md
 */

var helpers          = require('atom-helpers');
var _atom            = require('atom');
var SelectListView   = _atom.SelectListView;
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
}

helpers.extends(LocalHistoryView, SelectListView);

LocalHistoryView.prototype.initialize = function() {

  var _this = this;

  LocalHistoryView.__super__.initialize.apply(this, arguments);

  fileSizeLimit = atom.config.get('local-history.fileSizeLimit');

  atom.workspaceView.command('local-history:current-file', function() {
    _this.findLocalHistory('current-file');
  });

  atom.workspaceView.command('local-history:purge', function() {
    purge();
  });

  atom.workspace.eachEditor(function (editor) {
    editor.buffer.on('after-will-be-saved', function (buffer) {
      if(buffer.isModified() && fsPlus.getSizeSync(buffer.file.path) < fileSizeLimit) {
        save(buffer);
      }
    });
  });

  return this;
};

LocalHistoryView.prototype.destroy = function() {
  return LocalHistoryView.__super__.detach.apply(this, arguments);
};

LocalHistoryView.prototype.viewForItem = function(item) {

  var ext       = path.extname(item);
  var typeClass = 'icon-file-text';

  if (fsPlus.isReadmePath(item)) {
    typeClass = 'icon-book';
  } else if (fsPlus.isCompressedExtension(ext)) {
    typeClass = 'icon-file-zip';
  } else if (fsPlus.isImageExtension(ext)) {
    typeClass = 'icon-file-media';
  } else if (fsPlus.isPdfExtension(ext)) {
    typeClass = 'icon-file-pdf';
  } else if (fsPlus.isBinaryExtension(ext)) {
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

  var fileSize = fsPlus.getSizeSync(item);

  if(fileSizeLimit < fileSize) {

    var messages = new MessagePanelView({
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

  atom.workspaceView.open(item);
  return this;
};

LocalHistoryView.prototype.findLocalHistory = function(command) {

  var buffer = atom.workspace.activePaneItem && atom.workspace.activePaneItem.buffer;

  this.addClass('local-history overlay from-top');

  if(command === 'current-file' && buffer && buffer.file && buffer.file.path) {
    this.setItems(utils.getFileRevisionList(buffer.file.path));
  }

  if(!this.has('.local-history-path').length) {
    this.append('<div class="local-history-path">' +
      'Local history path: <em>' + localHistoryPath + '</em></div>');
  }

  atom.workspaceView.append(this);

  this.focusFilterEditor();
};


module.exports = LocalHistoryView;


//----------------------------------------------------------------------------//


function save(buffer) {

  var now  = new Date();

  var file = path.join(
    localHistoryPath,
    path.dirname(buffer.file.path),
    now.toISOString().replace(/^(\d{4}\-\d{2}\-\d{2}).(\d{2})\:(\d{2})\:(\d{2}).*$/,
    '$1_$2.$3.$4.') + path.basename(buffer.file.path)
  );

  fsPlus.writeFile(file, buffer.cachedDiskContents, function(err) {

    if(err) {
      var messages = new MessagePanelView({
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

      atom.emit('local-history:error-save', {
        filePath: buffer.file.path,
        revisionFilePath: file,
        buffer: buffer,
        error: err
      });

    }else{

      atom.emit('local-history:saved', {
        filePath: buffer.file.path,
        revisionFilePath: file,
        buffer: buffer
      });
    }
  });
}
