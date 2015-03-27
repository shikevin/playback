/* global Backbone */
define([
    'models/LongTask'
], function (
    LongTask
) {
    'use strict';
    var LongTaskView = Backbone.View.extend({
        model: LongTask,
        initialize: function () {
            this.listenTo(this.model, 'change:complete', function () {
                var now = new Date();
                var started = new Date(this.model.get('started_at') * 1000);
                var dt = now - started;
                // time delta in ms
                var rate = this.model.get('complete') / dt;
                // rate of completion
                var change = this.model.get('complete') - this.model.previous('complete');
                var duration = Math.min(change / rate, 1000);
                var complete = Math.round(this.model.get('complete') * 100) + '%';
                if (this.model.get('complete') === 1) {
                    duration = 100;
                    // dont waste time if it's done
                    this.stopListening(this.model, 'change:complete');
                }
                $('.task_progress_complete', this.el).animate({ 'width': complete }, 0, 'linear');
                $('.task_result span.left', this.el).text(complete);
            }, this);

            this.listenTo(this.model, 'change:result', function () {
                if (this.model.get('result')) {
                    $('.task_result', this.el).html(this.model.get('result'));
                    this.stopListening(this.model, 'change:result');
                }
            }, this);

            this.listenTo(this.model, 'change:failed', function () {
                if (this.model.get('failed')) {
                    this.$('.longtask').addClass('failed_task');
                }
            });
        },

        render: function () {
            var $el = $(this.el);
            var template = '<div class=\'longtask\'>' +
                           '<div class=\'task_progress\'>' +
                           '<div class=\'task_progress_complete\'></div>' +
                           '</div>' +
                           '<div class=\'task_result\'>' +
                           '<span class=\'left\'></span>' +
                           '<span class=\'right\'></span>' +
                           '</div>' +
                           '</div>';
            $el.html(template);
        }
    });
    return LongTaskView;
});