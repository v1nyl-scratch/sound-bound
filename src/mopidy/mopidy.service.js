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
            var onConnectHandlers = new Map();
            var onDisconnectHandlers = new Map();
            var rpcPromises = new Map();

            service.rpc = rpc;
            service.on = on;
            service.onConnect = onConnect;
            service.onDisconnect = onDisconnect;

            ws.onopen = function() {
                $log.info("Web socket opened to '" + ws.url + "'.");
                    
                for(var handler of onConnectHandlers) {
                    handler[1](ws);
                }

                onConnectHandlers.clear();
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

                for(var handler of onDisconnectHandlers) {
                    handler[1]();
                }

                onDisconnectHandlers.clear();
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

            //Perform a remote procedure call to mopidy. Return a promise object
            //that captures mopidy's response.
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


                if(reaper) {
                    deferred.reaper = reaper;
                    reaper.track(deferred.promise);
                }

                deferred.promise._reap = function() {
                    rpcPromises.delete(id);
                };

                deferred.promise.abort = function() {
                    if(deferred.reaper) {
                        deferred.reaper.untrack(deferred.promise);
                    }
                    rpcPromises.delete(id);
                };

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

            //Register an event handler that is called every time a named event is
            //sent from mopidy. Returns an EventHandle to control the event handler.
            function on(evt, handler, reaper) {
                var id = nextEventId();
                if(!eventHandlers.has(evt)) {
                    eventHandlers.set(evt, new Map());
                }

                var thisEventHandlers = eventHandlers.get(evt);
                thisEventHandlers.set(id, handler);

                var eventHandle = new EventHandle(id, reaper, function() {
                    thisEventHandlers.delete(id);
                });

                if(reaper) {
                    reaper.track(eventHandle);
                } else {
                    logReaperWarning('on');
                }
                
                return eventHandle;
            }

            //Register an event handler that is called every time a connection to a new
            //server is established. Returns an EventHandle to control the event handler.
            function onConnect(handler, reaper) {
                if(ws.readyState == ws.OPEN) {
                    handler();
                } 

                var id = nextEventId();
                onConnectHandlers.set(id, handler);

                var eventHandle = new EventHandle(id, reaper, function() {
                    onConnectHandlers.delete(id);
                });

                if(reaper) {
                    reaper.track(eventHandle);
                } else {
                    logReaperWarning('onConnect');
                }

                return eventHandle;
            }

            //Register an event handler that is called every time a connection to a
            //server is closed. Returns an EventHandle to control the event handler.
            function onDisconnect(handler, reaper) {
                if(ws.readyState == ws.CLOSED) {
                    handler();
                }

                var id = nextEventId();
                onDisconnectHandlers.set(id, handler);

                var eventHandle = new EventHandle(id, reaper, function() {
                    onDisconnectHandlers.delete(id);
                });

                if(reaper) {
                    reaper.track(eventHandle);
                } else {
                    logReaperWarning('onDisconnect');
                }

                return eventHandle;
            }

            function nextEventId() {
                var id = nextEvtId;
                nextEvtId += 1;
                return id;
            }

            function logReaperWarning(funcName) {
                $log.warn("'" + funcName + "' called without a reaper. This can cause an event "
                    + "to stay registered after a controller is destroyed.");
            }

        };
    }

    function EventHandle(id, reaper, unregister) {
        var obj = this;

        obj.id = id;
        obj.reaper = reaper;
        obj.unregister = unregister;

        //The reaper should not untrack this during reaping as it would break iteration
        //and waste time.
        obj._reap = unregister;

        //If we are tracked by a reaper, we need a manual call to unregister to
        //untrack this from the reaper.
        if(obj.reaper) {
            obj.unregister = function() {
                reaper.untrack(obj);
                unregister();
            }
        }
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
