(function () {
    'use strict';

    angular
        .module('sound_bound.playlist')
        .controller('PlaylistController', PlaylistController);

    function PlaylistController(mopidyService) {
        var vm = this;

        var moppy = new mopidyService();
        var q = moppy.rpc("core.tracklist.slice", [0, 100]).then(function (msg) {
            console.log('Yay');
            console.log(msg);
        }).catch(function (err) {
            console.log('Uh oh!');
            console.log(err);
        });
    }
})();
