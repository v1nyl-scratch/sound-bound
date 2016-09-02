(function () {
    angular
        .module('sound-bound')
        .factory('mopidyService', mopidyService)

    function mopidyService() {
        var ws = new WebSocket('ws://localhost:6680/mopidy/ws');

        ws.onopen = function () {
            console.log("Web socket opened.");
        };

        ws.onerror = function () {
            console.log("Web socket broke.");
        };
    }

})();
