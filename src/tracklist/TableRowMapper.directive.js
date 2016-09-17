(function() {
    'use strict';

    angular
        .module('sound_bound.tracklist')
        .directive('sbTableRowMapper', TableRowMapperDirective);

    function TableRowMapperDirective($log, FragmentedArray, Observable) {
        var directive = {
            restrict: 'A',
            link: link,
            controller: TableRowMapperController,
            controllerAs: 'trvm'
        };

        function link(scope, element, attrs) {
            var tbody = element.find('tbody')[0];
            if(!tbody) {
                $log.error('sbTableRowMapper may only be applied to a table element');
                return;
            }
            scope.rowMapper = new TableRowMapper(FragmentedArray, Observable, tbody);
            scope.trvm.rowMapper = scope.rowMapper;
        }

        return directive;
    }

    function TableRowMapperController($scope) {
        var trvm = this;
        trvm.rowMapper = $scope.rowMapper;
    }

    function TableRowMapper(FragmentedArray, Observable, tbody) {
        var self = this;

        var observer = null;
        var addedNodes = 0;
        var removedNodes = 0;
        var rowMap = null;
        var rowList = null;
        var selectedRow = null;

        var onTableUpdateObservable = new Observable();

        init();

        self.rowList = function() {
            return rowList;
        }


        self.onTableUpdate = onTableUpdateObservable.watch;
        self.get = rowList.get;
        self.slice = rowList.slice;


        function init() {
            observer = new MutationObserver(mutationCallback);
            var config = {childList: true};

            observer.observe(tbody, config);

            rowMap = new Map();
            rowList = new FragmentedArray();

            rowList.onItemMove = function(item, frag) {
                rowMap.set(item, frag);
            }
        }

        function mutationCallback(mutation) {
            addedNodes = 0;
            removedNodes = 0;
            for(var mut of mutation) {
                handleRowAdd(mut);
                handleRowRemove(mut);
            }
            rowList.updateIndices();
            console.log(rowList);
            console.log(rowList.getLayout());
            console.log('Added ' + addedNodes + ' nodes.\nRemoved ' 
                    + removedNodes + ' nodes.');
            domUpdateComplete();
        }

        function handleRowAdd(mutRecord) {
            for(var elem of mutRecord.addedNodes) {
                if(elem.nodeName == 'TR') {
                    addedNodes += 1;
                    var prev = elem.previousElementSibling;
                    var mapItem = rowMap.get(prev);
                    if(!mapItem) {
                        var frag = rowList.pushFront(elem);
                        rowMap.set(elem, frag);
                    } else {
                        var frag = rowList.insertAfter(elem, prev, mapItem);
                        rowMap.set(elem, frag);
                    }
                }
            }
        }

        function handleRowRemove(mutRecord) {
            for(var elem of mutRecord.removedNodes) {
                if(elem.nodeName == 'TR') {
                    removedNodes += 1;
                    var mapItem = rowMap.get(elem);
                    if(!mapItem) {
                        console.log('Unknown node');
                        rowList.remove(elem);
                    } else {
                        rowList.remove(elem, mapItem);
                    }
                }
            }
        }

        function domUpdateComplete() {
            onTableUpdateObservable.emit();
        }

    }
})();
