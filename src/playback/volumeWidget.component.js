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

    function SbVolumeWidgetController($timeout, $scope, mopidyService, errorModalService) {
        'ngInject';

        var vwvm = this;

        vwvm.currentVolume = 0;

        //Public methods
        vwvm.onVolumeChange = onVolumeChange;

        var volumeChangePromise = null;
        var handler = null;
        var setVolumePromise = null;

        init();

        $scope.$on("$destroy", function () {
            handler.close();
        });

        function init() {
            onConnect();
            
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

        function watchForConnection() {
            mopidyService.onConnect().then(onConnect);
        }

        function onConnect() {
            mopidyService.rpc('core.mixer.get_volume')
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
