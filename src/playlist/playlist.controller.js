(function () {
    'use strict';

    angular
        .module('sound_bound.playlist')
        .controller('PlaylistController', PlaylistController);

    function PlaylistController($scope, mopidyService, reaperService, errorModalService) {
        var vm = this;

        vm.tracks = [];

        var reaper = reaperService.reaper($scope);

        init();

        function init() {
            watchForConnection();
        }

        function watchForConnection() {
            mopidyService.onConnect().then(onConnect);
        }

        function onConnect() {
            var q = mopidyService.rpc("core.tracklist.slice", [0, 100], reaper)
                .then(function (msg) {
                    console.log(msg);
                for(var tl of msg.result) {
                    vm.tracks.push(tl.track);
                }
            }).catch(function (err) {
                if(err.isClientError()) {
                    erroModalService.showError("Couldn't load tracklist: " + err.toString());
                }
            });
        }

    }
})();
