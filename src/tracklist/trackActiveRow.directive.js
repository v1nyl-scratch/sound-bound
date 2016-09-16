(function() {
    'use strict';

    angular
        .module('sound_bound.tracklist')
        .directive('sbTrackActiveRow', TrackActiveRowDirective);

    function TrackActiveRowDirective() {
        var directive = {
            restrict: 'A',
            require: 'sbTableRowMapper',
            scope: {
                activeRowClass: '@activeRowClass',
                activeRow: '=activeRow'
            },
            priority: 100,
            link: link,
            controller: TrackActiveRowController,
            controllerAs: 'arvm',
            bindToController: true
        };

        function link(scope, element, attrs, tableRowMapper) {
            scope.arvm.rowMapper = tableRowMapper.rowMapper;

            scope.$watch('arvm.activeRow', function(newVal, oldVal) {
                if(newVal != oldVal) {
                    scope.arvm.activeRowChanged(newVal, oldVal);
                }
            }, false);

            scope.arvm.rowMapper.onTableUpdate(function() {
                scope.arvm.onTableUpdate();
            }, scope.arvm.reaper);
        }

        return directive;
    }

    function TrackActiveRowController($log, $scope, reaperService) {
        var arvm = this;

        var activeRowObj = null;

        arvm.activeRowChanged = activeRowChanged;
        arvm.onTableUpdate = onTableUpdate;
        arvm.reaper = reaperService.reaper($scope);

        function activeRowChanged(newRow, oldRow) {
            var row = arvm.rowMapper.get(newRow);
            changeActiveRow(row);
        }

        function onTableUpdate() {
            var row = arvm.rowMapper.get(arvm.activeRow);
            changeActiveRow(row);
        }

        function changeActiveRow(row) {
            if(row) {
                angular.element(row).addClass(arvm.activeRowClass);
            }
            if(activeRowObj) {
                angular.element(activeRowObj).removeClass(arvm.activeRowClass);
            }
            activeRowObj = row;
        }
    }
})();
