(function() {
    'use strict';

    angular
        .module('sound_bound.util')
        .factory('Observable', ObservableFactory);

    function ObservableFactory() {
        return Observable;
    }

    function Observable() {
        var self = this;

        var observers = new Map();
        var nextId = 1;

        self.watch = function(callback, reaper) {
            var id = nextId;
            nextId += 1;
            observers.set(id, callback);

            return new EventHandle(id, reaper, function () {
                observers.delete(id);
            });
        };

        self.emit = function(...args) {
            for(var observer of observers) {
                observer[1].apply(args);
            }
        };
    }

    function EventHandle(id, reaper, unwatch) {
        var self = this;

        self.id = id;

        self.unwatch = function() {
            if(reaper) {
                reaper.untrack(self);
            }
            unwatch();
        };

        self._reap = unwatch;
    }
})();
