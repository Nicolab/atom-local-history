/**
 * @name local-history (main)
 * @author Nicolas Tallefourtane <dev@nicolab.net>
 * @link https://github.com/Nicolab/atom-local-history
 * @license MIT https://github.com/Nicolab/atom-local-history/blob/master/LICENSE.md
 */

var LocalHistoryView = require('./local-history-view');

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
      return this.localHistoryView =
        new LocalHistoryView(state.localHistoryViewState);
    },

    deactivate: function() {
      return this.localHistoryView.destroy();
    },

    serialize: function() {
      return {
        localHistoryViewState: this.localHistoryView.serialize()
      };
    }
  };
