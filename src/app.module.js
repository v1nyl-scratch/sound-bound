(function () {
    'use strict';

    angular.module('sound_bound', [
        'sound_bound.playlist',
        'sound_bound.playback',
        'sound_bound.mopidy',
        'sound_bound.modal',
        'sound_bound.tracklist',
        'sound_bound.util',

        'angularModalService'
    ]);
})();
