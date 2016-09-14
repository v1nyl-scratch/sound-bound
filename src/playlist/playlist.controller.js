(function () {
    'use strict';

    angular
        .module('sound_bound.playlist')
        .controller('PlaylistController', PlaylistController);

    function PlaylistController($scope, mopidyService, reaperService, errorModalService) {
        var vm = this;

        vm.tracks = null;

        var reaper = reaperService.reaper($scope);

        init();

        function setToDefaults() {
            vm.tracks = [];
        }

        function init() {
            mopidyService.onConnect(onConnect, reaper);
            mopidyService.onDisconnect(onDisconnect, reaper);
            setToDefaults();
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

        function onDisconnect() {
            setToDefaults();
        }

    }
})();
