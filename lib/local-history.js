'use strict';

/**
 * @name local-history (main)
 * @author Nicolas Tallefourtane <dev@nicolab.net>
 * @link https://github.com/Nicolab/atom-local-history
 * @license MIT https://github.com/Nicolab/atom-local-history/blob/master/LICENSE.md
 */
const utils = require('./utils');

module.exports = {
  localHistoryView: null,

  config: {

    // 256 KB
    fileSizeLimit: {
      type: 'integer',
      default: 262144,
      description: 'Size max in byte. The files heavier than the defined size will not be saved.'
    },

    // in days
    daysLimit: {
      type: 'integer',
      default: 30,
      description: 'Days retention limit by original files. '
        + 'The oldest revision files are deleted when purging (local-history:purge)'
    },

    // enable automatic purge
    autoPurge: {
      type: 'boolean',
      default: false,
      title: 'Automatic purge',
      description: 'Enable or Disable the automatic purge. Triggered, max 1 time per day.'
    },

    historyStoragePath: {
      type: 'string',
      default: utils.getLocalHistoryPath(),
      title: 'History storage path.',
      description: 'Path where the revision files are stored.',
    },

    difftoolCommand: {
      type: 'string',
      default: 'meld "{current-file}" "{revision-file}"',
      description: 'A custom command to open your favorite diff tool'
    },

    // show error message in a message panel
    difftoolCommandShowErrorMessage: {
      type: 'boolean',
      default: true,
      title: 'Show the errors of the diff tool command',
      description: 'Display the errors in a message panel'
    }
  },

  activate(state) {
    let _this, fsPlus, fileSizeLimit, workspaceView;

    _this         = this;
    fsPlus        = require('fs-plus');
    fileSizeLimit = atom.config.get('local-history.fileSizeLimit');
    workspaceView = atom.views.getView(atom.workspace);

    atom.workspace.observeTextEditors(function(editor) {
      editor.buffer.onWillSave(function(/*willSaved*/) {
        let buffer      = editor.buffer;
        let hasFilePath = buffer && buffer.file && buffer.file.path;

        if (buffer.isModified()
        && hasFilePath
        && fsPlus.getSizeSync(buffer.file.path) < fileSizeLimit) {
          _this.getView().saveRevision(buffer);
        }
      });
    });

    atom.commands.add(
      'atom-workspace',
      'local-history:current-file',
      function() {
        let view = _this.getView();

        view.currentCommand = 'current-file';
        view.findLocalHistory();
      }
    );

    atom.commands.add(
      'atom-workspace',
      'local-history:difftool-current-file',
      function() {
        let view = _this.getView();

        view.currentCommand = 'difftool-current-file';
        view.findLocalHistory();
      }
    );

    atom.commands.add(
      'atom-workspace',
      'local-history:purge',
      function() {
        let view = _this.getView();

        view.currentCommand = 'purge';
        view.purge();
      }
    );
  },

  deactivate() {
    return this.getView().destroy();
  },

  serialize() {
    return {
      localHistoryViewState: this.getView().serialize()
    };
  },

  getView() {
    if (!this.localHistoryView) {
      let LocalHistoryView  = require('./local-history-view');
      this.localHistoryView = new LocalHistoryView();
    }

    return this.localHistoryView;
  }
};
