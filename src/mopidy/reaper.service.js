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
        obj.reap = reap;

        var gallows = new Set();

        init();

        function init() {
            scope.$on('$destroy', reap);

            //We don't need to keep a reference to scope
            scope = null;
        }

        //Manually trigger a reap. You probably don't need to call this.
        function reap() {
            for(var obj of gallows) {
                //_reap() should be checked first as it is exposed for the reaper
                //in case reaping should behave differently than unregister or abort.
                if(obj._reap) {
                    obj._reap();
                } else if(obj.unregister) {
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
            $log.debug('Reaped ' + gallows.size + ' handlers.');
            gallows.clear();
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
