(function () {
    'use strict';

    angular
        .module('sound_bound.util')
        .factory('FragmentedArray', FragmentedArrayFactory);

    function FragmentedArrayFactory(LinkedList) {
    
        function ArrayFragment(length) {
            var frag = this;
            var end = 0;

            frag.data = new Array(length); 
            frag.startIdx = null;

            frag.length = function() {
                return end;
            }

            frag.setStartIndex = function(value) {
                frag.startIdx = value;
            }

            frag.startIndex = function() {
                return frag.startIdx;
            }

            frag.push = function(item) {
                frag.data[end] = item;
                end += 1;
            }

            frag.pushFront = function(item) {
                return frag.insert(item, 0);
            }

            frag.isFull = function() {
                return end == length;
            }

            frag.isEmpty = function() {
                return end == 0;
            }

            frag.insert = function(item, idx) {
                var next = null;
                for(var i = end-1; i >= idx; --i) {
                    frag.data[i+1] = frag.data[i];
                }
                frag.data[idx] = item;
                end += 1;
            }

            frag.notifyResize = function(newLen) {
                end = newLen;
            }

            frag.indexOf = function(item) {
                for(var i = 0; i < end; ++i) {
                    if(Object.is(frag.data[i], item)) {
                        return i;
                    }
                }
                return -1;
            }

            frag.remove = function(item) {
                for(var i = 0; i < end; ++i) {
                    if(Object.is(frag.data[i], item)) {
                       for(var i = i+1; i < end; ++i) {
                           frag.data[i-1] = frag.data[i];
                       } 
                       end -= 1;
                       return i;
                    }
                }
                return -1;
            }

            frag.get = function(index) {
                return frag.data[index];
            }
            
            frag.toString = function() {
                var strs = [];
                for(var i = 0; i < end; ++i) {
                    strs.push(frag.data[i]);
                }
                return '[' + strs.join(', ') + ']';
            }

            frag.toArray = function() {
                return frag.data.slice(0, end);
            }

            frag[Symbol.iterator] = function*() {
                for(var i = 0; i < end; ++i) {
                    yield frag.data[i];
                }
            }
        }
        ArrayFragment.prototype = new LinkedList.Node();

        function FragmentedArray() {
            var self = this;

            var FRAGMENT_SIZE = 32;
            var FRAGMENT_RECOMBINE_MAX = 26;
            var fragments = new LinkedList();

            self.onItemMove = angular.noop;

            self.push = push;
            self.pushFront = pushFront;
            self.remove = remove;
            self.insertAfter = insertAfter;
            self.toArray = toArray;
            self.getLayout = getLayout;
            self.get = get;
            self.updateIndices = updateFragmentIndices;

            function newFragment() {
                return new ArrayFragment(FRAGMENT_SIZE);
            }

            function push(item) {
                var frag = fragments.tail;
                if(!frag) {
                    frag = newFragment();
                    fragments.pushBackNode(frag);
                } else if(frag.isFull()) {
                    frag = newFragment();
                    fragments.pushBackNode(frag);
                }
                frag.push(item);
                return frag;
            }

            function pushFront(item) {
                var frag = fragments.head;
                if(!frag) {
                    frag = newFragment();
                    fragments.pushFrontNode(frag);
                } else if(frag.isFull()) {
                    frag = newFragment();
                    fragments.pushFrontNode(frag);
                }
                frag.pushFront(item);
                return frag;
            }

            function insertAfter(item, before, fragHint) {
                fragHint = fragHint || fragments.head;
                if(fragHint === null) {
                    var frag = newFragment();
                    fragments.pushBackNode(frag);
                    frag.push(item);
                    return frag;
                }
                for(var frag = fragHint; frag != null; frag = frag.next) {
                    var idx = frag.indexOf(before);
                    if(idx != -1) {
                        if(frag.isFull()) {
                            if(idx == frag.length()-1) {
                                var newFrag = newFragment();
                                newFrag.push(item);
                                fragments.insertNode(newFrag, frag);
                                return newFrag;
                            }
                            var newFrag = splitFragment(frag);
                            var splitPos = splitPosition();
                            idx += 1;
                            if(idx > splitPos) {
                                newFrag.insert(item, idx - splitPos);
                                return newFrag;
                            } else {
                                frag.insert(item, idx);
                                return frag;
                            }
                        } else {
                            frag.insert(item, idx+1);
                            return frag;
                        }
                        break;
                    }
                }
                //TODO: Make this scan stop at the old fragHint.
                if(fragHint != fragments.head) {
                    return insertAfter(item, before);
                }
                return null;
            }

            function remove(item, fragHint) {
                fragHint = fragHint || fragments.head;

                function handleFragment(frag) {
                    var idx = frag.remove(item);
                    if(idx >= 0) {
                        if(frag.isEmpty()) {
                            console.log('Reaping empty fragment');
                            fragments.removeNode(frag);
                        } else if(frag.prev && frag.length() + frag.prev.length() 
                                <= FRAGMENT_RECOMBINE_MAX) {
                            combineFragments(frag.prev, frag);
                        }
                        return frag;
                    }
                }

                for(var frag = fragHint; frag != null; frag = frag.next) {
                    var frag = handleFragment(frag);
                    if(frag) {
                        return frag;
                    }
                }
                for(var frag = fragments.head; frag != fragHint; frag = frag.next) {
                    var frag = handleFragment(frag);
                    if(frag) {
                        return frag;
                    }
                }
                return null;
            }

            function get(index) {
                for(var frag = fragments.head; frag != null; frag = frag.next) {
                    if(frag.startIndex() + frag.length() > index) {
                        return frag.get(index - frag.startIndex());
                    }
                }
                return undefined;
            }

            function updateFragmentIndices() {
                var cumLen = 0;
                for(var frag of fragments.nodes) {
                    frag.setStartIndex(cumLen);
                    cumLen += frag.length();
                }
            }

            function splitPosition() {
                return FRAGMENT_SIZE >> 1;
            }

            function splitFragment(frag) {
                var newFrag = newFragment();
                var j = 0;
                var splitRem = splitPosition();
                for(var i = splitRem; i < FRAGMENT_SIZE; ++i) {
                    self.onItemMove(frag.data[i], newFrag);
                    newFrag.data[j] = frag.data[i];
                    j += 1;
                }
                frag.notifyResize(splitRem);
                newFrag.notifyResize(splitRem);
                fragments.insertNode(newFrag, frag);
                return newFrag;
            }

            function mergeFragments(left, right) {
                var j = 0;
                var end = left.length() + right.length();
                for(var i = left.length(); i < end; ++i) {
                    self.onItemMove(right.data[j], left);
                    left.data[i] = right.data[j];
                    j += 1;
                }
                left.notifyResize(end);
                fragments.removeNode(right);
            }

            function getLayout() {
                var lens = [];
                for(var list of fragments.nodes) {
                    lens.push([list.length(), list.startIndex()]);
                }
                return lens;
            }

            function toArray() {
                var outArray = [];
                for(var list of fragments.nodes) {
                    console.log(list);
                    outArray = outArray.concat(list.toArray());
                }
                return outArray;
            }
        }

        return FragmentedArray;
    }
})();