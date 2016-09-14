(function () {
    'use strict';

    angular
        .module('sound_bound.mopidy', [])
        .factory('mopidyService', mopidyService)

    function mopidyService($log, $q, $rootScope, errorModalService) {
        return new function() {
            var ws = new WebSocket('ws://dev.theelectriccastle.com:6680/mopidy/ws');
            var service = this;
            var nextId = 1;
            var nextEvtId = 1;
            var eventHandlers = new Map();
            var onConnectPromises = new Map();
            var onDisconnectPromises = new Map();
            var rpcPromises = new Map();

            service.rpc = rpc;
            service.on = on;
            service.onConnect = onConnect;
            service.onDisconnect = onDisconnect;

            ws.onopen = function() {
                $log.info("Web socket opened to '" + ws.url + "'.");
                    
                for(var promise of onConnectPromises) {
                    promise[1].resolve(ws);
                }

                onConnectPromises.clear();
            };

            ws.onclose = function(close) {
                $log.info("Web socket closed.");

                for(var promise of rpcPromises) {
                    var err = new RpcError(RpcError.CONNECTION_CLOSED, close);
                    promise[1].reject(err);
                    if(promise[1].reaper) {
                        promise[1].reaper.untrack(promise[1].promise);
                    }
                }

                for(var promise of onDisconnectPromises) {
                    promise[1].resolve();
                }

                onDisconnectPromises.clear();
                rpcPromises.clear();
            };

            ws.onerror = function (err) {
                errorModalService.showError(
                        'Connection error trying to communicate with mopidy at "'
                        + err.currentTarget.url + '": ' + err.reason
                );

                var error = new RpcError(RpcError.CONNECTION_ERROR, err);

                for(var promise of rpcPromises) {
                    promise[1].reject(error);
                    if(promise[1].reaper) {
                        promise[1].reaper.untrack(promise[1].promise);
                    }
                }

                rpcPromises.clear();
            };

            ws.onmessage = function (msg) {
                var payload = JSON.parse(msg.data);
                var id = payload.id;
                if(id != null) {
                    var promise = rpcPromises.get(id);
                    if(!promise) {
                        $log.warn('Packet with id ' + id + ' received without any promise');
                        return;
                    } 

                    if(payload.error) {
                        $log.warn('Client RPC error returned.');
                        $log.warn(payload);        
                        var error = payload.error;
                        var rpcError = new RpcError(RpcError.RPC_ERROR, error);

                        promise.reject(rpcError);
                    } else {
                        promise.resolve(payload);
                    }
                    if(promise.reaper) {
                        promise.reaper.untrack(promise.promise);
                    }

                    rpcPromises.delete(id);
                } else {
                    var eventType = payload['event'];
                    if(eventHandlers.has(eventType)) {
                        var thisEventHandlers = eventHandlers.get(eventType);
                        $rootScope.$apply(function () {
                            for(var item of thisEventHandlers) {
                                    item[1](payload)
                            }
                        });
                    }
                    $log.info('Event: ' + eventType);
                    $log.info(payload);
                }
            };

            function rpc(method, params, reaper) {
                var id = nextId;
                nextId += 1;
                params = params || [];
                var query = {
                    "jsonrpc": "2.0",
                    "id": id,
                    "method": method,
                    "params": params
                };
                var payload = JSON.stringify(query);

                var deferred = $q.defer();
                rpcPromises.set(id, deferred);

                deferred.promise.abort = function() {
                    rpcPromises.delete(id);
                };

                if(reaper) {
                    deferred.reaper = reaper;
                    reaper.track(deferred.promise);
                }

                if(ws.readyState == ws.CONNECTING) {
                    //send_queue.push([id, payload, deferred]);
                } else if(ws.readyState == ws.OPEN) {
                    ws.send(payload);
                } else {
                    deferred.reject('Web socket is in a closed state.');
                    deferred.promise.abort = noop;
                    rpcPromises.delete(id);
                }

                return deferred.promise;
            }

            function on(evt, handler, reaper) {
                var id = nextEventId();
                if(!eventHandlers.has(evt)) {
                    eventHandlers.set(evt, new Map());
                }

                var thisEventHandlers = eventHandlers.get(evt);
                thisEventHandlers.set(id, handler);

                var eventObj = {
                    id: id,
                    unregister: function() {
                        thisEventHandlers.delete(id);
                    }
                }

                if(reaper) {
                    reaper.track(eventObj);
                } else {
                    $log.warn("'on' called without a reaper. This can cause an event "
                        + "to stay registered after a controller is destroyed.");
                }

            }

            function onConnect() {
                var deferred = $q.defer();
                deferred.promise.abort = angular.noop;

                if(ws.readyState == ws.OPEN) {
                    deferred.resolve(ws); 
                } else if(ws.readyState == ws.CLOSED) {
                    deferred.reject();
                } else {
                    var id = nextEventId();
                    deferred.promise.abort = function() {
                        onConnectPromise.delete(id);
                    }

                    onConnectPromises.set(id, deferred);
                }

                return deferred.promise;
            }

            function onDisconnect() {
                var deferred = $q.defer();
                deferred.promise.abort = angular.noop;

                if(ws.readyState == ws.CLOSED) {
                    deferred.resolve();
                } else {
                    var id = nextEventId();
                    deferred.promise.abort = function() {
                        onDisconnectPromise.delete(id);
                    }

                    onDisconnectPromise.set(id, deferred);
                }

                return deferred.promise;
            }

            function nextEventId() {
                var id = nextEvtId;
                nextEvtId += 1;
                return id;
            }
        };
    }

    function RpcError(type, error) {
        var obj = this;

        obj.isInternalError = isInternalError;
        obj.isClientError = isClientError;

        obj.type = function() {
            return type;
        };

        obj.errorObject = function () {
            return error;
        };

        init();

        function init() {
            if(type == obj.CONNECTION_CLOSED) {
                //error is a CloseEvent.
                obj.toString = function() {
                    return error.reason;
                } 
            } else if(type == obj.CONNECTION_ERROR) {
                obj.toString = function() {
                    return error.reason;
                }
            } else if(type == obj.RPC_ERROR) {
                //error is part of the rpc message payload.
                obj.toString = function() {
                    return error.message + " (Python error: '" + error.data.message + "')";
                }
            }
        }

        function isInternalError() {
            return type != obj.RPC_ERROR;
        }

        function isClientError() {
            return type == obj.RPC_ERROR;
        }

    }

    RpcError.CONNECTION_ERROR = 0;
    RpcError.CONNECTION_CLOSED = 1;
    RpcError.RPC_ERROR = 2;
    RpcError.prototype.CONNECTION_ERROR = RpcError.CONNECTION_ERROR;
    RpcError.prototype.CONNECTION_CLOSED = RpcError.CONNECTION_CLOSED;
    RpcError.prototype.RPC_ERROR = RpcError.RPC_ERROR;

})();
