'use strict';

/**
 * @name local-history (view)
 * @author Nicolas Tallefourtane <dev@nicolab.net>
 * @link https://github.com/Nicolab/atom-local-history
 * @license MIT https://github.com/Nicolab/atom-local-history/blob/master/LICENSE.md
 */

const helpers          = require('atom-helpers');
const SelectListView   = require('atom-space-pen-views').SelectListView;
const exec             = require("child_process").exec;
const path             = require('path');
const fsPlus           = require('fs-plus');
const humanize         = require('humanize-plus');
const utils            = require('./utils');
const purge            = require('./purge');
const messagePanel     = require('atom-message-panel');
const MessagePanelView = messagePanel.MessagePanelView;
const PlainMessageView = messagePanel.PlainMessageView;
const localHistoryPath = utils.getLocalHistoryPath();

let fileSizeLimit;

/**
 * The view.
 */
class LocalHistoryView extends SelectListView {
  constructor() {
    super(...arguments);
    this.currentCommand = null;
    this.purge = purge;
  }

  initialize() {
    super.initialize(...arguments);

    fileSizeLimit = atom.config.get('local-history.fileSizeLimit');

    if (atom.config.get('local-history.autoPurge')) {
      let lastPurgeTime = localStorage.getItem('localHistory.lastPurge');
      let time = (new Date()).getTime() / 1000;

      if (!lastPurgeTime || (time - lastPurgeTime) > 86400) {
        localStorage.setItem('localHistory.lastPurge', time);

        setTimeout(() => {
          atom.commands.dispatch(
            atom.views.getView(atom.workspace),
            'local-history:purge'
          );
        }, 5000);
      }
    }

    return this;
  }

  destroy() {
    this.currentCommand = null;

    return super.detach(...arguments);
  }

  cancelled() {
    this.hide();
  }

  hide() {
    this.modalPanel.hide();
  }

  viewForItem(item) {
    let ext       = path.extname(item);
    let typeClass = 'icon-file-text';

    if (fsPlus.isReadmePath(item)) {
      typeClass = 'icon-book';
    }
    else if (fsPlus.isCompressedExtension(ext)) {
      typeClass = 'icon-file-zip';
    }
    else if (fsPlus.isImageExtension(ext)) {
      typeClass = 'icon-file-media';
    }
    else if (fsPlus.isPdfExtension(ext)) {
      typeClass = 'icon-file-pdf';
    }
    else if (fsPlus.isBinaryExtension(ext)) {
      typeClass = 'icon-file-binary';
    }

    return '<li class="two-lines">' +
      '<div class="primary-line file icon ' + typeClass + '" data-name="' +
        path.extname(item) + '" data-path="' + item + '">' +
        utils.getFileDate(item) + ' - ' + utils.getOriginBaseName(item) +
      '</div>' +

      '<div class="secondary-line path no-icon">' +
        item.substr(localHistoryPath.length) +
      '</div>' +
    '</li>';
  }

  confirmed(item) {
    let fileSize, messages;

    fileSize = fsPlus.getSizeSync(item);

    if (fileSizeLimit < fileSize) {
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

    if (this.currentCommand === 'difftool-current-file') {
      this.openDifftoolForCurrentFile(item);
    }
    else if (this.currentCommand === 'current-file'){
      atom.workspace.open(item);
    }

    return this;
  }

  findLocalHistory() {
    let currentFilePath, needRevList, workspaceView;

    workspaceView = atom.views.getView(atom.workspace);
    currentFilePath = helpers.editor.getCurrentFilePath();

    needRevList = [
      'current-file',
      'difftool-current-file'
    ]
    .indexOf(this.currentCommand) !== -1;

    this.addClass('local-history overlay from-top');

    if (needRevList && currentFilePath) {
      this.setItems(utils.getFileRevisionList(currentFilePath));
    }

    if (!this.has('.local-history-path').length) {
      this.append('<div class="local-history-path">' +
        'Local history path: <em>' + localHistoryPath + '</em></div>');
    }

    this.modalPanel = atom.workspace.addModalPanel({item: this});
    this.modalPanel.show();

    this.focusFilterEditor();
  }

  openDifftoolForCurrentFile(revision) {
    let currentFilePath = helpers.editor.getCurrentFilePath();

    if (currentFilePath) {
      return this.openDifftool(currentFilePath, revision);
    }
  }

  openDifftool(current, revision) {
    let basePath = atom.project.getPaths()[0];
    let diffCmd  = atom.config.get('local-history.difftoolCommand');

    if (diffCmd && basePath && current && revision) {
      diffCmd = diffCmd
        .replace(/\{current-file\}/g, current)
        .replace(/\{revision-file\}/g, revision)
      ;

      // If command starts with protocol (eg compare-files:), then we try to open it with atom
      if (diffCmd.match(/^([a-zA-Z0-9\-_]+:)/)) {
          return atom.workspace.open(diffCmd, { searchAllPanes : true });
      }

      return exec('cd "' + basePath + '" && ' + diffCmd, function(err) {
        let messages;

        if (!err) {
          return;
        }

        console.warn('local-history: difftool error', err);
        console.debug('local-history: difftool command', diffCmd);

        if (atom.config.get('local-history.difftoolCommandShowErrorMessage')) {
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
        }
      });
    }
  }

  saveRevision(buffer) {
    let file, revFileName;

    let now         = new Date();
    let day         = '' + now.getDate();
    let month       = '' + (now.getMonth() + 1);
    let hour        = '' + now.getHours(); //24-hours format
    let minute      = '' + now.getMinutes();
    let second      = '' + now.getSeconds();
    let pathDirName = path.dirname(buffer.file.path);

    if (day.length === 1) {
      day = '0' + day;
    }

    if (month.length === 1) {
      month = '0' + month;
    }

    if (hour.length === 1) {
      hour = '0' + hour;
    }

    if (minute.length === 1) {
      minute = '0' + minute;
    }

    if (second.length === 1) {
      second = '0' + second;
    }

    // YYYY-mm-dd_HH-ii-ss_basename
    revFileName  = now.getFullYear() +
      '-' + month +
      '-' + day +
      '_' + hour +
      '-' + minute +
      '-' + second +
      '_' + path.basename(buffer.file.path)
    ;

    if (process.platform === 'win32') {
      pathDirName = pathDirName.replace(/:/g,'');
    }

    file = path.join(localHistoryPath, pathDirName, revFileName);

    fsPlus.writeFile(file, buffer.getText(), function(err) {
      let messages;

      if (err) {
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
  }
}

module.exports = LocalHistoryView;
