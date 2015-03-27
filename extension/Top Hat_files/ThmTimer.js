define([], function () {
    'use strict';
    var ThmTimer = {
        initialize: function () {
            return {
                start: function () {
                    if( this._interval ) { return false; }
                    this._interval = setInterval(function () {
                        this._secondsRemaining--;
                        if( this._secondsRemaining <= 0 ) {
                            this.pause();
                            this.on_tick(this._secondsRemaining, this._startSeconds);
                            this.on_finish();
                        } else {
                            this.on_tick(this._secondsRemaining, this._startSeconds);
                        }
                    }.bind(this), 1000);
                    this.on_tick(this._secondsRemaining, this._startSeconds);
                    $(this).trigger('started');
                },
                pause: function () {
                    if( !this._interval ) { return false; }
                    clearInterval(this._interval);
                    this._interval = undefined;
                    $(this).trigger('paused');
                },
                reset: function () {
                    this.pause();
                    this.set(this._startSeconds);
                },
                set: function(seconds) {
                    this._startSeconds = seconds;
                    this._secondsRemaining = seconds;
                },
                is_running: function () {
                    return (this._interval) ? true : false;
                },
                on_tick: function(seconds_elapsed, seconds_total) {
                    $(this).trigger('tick', [seconds_elapsed, seconds_total]);
                },
                on_finish: function () {
                    $(this).trigger('finish');
                },
                formatted_time: function () {
                    var mins = Math.floor( this._secondsRemaining / 60 );
                    var secs = '' + this._secondsRemaining % 60;
                    if( secs.length === 1 ) { secs = '0' + secs; }
                    return mins + ':' + secs;
                },
                _interval: undefined,
                _startSeconds: 60,
                _secondsRemaining: 60
            };
        }
    };
    return ThmTimer;
});
