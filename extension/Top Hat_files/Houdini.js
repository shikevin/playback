/* globals define, _, Backbone, Daedalus, SockJS */
define([], function () {
    'use strict';
    var Houdini = function (api_server) {
        /**
         * Implementation of the basic functionality
         * of the Houdini class, which is responsible for setting up
         * communication with the MQ servers.
         *
         * @author James Keane, Matt Hughes, Anson MacKeracher
         * @class Houdini
         * @uses Backbone.Events
         * @constructor
         * @param {String} api_server The root URL of for the API server.
         */

        _.extend(this, Backbone.Events);

        this._was_registered = false;

        this._socket_initialized_at = null;
        this.latency = null;

        // We've set SockJS to use 10 second heartbeats
        // as of https://github.com/tophatmonocle/Cottontail/pull/15
        var SECONDS = 1000;
        this.heartbeat_interval = 15 * SECONDS;
        this.pong_timeout = 5 * SECONDS;
        this._pong_timeout_id = null;
        this._client_heartbeat_timeout_id = null;

        this.queue = null;
        this.socket = null;

        this.api_server = api_server;
        this.on('message', this.message);
        this.on('heartbeat', this.server_heartbeat);
        this.on('open', this._opened);
        this.on('subscribed', this.register);
        this.on('poll', this.poll);
        this.on('pong', this._ponged);

        this.timers = {
            poll: {
                period: function () {
                    // If the websocket is not open yet, poll all the time
                    // Otherwise, only poll for sanity checking
                    if (!this.is_open()) {
                        return 1;
                    } else {
                        return 12;
                    }
                }.bind(this),
                callback: function () {
                    this.trigger('poll');
                }.bind(this)
            },
            reconnect: {
                period: function () {
                    return 2;
                },
                callback: function () {
                    if (this.is_closed()) {
                        if (this._was_registered) {
                            Daedalus.track('houdini registered-to-disconnected transition', {cause: 'socket closed'});
                        }

                        this.reconnect();
                    }
                }.bind(this)
            }
        };

        this.interval = window.setInterval(this.tick.bind(this), 5000);
        this.tick();
    };

    Houdini.prototype.enable_event_tracking = function (event) {
        /**
        This function turns on Houdini tracking, so that you can see
        events without using the Websockets view in the chrome web dev tool
        */
        var logs = window.console;
        function logger (event) {
            return function (payload) {
                logs.log(new Date().toLocaleTimeString(), event, payload);
            }
        }

        function logAllInfo (payload) {
            logger(payload.event)(payload.payload);
        }

        if (_.isUndefined(event)) {
            this.on('*', logAllInfo);
        } else {
            this.on(event, logger(event));
        }
    };

    Houdini.prototype.tick = function () {
        /**
         * This function runs as part of a timer that counts down various events
         * For now, it triggers polling and reconnection attempts
         * Not every event happens on every tick, each one has its own timer
         * However all timers progress based on this function being called
         * @method tick
         */
        _.each(this.timers, function (timer) {
            timer.ticks = Math.min(timer.ticks || 0, timer.period());
            timer.ticks -= 1;
            if (timer.ticks <= 0) {
                timer.callback();
                timer.ticks = timer.period();
            }
        });
    };

    Houdini.prototype.message = function (msg) {
        /**
         * Houdini has received a message via socket or polling
         * This determines the message type and handles it accordingly
         * Can trigger callbacks based on the event name
         * @method message
         * @param {Object} msg A message object containing type, data and error
         * properties
         */
        this._reset_client_heartbeat();

        if (_.has(msg, 'error')) {
            // If we get a 404, we need to get a new queue, we should just reconnect.
            if (msg.error === 404) {
                Daedalus.track('houdini error 404');
                if (this._was_registered) {
                    Daedalus.track('houdini registered-to-disconnected transition', {cause: 'houdini error 404'});
                }

                this.reconnect();
            } else if (msg.error === 500) {
                Daedalus.track('houdini error 500');
                if (this._was_registered) {
                    Daedalus.track('houdini registered-to-disconnected transition', {cause: 'houdini error 500'});
                }

                this.reconnect();
            } else {
                Daedalus.track('houdini error unknown', {cause: 'houdini error ' + msg.error});
            }
        }

        if (msg.type === 'message') {
            if (_.has(msg.data, 'event')) {
                // If the message has a 'tag', then call all handlers subscribed to that 'tag'
                this.trigger(msg.data.event, msg.data.payload);
            }

            this.trigger('*', msg.data);
        } else if (msg.type === 'register-ok') {
            window.clearTimeout(this.registration_timeout);
            this._was_registered = true;
            this.trigger('registered');

            Daedalus.track('houdini registered');
        } else if (msg.type === 'pong') {
            this.trigger('pong', msg.data.timestamp);
        }
    };

    Houdini.prototype.poll = function () {
        /**
         * Poll Cottontail for any messages for this queue
         * This is for browsers that don't support websockets
         * As well as a sanity check in case something goes wrong
         * @method poll
         */
        if (this.queue === null || this.is_open()) {
            return;
        }

        var url = this.api_server + 'v1/msg/' + this.queue;
        $.get(url, function (msgs) {
            _.each(msgs, function (msg) {
                this.trigger('message', msg);
            }.bind(this));
        }.bind(this)).error(function (e) {
            if (e.status === 404) {
                if (this._was_registered) {
                    Daedalus.track('houdini registered-to-disconnected transition', {cause: 'poll 404'});
                }

                this.reconnect();
            }
        }.bind(this));
    };

    Houdini.prototype.register = function () {
        /**
         * Attempt to register the current queue with the socket server
         * This will subscribe the websocket channel to queued messages
         * If WebSocket is not open yet, there is nothing to do.
         * Polling mode does not require queue registration
         * @method register
         */
        if (!this.is_open()) {
            // we have a queue but no connection
            if (this.is_closed()) {
                this._connect();
            } // else a connection is currently being established
            return;
        }

        // register the queue with the socket server
        this.socket.emit('register', {queue: this.queue});

        // It's possible to connect without successfully registering your queue
        this.registration_timeout = window.setTimeout(function () {
            // TODO should this close the websocket, which will re-open and re-register
            // or should it request a new queue altogether?
            if (this.socket && _.isFunction(this.socket.close)) {
                this.socket.close();
            }
        }.bind(this), 5000);
    };

    Houdini.prototype._opened = function () {
        this._reset_client_heartbeat();

        if (this._socket_initialized_at !== null) {
            this.latency = Number(new Date()) - this._socket_initialized_at;
        }

        this._client_heartbeat();

        this.register();
    };

    Houdini.prototype.reconnect = function () {
        this.queue = null;
        if (this.socket && _.isFunction(this.socket.close)) {
            this.socket.close();
        }
        this.socket = null;
        this._was_registered = false;
        this._connect();
    };

    Houdini.prototype.server_heartbeat = function () {
        this._reset_client_heartbeat();
    };

    Houdini.prototype._reset_client_heartbeat = function () {
        window.clearTimeout(this._pong_timeout_id);

        this._client_heartbeat();
    };

    Houdini.prototype._client_heartbeat = function () {
        window.clearTimeout(this._client_heartbeat_timeout_id);

        this._client_heartbeat_timeout_id = window.setTimeout(function () {
            this._ping();
        }.bind(this), this.heartbeat_interval);
    };

    Houdini.prototype._ping = function () {
        if (!this.is_open()) {
            return;
        }

        this.socket.emit('ping', {timestamp: Number(new Date())});

        this._pong_timeout_id = window.setTimeout(function () {
            if (this.is_closed()) {
                return;
            }

            Daedalus.track('houdini pong timeout', {was_registered: this._was_registered});

            this.reconnect();
        }.bind(this), this.pong_timeout);
    };

    Houdini.prototype._ponged = function (timestamp) {
        this._reset_client_heartbeat();

        this.latency = Number(new Date()) - timestamp;
    };

    Houdini.prototype._connect = function () {
        /**
         * Attempt to connect to Cottontail via WebSocket
         * Note: this is now *entirely distinct* from registering a queue
         * @method connect
         */
        var that = this;

        if (this.queue === null) {
            this.subscribe();
            return;
        }

        var socket = this.socket = new SockJS(this.api_server+'v1/socket');
        this._socket_initialized_at = Number(new Date());

        socket.emit = function (type, channel, event, data) {
            var blob = {
                type: type,
                event: event
            };
            if (_.isObject(channel)) {
                // channel and event are optional parameters that should be
                // strings. If channel is an object, assume channel and event
                // have been omitted.
                data = channel;
            } else {
                blob.channel = channel;
            }
            blob.data = data;
            socket.send(JSON.stringify(blob));
        };

        socket.broadcast = function (channel, event, data) {
            socket.emit('broadcast', channel, event, data);
        };

        socket.onopen = function () {
            that.trigger('open');
        };

        socket.onmessage = function (msg) {
            msg = JSON.parse(msg.data);
            if (msg.type === 'message') {
                // Don't ack error messages
                socket.emit('ack');
            }
            that.trigger('message', msg);
        };

        socket.onclose = function () {
            that.trigger('disconnected');

            Daedalus.track('houdini disconnected');
        };

        socket.onheartbeat = function () {
            that.trigger('heartbeat');
        };

        // TODO: onerror handler once upgraded to SockJS 1.0
    };

    Houdini.prototype.broadcast = function (channel, event, data) {
        /**
         * Broadcasts data on a given channel with a given event type.
         *
         * @method broadcast
         * @param {String} channel Name of a channel.
         * @param {String} event Name of the event.
         * @param {Object} data Data to be broadcast. Will be serialized to
         *                      JSON.
         */
        if (this.is_open()) {
            this.socket.broadcast(channel, event, data);
        }
    };

    Houdini.prototype.is_open = function () {
        /**
         * Checks whether the WebSocket connection is open and streaming
         * @method is_open
         */
        return this.socket !== null && this.socket.readyState === SockJS.OPEN;
    };

    Houdini.prototype.is_closed = function () {
        /**
         * Checks whether the WebSocket connection is closed
         * @method is_closed
         */
        return this.socket === null || this.socket.readyState === SockJS.CLOSED;
    };

    Houdini.prototype.subscribe = function () {
        /**
         * Gets a new queue from the webserver
         * If successful, it will trigger an attempt to register the queue via WebSocket
         * Does not matter whether in streaming or polling mode though!
         * @method subscribe
         */
        return $.ajax({url: '/queue', cache: false})
            .done(function (res) {
                this.queue = res.queue || null;
                this.trigger('subscribed');
            }.bind(this))
            .fail(function () {
                Daedalus.track('queue subscription error');
                this.trigger('error');
            }.bind(this));
    };

    return Houdini;
});

