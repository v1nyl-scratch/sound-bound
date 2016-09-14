(function () {
    'use strict';

    angular
        .module('sound_bound.tracklist')
        .component('sbTracklistWidget', {
            bindings: {},
            controller: TracklistWidgetController,
            controllerAs: 'vm',
            templateUrl: 'src/tracklist/tracklistWidget.html'
        });

    function TracklistWidgetController($document, $scope, errorModalService, mopidyService,
            reaperService) {
        'ngInject';
        var vm = this;
        var reaper = reaperService.reaper($scope);

        vm.tracks = [];
        vm.currentTrack = null;

        var handlers = [];

        function setToDefaults() {
            vm.tracks = [];
            vm.currentTrack = null;
        }

        init();

        function init() {
            mopidyService.onConnect(onConnect, reaper);
            mopidyService.onDisconnect(onDisconnect, reaper);
            setToDefaults();

            mopidyService.on('tracklist_changed', function(evt) {
                loadTracklist();
            }, reaper);
        }

        function loadTracklist() {
            mopidyService.rpc("core.tracklist.get_tl_tracks").then(function (msg) {
                vm.tracks = [];
                for(var tl of msg.result) {
                    vm.tracks.push(tl.track);
                }
            }).catch(function (err) {
                vm.tracks = [];
                console.log(err);
                errorModalService.showError('Unable to fetch tracklist: ' 
                        + err);
            });
        }

        function updateCurrentTrack() {
            if(vm.currentTrack !== null) {
            }

        }

        function onConnect() {
            mopidyService.rpc('core.tracklist.index', null, reaper).then(function(msg) {
                vm.currentTrack = msg.result;
                updateCurrentTrack();
            }).catch(function(err) {
                if(err.isClientError()) {
                    errorModalService.showError('Unable to get current track: ' 
                            + err.toString());
                }
            });
            loadTracklist();
        }

        function onDisconnect() {
            setToDefaults();
        }

    }
})();
