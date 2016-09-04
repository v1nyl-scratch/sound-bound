(function () {
    'use strict';

    angular
        .module('sound_bound.playlist')
        .controller('PlaylistController', PlaylistController);

    function PlaylistController(mopidyService) {
        var vm = this;

        var moppy = new mopidyService();

        vm.tracks = [];

        var q = moppy.rpc("core.tracklist.slice", [0, 100]).then(function (msg) {
            console.log('Yay');
            console.log(msg);
            for(var tl of msg.result) {
                vm.tracks.push(tl.track);
            }
        }).catch(function (err) {
            console.log('Uh oh!');
            console.log(err);
        });
    }
})();
