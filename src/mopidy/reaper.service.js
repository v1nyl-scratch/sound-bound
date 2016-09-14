(function() {
    angular
        .module('sound_bound.mopidy')
        .factory('reaperService', reaperService);

    function reaperService($log) {
        'ngInject';

        return new function() {
            var service = this;

            service.reaper = reaper;

            function reaper(scope) {
                return new MopidyEventReaper($log, scope);
            }
        }
    }

    function MopidyEventReaper($log, scope) {
        var obj = this;

        obj.track = track;
        obj.untrack = untrack;
        obj.objectCount = objectCount;

        var gallows = new Set();

        init();

        function init() {
            scope.$on('$destroy', function() {
                for(var obj of gallows) {
                    if(obj.unregister) {
                        //Event objects from mopidyService have a .unregister().
                        obj.unregister();
                    } else if(obj.abort) {
                        //Promise objects from mopidyService have a .abort().
                        obj.abort();
                    } else {
                        $log.warn('Reaper tracking an object that was not able to be reaped.');
                        $log.warn(obj);
                    }
                }
                $log.debug('Reaped ' + gallows.length + ' handlers.');
                gallows = [];
            });

            //We don't need to keep a reference to scope
            scope = null;
        }

        function track(obj) {
            gallows.add(obj);
        }

        function untrack(obj) {
            gallows.delete(obj);
        }

        function objectCount() {
            return gallows.size;
        }
    }
})();
