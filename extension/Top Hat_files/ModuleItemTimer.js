/* globals Backbone */
/*
Module Item Timers:

Automatically added to module items as part of initialize script
Each module item has a timer, stored in the `timer` property (access via .get("timer"))
Module item initialize command automatically checks if user can start timer locally, and if conditions are set
for timer to be started. Also binds itself to change status to `visible` when timer is completed

Timer views can be created with the item.get("timer").initialize_view() method - this will return the element of the view
A timer may have multiple views, and you can create custom ones for special timer scenarios (e.g. Quick-Add)

Sample code for creating a timer view and binding to element:

    if( this.get("timer").get("running") ) {
        var el = this.get("timer").initialize_view();
        panel_el.find("#demo_timer").html(el);
    }
*/

define(['models/ThmTimer'], function (ThmTimer) {
    'use strict';

    var ModuleItemTimer = Backbone.Model.extend({
        defaults: {
            'show': false,
            'seconds_remaining': 0,
            'seconds_total': 0,
            'running': false
        },
        initialize: function() {
            this._timer = ThmTimer.initialize();

        },
        start: function(seconds_total) {
            this._timer.set(seconds_total);
            this.play();

            var that = this;
            var $_timer = $(this._timer);
            $_timer.bind('tick', function(e, seconds_remaining, seconds_total) {
                that.set({'seconds_remaining': seconds_remaining});
            });
            $_timer.bind('finish', function() {
                that.set({'running': false});
                that.trigger('finish');
            });
            $_timer.bind('paused', function() {
                that.set({'running': false});
            });
            $_timer.bind('started', function() {
                that.set({'running': true});
            });

            this.set({
                'seconds_total': seconds_total,
                'seconds_remaining': seconds_total,
                'running': true
            });
        },
        play: function() { this._timer.start(); },
        pause: function() { this._timer.pause(); },
        pause_play: function() {
            if( this._timer.is_running() ) {
                this.pause();
            } else {
                this.play();
            }
        },
        reset: function() {
            this.set({
                'seconds_total': 0,
                'seconds_remaining': 0,
                'running': false
            });
        },
        initialize_view: function(view_type) {
            var view;
            switch(view_type) {
                case 'quickadd':
                    view = new QuickAddTimerView({'model': this});
                    break;
                default:
                    view = new ModuleItemTimerView({'model': this});
            }
            return view.el;
        }
    });

    var ModuleItemTimerView = Backbone.View.extend({
        tagName: 'div',
        className: 'timer magnify_refresh',
        id: 'timer_bar_div_id',
        events: {
            'click .bt_pause': 'pause_play'
        },
        initialize: function() {
            this.model.bind('change', $.proxy(function() {
                this.render();
            },this));
            this.render();
        },
        render: function() {
            var btn_string = this.model.get('running') ? 'pause' : 'play';
            var time = this.model._timer.formatted_time();
            var $html = $('<span>Timer</span><div id="chart"><div id="chart_bar"></div></div><div id="countdown">' + time + '</div><div id="controls"><a class="bt_pause" href="#">' + btn_string + '</a></div>');
            $(this.el).html($html);

            if( !this.model.get('running') ) {
                $html.find('#countdown').text('FINISHED');
                $html.find('#controls').remove();
            }

            //draw chart
            var $chart_bar = $html.find('#chart_bar');
            var percent_complete = 100 - Math.floor((this.model.get('seconds_remaining') * 100 / this.model.get('seconds_total')));

            $chart_bar.css('width',  percent_complete + '%');
            if (percent_complete > 85) {
                $chart_bar.css('background-color', '#d73c3e');
            } else if (percent_complete > 50) {
                $chart_bar.css('background-color', '#f0cd31');
            }

        },
        pause_play: function(e) {
            e.preventDefault();
            this.model.pause_play();
        }
    });

    var QuickAddTimerView = Backbone.View.extend({
        tagName: 'div',
        initialize: function() {
            this.model.bind('change', $.proxy(function() {
                this.render();
            },this));
            this.render();
        },
        render: function() {
            var time = this.model._timer.formatted_time();
            var $html = $('<span class="val">' + time + '</span><span class="desc">seconds left</span>');
            var $el = $(this.el);
            var val_els = $el.find('.val');
            if(val_els.length) {
                val_els.text(time);
            } else {
                $el.html($html);
            }

            if(!this.model.get('running')) {
                $html.find('.val').text('||');
            }
        }
    });

    return ModuleItemTimer;
});
