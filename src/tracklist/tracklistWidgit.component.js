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

    function TracklistWidgetController(mopidyService) {
        'ngInject';
        var vm = this;

        vm.tracks = [];

        var q = mopidyService.rpc("core.tracklist.slice", [0, 100]).then(function (msg) {
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
