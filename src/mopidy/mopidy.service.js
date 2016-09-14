(function () {
    'use strict';

    angular
        .module('sound_bound.mopidy', [])
        .factory('mopidyService', mopidyService)

    function mopidyService($log, $q, $rootScope, errorModalService) {
        return new function() {
            var DEFAULT_WS_URL = 'ws://dev.theelectriccastle.com:6680/mopidy/ws';

            var ws = null;
            var service = this;
            var nextId = 1;
            var nextEvtId = 1;
            var eventHandlers = new Map();
            var onConnectHandlers = new Map();
            var onDisconnectHandlers = new Map();
            var rpcPromises = new Map();
            var sendQueue = [];

            service.rpc = rpc;
            service.on = on;
            service.onConnect = onConnect;
            service.onDisconnect = onDisconnect;
            service.connect = connect;
            service.disconnect = disconnect;

            init();

            function init() {
                connect(DEFAULT_WS_URL);
            }

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
                    $log.info('rpc called on a connecting WebSocket. Queued for later');
                    sendQueue.push([payload, deferred]);
                } else if(ws.readyState == ws.OPEN) {
                    ws.send(payload);
                } else {
                    var rpcError = new RpcError(RpcError.CONNECTION_WAS_CLOSED, 
                            'WebSocket is currently closed');
                    deferred.reject(rpcError);
                    if(reaper) {
                        reaper.untrack(deferred.promise);
                    }
                    deferred.promise.abort = noop;
                    deferred.promise._reap = noop;
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

            //Disconnect from mopidy.
            function disconnect(code, reason) {
                code = code || 1000;
                reason = reason || '';
                ws.close(code, reason);
            }

            function connect(url) {
                if(ws && ws.readyState != ws.CLOSED && ws.readyState != ws.CLOSING) {
                    disconnect(1000, 'connecting to another host');
                }
                ws = new WebSocket(url);
                ws.onclose = wsOnClose;
                ws.onopen = wsOnOpen;
                ws.onerror = wsOnError;
                ws.onmessage = wsOnMessage;
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

            function wsOnOpen() {
                $log.info("Web socket opened to '" + ws.url + "'.");
                    
                for(var handler of onConnectHandlers) {
                    handler[1](ws);
                }

                for(var queuedRpc in sendQueue) {
                    ws.send(queuedRpc[0]);
                }

                onConnectHandlers.clear();
                sendQueue = [];
            }

            function wsOnClose(close) {
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
                sendQueue = [];
            }

            function wsOnError(err) {
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
                sendQueue = [];
            }

            function wsOnMessage(msg) {
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
            } else if(type == obj.CONNECTION_WAS_CLOSED) {
                //error is just a string
                obj.toString = function() {
                    return error;
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
    RpcError.CONNECTION_WAS_CLOSED = 3;
    RpcError.prototype.CONNECTION_ERROR = RpcError.CONNECTION_ERROR;
    RpcError.prototype.CONNECTION_CLOSED = RpcError.CONNECTION_CLOSED;
    RpcError.prototype.RPC_ERROR = RpcError.RPC_ERROR;
    RpcError.prototype.CONNECTION_WAS_CLOSED = RpcError.CONNECTION_WAS_CLOSED;

})();
