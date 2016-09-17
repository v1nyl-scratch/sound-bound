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
            reaperService, Observable) {
        'ngInject';
        var vm = this;
        var reaper = reaperService.reaper($scope);

        var tlidToIndex = new Map();

        vm.tracks = [];
        vm.currentTrack = null;
        vm.currentTrackIndex = null;
        vm.onClick = onClick;
        vm.selected = new Set();

        $scope.onClickEvent = new Observable();
        $scope.onClick = $scope.onClickEvent.watch;

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

            mopidyService.on('track_playback_started', function(evt) {
                vm.currentTrack = evt.tl_track;
                updateCurrentTrack();
            }, reaper);
        }

        function loadTracklist() {
            mopidyService.rpc("core.tracklist.get_tl_tracks").then(function (msg) {
                tlidToIndex.clear();
                var tracks = [];
                var i = 0;
                for(var tl of msg.result) {
                    tracks.push(tl);
                    tlidToIndex[tl.tlid] = i; 
                    i += 1;
                }
                vm.tracks = tracks;
                updateCurrentTrack();
            }).catch(function (err) {
                vm.tracks = [];
                errorModalService.showError('Unable to fetch tracklist: ' 
                        + err);
            });
        }

        function updateCurrentTrack() {
            if(vm.currentTrack) {
                vm.currentTrackIndex = tlidToIndex[vm.currentTrack.tlid];
                console.log(vm.currentTrackIndex);
            } else {
                vm.currentTrackIndex = null;
            }
        }

        function onConnect() {
            mopidyService.rpc('core.playback.get_current_tl_track', null, reaper)
            .then(function(msg) {
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

        function onClick(track, index) {
            select(track, index);
        }

        function select(track, index, unselect) {
            index = index || tlidToIndex[track.tlid];
            unselect = unselect || false;
            if(!unselect) {
                vm.selected.add(track);
            } else {
                vm.selected.delete(track);
            }
        }

    }
})();
