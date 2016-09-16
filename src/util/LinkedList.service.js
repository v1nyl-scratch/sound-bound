(function () {
    'use strict';

    angular
        .module('sound_bound.util')
        .factory('LinkedList', LinkedListFactory);

    function LinkedListFactory() {
        return LinkedList;
    }

    function LinkedListNode(data, next, prev) {
        var node = this;

        node.data = data;
        node.next = next;
        node.prev = prev;
    }
    
    function LinkedList() {
        var self = this;

        self.head = null;
        self.tail = null;

        var length = 0;

        self.length = function() {
            return length;
        }

        self.pushBack = function(obj) {
            var node = new LinkedListNode(obj);
            self.pushBackNode(node);
            return node;
        }

        self.pushBackNode = function(node) {
            if(self.tail) {
                node.prev = self.tail;
                self.tail.next = node;
            } else { 
                self.head = node;
            }
            self.tail = node;
            length += 1;
        }

        self.insertNode = function(node, after) {
            var prevNext = after.next;
            if(prevNext) {
                after.next.prev = node;
            } else {
                self.tail = node;
            }
            after.next = node;
            node.prev = after;
            node.next = prevNext;
            length += 1;
        }

        self.pushFront = function(obj) {
            var node = new LinkedListNode(obj);
            self.pushFrontNode(node);
            return node;
        }

        self.pushFrontNode = function(node) {
            if(self.head) {
                node.next = self.head;
                self.head.prev = node;
            } else {
                self.tail = node;
            }
            self.head = node;
            length += 1;
        }

        self.remove = function(obj) {
            if(Object.is(obj, self.head)) {
                self.head = obj.next;
                length -= 1;
                return 0;
            }
            var i = 0;
            for(var node = self.head; node != null; node = node.next) {
                if(Object.is(node.data, obj)) {
                    node.prev.next = node.next; 
                    length -= 1;
                    return i;
                }
                i += 1;
            }
            return null;
        }

        self.removeNode = function(node) {
            if(Object.is(node, self.head)) {
                head = node.next;
            }
            node.prev.next = node.next;
            if(Object.is(node, self.tail)) {
                self.tail = node.prev;
            }
            length -= 1;
        }

        self.indexOf = function(obj) {
            var i = 0;
            for(var node = self.head; node != null; node = node.next) {
                if(Object.is(node.data, obj)) {
                    return i;
                }
                i += 1;
            }
            return -1;
        }

        self.getObjectNode = function(obj) {
            for(var node = self.head; node != null; node = node.next) {
                if(Object.is(node.data, obj)) {
                    return node;
                }
            }
            return null;
        }

        self.get = function(idx) {
            return self.getNode(idx).data;
        }

        self.getNode = function(idx) {
            var i = 0;
            for(var node = self.head; node != null; node = node.next) {
                if(i == idx) {
                    return node;
                } 
            }
            return undefined;
        }

        self.toString = function() {
            var frags = [];
            for(var item of self) {
                frags.push(item.toString());
            }
            return '[' + frags.join(', ') + ']';
        }

        self.items = function* () {
            for(var node = self.head; node != null; node = node.next) {
                yield node.data;
            }
        }
        self.items[Symbol.iterator] = self.items;

        self.nodes = function* () {
            for(var node = self.head; node != null; node = node.next) {
                yield node;
            }
        }
        self.nodes[Symbol.iterator] = self.nodes;

        self[Symbol.iterator] = self.items;
    }
    LinkedList.Node = LinkedListNode;
})();
