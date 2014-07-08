var WorkspaceView = require('atom').WorkspaceView;
var LocalHistory  = require('../lib/local-history');

describe('LocalHistory', function() {

  var activationPromise = null;

  beforeEach(function() {
    atom.workspaceView = new WorkspaceView();
    activationPromise  = atom.packages.activatePackage('local-history');
  });

  describe('when `local-history:current-file` event is triggered', function() {

    it('attaches the view', function() {

      expect(atom.workspaceView.find('.local-history')).not.toExist();

      atom.workspaceView.trigger('local-history:current-file');

      waitsForPromise(function() {
        return activationPromise;
      });

      runs(function() {
        expect(atom.workspaceView.find('.local-history')).toExist();
        expect(atom.workspaceView.find('.local-history-path')).toExist();
      });

    });

  });

  describe('when `local-history:difftool-current-file` event is triggered', function() {

    it('attaches the view', function() {

      expect(atom.workspaceView.find('.local-history')).not.toExist();

      atom.workspaceView.trigger('local-history:difftool-current-file');

      waitsForPromise(function() {
        return activationPromise;
      });

      runs(function() {
        expect(atom.workspaceView.find('.local-history')).toExist();
        expect(atom.workspaceView.find('.local-history-path')).toExist();
      });

    });

  });
});
