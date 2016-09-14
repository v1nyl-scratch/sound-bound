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

    function SbVolumeWidgetController($timeout, $scope, mopidyService, errorModalService,
            reaperService) {
        'ngInject';

        var vwvm = this;
        var reaper = reaperService.reaper($scope);

        vwvm.currentVolume = 0;

        //Public methods
        vwvm.onVolumeChange = onVolumeChange;

        var volumeChangePromise = null;
        var setVolumePromise = null;

        init();

        function init() {
            mopidyService.onConnect(onConnect, reaper);
            
            mopidyService.on('volume_changed', function (evt) {
                vwvm.currentVolume = evt.volume;
            }, reaper);
        }; 

        function onVolumeChange() {
            if(setVolumePromise == null) {
                setVolumePromise = $timeout(function () {
                    volumeChangePromise = mopidyService
                        .rpc('core.mixer.set_volume', [parseInt(vwvm.currentVolume)], reaper)
                        .then(function (msg) {
                        }).catch(function (err) {
                            console.log(err);
                        });
                }, 125, false);

                setVolumePromise.finally(function () {
                    setVolumePromise = null;
                });
            }
        }

        function onConnect() {
            mopidyService.rpc('core.mixer.get_volume', [], reaper)
                .then(function (msg) {
                    vwvm.currentVolume = msg.result;
                }).catch(function (err) {
                    if(err.isClientError()) {
                        errorModalService.showError('Unable to retrieve volume: ' 
                            + err.toString());
                    }
                });
        }
    }
})();
