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

    function SbPlaybackWidgetController(mopidyService) {
        'ngInject';

        var pbvm = this;
        var evtHandlers = [];

        pbvm.currentTrack = {};

        init();

        function init() {

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

            var promise = mopidyService.rpc('core.playback.get_current_tl_track')
                .then(function (msg) {
                    console.log(msg);
                    pbvm.currentTrack = msg.result; 
                }).catch(function (err) {
                    console.log(err);
                });
        };
    }
})();
