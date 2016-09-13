(function () {
    'use strict';

    angular
        .module('sound_bound.playback')
        .component('sbVolumeWidget', {
            bindings: {},
            controller: SbVolumeWidgetController,
            controllerAs: 'vwvm',
            templateUrl: 'src/playback/volumeWidget.html' 
        });

    function SbVolumeWidgetController($timeout, $scope, mopidyService) {
        'ngInject';

        var vwvm = this;

        vwvm.currentVolume = 0;

        //Public methods
        vwvm.onVolumeChange = onVolumeChange;

        var volumeChangePromise = null;
        var handler = null;
        var setVolumePromise = null;

        init();

        function init() {
            var p = mopidyService.rpc('core.mixer.get_volume')
                .then(function (msg) {
                    vwvm.currentVolume = msg.result;
                }).catch(function (err) {
                    console.log(err);
                });
            
            var handler = mopidyService.on('volume_changed', function (evt) {
                vwvm.currentVolume = evt.volume;
            });
        }; 

        function onVolumeChange() {
            if(setVolumePromise == null) {
                setVolumePromise = $timeout(function () {
                    volumeChangePromise = mopidyService
                        .rpc('core.mixer.set_volume', [parseInt(vwvm.currentVolume)])
                        .then(function (msg) {
                            console.log(msg);
                        }).catch(function (err) {
                            console.log(err);
                        });
                }, 125, false);

                setVolumePromise.finally(function () {
                    setVolumePromise = null;
                });
            }
        }

        $scope.$on("$destroy", function () {
            handler.close();
        });
    }

})();
