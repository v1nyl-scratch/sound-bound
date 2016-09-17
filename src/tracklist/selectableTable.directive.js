(function() {
    'use strict';

    angular
        .module('sound_bound.tracklist')
        .directive('sbSelectableTable', SelectableTableDirective);

    function SelectableTableDirective() {
        var directive = {
            restrict: 'A',
            require: 'sbTableRowMapper',
            link: link,
            controller: SelectableTableController,
            controllerAs: 'stvm'
        };

        function link(scope, element, attrs, tableRowMapper) {
            scope.stvm.rowMapper = tableRowMapper.rowMapper;
        }

        return directive;
    }

    function SelectableTableController($scope) {
        var stvm = this;

        var selectedRows = new Set();
        var selectRangeStart = null;

        console.log($scope);

        init();

        stvm.onClick = onClick;

        function init() {
        }

        function onClick(track, index, $event) {
            var row = stvm.rowMapper.get(index);
            if($event.button == 0) {
                if($event.shiftKey) {
                    if(!selectRangeStart) {
                        toggleSelect(row);
                    } else {
                        var start = Math.min(selectRangeStart, index);
                        var end = Math.max(selectRangeStart, index);
                        if(start == end) {
                            toggleSelect(row);
                        } else {
                            if(selectRangeStart > index) {
                                end -= 1;
                            } else {
                                start += 1;
                            }
                            selectRange(start, end);
                        }
                    }
                    selectRangeStart = index;
                } else if($event.ctrlKey) {
                    toggleSelect(row);
                    selectRangeStart = index;
                } else {
                    var isSel = selectedRows.has(row)
                    clearSelection();
                    if(!isSel) {
                        selectRow(row); 
                    }
                    selectRangeStart = index;
                } 
            }
            console.log($event);
        }

        function selectRange(start, end) {
            var rows = stvm.rowMapper.slice(start, end+1);

            for(var row of rows) {
                toggleSelect(row);
            }
        }

        function clearSelection() {
            for(var row of selectedRows) {
                angular.element(row).removeClass('selected');
            }
            selectedRows.clear();
        }

        function selectRow(row) {
            angular.element(row).addClass('selected');
            selectedRows.add(row);
        }

        function toggleSelect(row) {
            if(selectedRows.has(row)) {
                angular.element(row).removeClass('selected');
                selectedRows.delete(row);
            } else {
                selectRow(row);
            }
        }

        $scope.onClick(onClick);
    }
})();
