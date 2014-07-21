/**
 * @name local-history (main)
 * @author Nicolas Tallefourtane <dev@nicolab.net>
 * @link https://github.com/Nicolab/atom-local-history
 * @license MIT https://github.com/Nicolab/atom-local-history/blob/master/LICENSE.md
 */

module.exports = {

  localHistoryView: null,

  configDefaults: {

    // 256 KB
    fileSizeLimit: 262144,

    // in days
    daysLimit: 30,

    difftoolCommand: 'meld "{current-file}" "{revision-file}"'
  },

  activate: function(state) {

    var _this         = this;
    var fsPlus        = require('fs-plus');
    var fileSizeLimit = atom.config.get('local-history.fileSizeLimit');

    atom.workspace.eachEditor(function (editor) {

      editor.buffer.on('after-will-be-saved', function (buffer) {

        var hasFilePath = buffer && buffer.file && buffer.file.path;

        if(buffer.isModified()
          && hasFilePath
          && fsPlus.getSizeSync(buffer.file.path) < fileSizeLimit) {
          _this.getView().saveRevision(buffer);
        }
      });
    });

    atom.workspaceView.command('local-history:current-file', function() {

      var view = _this.getView();

      view.currentCommand = 'current-file';
      view.findLocalHistory();
    });

    atom.workspaceView.command('local-history:difftool-current-file', function() {

      var view = _this.getView();

      view.currentCommand = 'difftool-current-file';
      view.findLocalHistory();
    });

    atom.workspaceView.command('local-history:purge', function() {

      var view = _this.getView();

      view.currentCommand = 'purge';
      view.purge();
    });
  },

  deactivate: function() {
    return this.getView().destroy();
  },

  serialize: function() {
    return {
      localHistoryViewState: this.getView().serialize()
    };
  },

  getView: function() {

    if(!this.localHistoryView){
      var LocalHistoryView  = require('./local-history-view');
      this.localHistoryView = new LocalHistoryView();
    }

    return this.localHistoryView;
  }
};
