/* global _ */
define([
    'models/ModuleItem',
    'views/feedback/teacher',
    'views/feedback/student'
], function (
    ModuleItem,
    InstructorFeedbackView,
    StudentFeedbackView
) {
    'use strict';

    var FeedbackItem = ModuleItem.extend({
        urlRoot: '/api/v2/feedback/',
        idAttribute: 'resource_uri',
        defaults: _.extend({}, ModuleItem.prototype.defaults, {
            module: 'feedback',
            module_color: 'green',
            seconds_until_active: 0,
            submitted: false
        }),
        set_buttons: function() {},
        initialize: function() {
            ModuleItem.prototype.initialize.call(this);
            this.inactive_timer = undefined; //timer that checks if the feedback item is still inactive for the student

            this.view_type = window.user.is_teacher() ? InstructorFeedbackView : StudentFeedbackView;

            this.bind_set('seconds_until_active', function() {
                var current_time = new Date().getTime() / 1000;
                var inactive_until = current_time + parseInt(this.get('seconds_until_active'), 10);
                this.set({'inactive_until': inactive_until});
            });

            this.bind_set('inactive_until', function() {
                if (!this.inactive_timer) {
                    var timer_interval = 1000;
                    var that = this;
                    this.inactive_timer = setInterval(function () {
                        var current_time = new Date().getTime() / 1000;
                        var inactive_until = that.get('inactive_until');
                        if (current_time > inactive_until) {
                            clearInterval(that.inactive_timer);
                            that.inactive_timer = undefined;
                            that.set({submitted: false });
                        } else {
                            if (that.get('submitted') === false) {
                                that.set({submitted: true });
                            }
                            //update the # of seconds until user can re-submit
                            that.set({seconds_until_active: that.get('seconds_until_active') - timer_interval / 1000});
                        }

                    }, timer_interval);
                }
            });

            this.on('remove', function() {
                var view = this.get('view');
                if (view) {
                    var panel = view.get_shared_panel();
                    if( $(panel.get('view').el).find('.feedback_item#' + this.get('id')).length ) {
                        $(panel.get('view').el).find('.feedback_item#' + this.get('id')).remove();
                    }
                    if( $(panel.get('view').el).find('.feedback_item').length === 0 ) {
                        panel.remove();
                    }
                }
            });

            // bind for tree action menu events
            this.bind('action', function(action) {
                if( action === 'Edit' ) { require('Modules').get_module('feedback').add_item(false, this.id); }
            });
        }
    });

    return FeedbackItem;
});
