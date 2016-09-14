(function () {
    'use strict';

    angular
        .module('sound_bound.playback')
        .component('sbPlaybackWidget', {
            bindings: {},
            controller: SbPlaybackWidgetController,
            controllerAs: 'pbvm',
            templateUrl: 'src/playback/playbackWidget.html'
        });

    function SbPlaybackWidgetController($scope, errorModalService, mopidyService, reaperService) {
        'ngInject';

        var pbvm = this;

        pbvm.currentTrack = {};

        var reaper = reaperService.reaper($scope);

        init();

        function init() {
            watchForConnection(); 

            mopidyService.on('playback_state_changed', function (evt) {
            }, reaper);

            mopidyService.on('track_playback_started', function (evt) {
                pbvm.currentTrack = evt.tl_track;
            }, reaper);

            mopidyService.on('track_playback_ended', function (evt) {
            }, reaper);

        }

        function watchForConnection() {
            mopidyService.onConnect().then(onConnect);
        }

        function onConnect() {
            mopidyService.rpc('core.playback.get_current_tl_track', [], reaper)
                .then(function (msg) {
                    console.log(msg);
                    pbvm.currentTrack = msg.result; 
                }).catch(function (err) {
                    errorModalService.showError('Error getting current track: ' + err);
                });
        }

    }
})();
