(function () {
    'use strict';

    angular
        .module('sound_bound.playlist')
        .controller('PlaylistController', PlaylistController);

    function PlaylistController() {
        var vm = this;

        console.log('Here!');
    }
})();
