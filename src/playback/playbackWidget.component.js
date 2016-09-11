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

        pbvm.currentTrack = null;

        init();

        function init() {
            var evtHandlers = [];

            var handler = mopidyService.on('playback_state_changed', function () {
                
            });
            evtHandlers.push(handler);

            var handler = mopidyService.on('track_playback_started', function () {
            });
            evtHandlers.push(handler);

            var handler = mopidyService.on('track_playback_ended', function () {
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
