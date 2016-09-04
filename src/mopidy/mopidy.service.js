(function () {
    'use strict';

    angular
        .module('sound_bound.mopidy', [
            'sound_bound'
        ])
        .factory('mopidyService', mopidyService)

    function mopidyService($q) {
        return function () {
            var ws = new WebSocket('ws://localhost:6680/mopidy/ws');
            var that = this;
            var next_id = 1;

            that.rpc = rpc;

            ws.onopen = function () {
                console.log("Web socket opened.");
                for(var msg of send_queue) {
                    console.log("Sending " + msg.toString() + "...");
                    ws.send(msg[1]);
                }
                send_queue = [];
            };

            ws.onerror = function (err) {
                console.log("Web socket broke.");
                for(var promise in promise_store) {
                    promise_store[id].reject(err);
                }
                promise_store = {};
            };

            ws.onmessage = function (msg) {
                var payload = JSON.parse(msg.data);
                var id = payload.id;
                var promise = promise_store[id];
                if(payload.error) {
                    promise.reject(payload.error, payload);
                } else {
                    promise.resolve(payload);
                }
                delete promise_store[id];
            };

            var promise_store = {};
            var send_queue = [];

            function rpc(method, params) {
                var id = next_id;
                next_id += 1;
                var query = {
                    "jsonrpc": "2.0",
                    "id": id,
                    "method": method,
                    "params": params
                };
                var payload = JSON.stringify(query);

                var deferred = $q.defer();
                promise_store[id] = deferred;
                console.log(ws.readyState);

                if(ws.readyState == ws.CONNECTING) {
                    send_queue.push([id, payload, deferred]);
                    console.log('Queueing send ' + id + ' until open.');
                } else if(ws.readyState == ws.OPEN) {
                    ws.send(payload);
                } else {
                    deferred.reject('Web socket is in a closed state.');
                    delete promise_store[id];
                }

                return deferred.promise;
            }
        };
    }

})();
