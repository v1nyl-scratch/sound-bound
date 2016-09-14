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

    function SbPlaybackWidgetController(errorModalService, mopidyService) {
        'ngInject';

        var pbvm = this;
        var evtHandlers = [];

        var connectPromise = null;

        pbvm.currentTrack = {};

        init();

        function init() {
            watchForConnection(); 

            var handler = mopidyService.on('playback_state_changed', function (evt) {
            });
            evtHandlers.push(handler);

            var handler = mopidyService.on('track_playback_started', function (evt) {
                pbvm.currentTrack = evt.tl_track;
            });
            evtHandlers.push(handler);

            var handler = mopidyService.on('track_playback_ended', function (evt) {
            });
            evtHandlers.push(handler);

        }

        function watchForConnection() {
            connectPromise = mopidyService.onConnect().then(onConnect);
        }

        function onConnect() {
            mopidyService.rpc('core.playback.get_current_tl_track')
                .then(function (msg) {
                    console.log(msg);
                    pbvm.currentTrack = msg.result; 
                }).catch(function (err) {
                    errorModalService.showError('Error getting current track: ' + err);
                });
        }

    }
})();
