/* global _, Backbone, Houdini */

define([
    'text!templates/lms/canvas_sync.html',
    'models/LongTask',
    'views/LongTask'
], function (
    html,
    LongTask,
    LongTaskView
) {
    'use strict';
    var CanvasSyncView = Backbone.View.extend({
        template: _.template(html),
        initialize: function (options) {
            this.options = options || {};
            this.syncing = false;
        },
        events: {
            'click .different_course': 'trigger_change_course'
        },
        render: function () {
            this.$el.html(this.template(this.options));
            if (!this.syncing) {
                this.$('.sync_button').show();
                this.$('.progress').hide();
                var form = this.$('.canvas_sync_button').composer({
                    'id': 'canvas_sync_button',
                    type: 'button',
                    value: 'Click here to sync your data with Canvas'
                });
                form.get('canvas_sync_button').on('click', this.do_sync.bind(this));
            } else {
                this.$('.sync_button').hide();
                this.$('.progress').show();
                this.$('.progress_display').html(this.sync_task_view.$el);
            }
        },
        do_sync: function () {
            var start_sync = $.post(this.options.sync_url, {queue_id: Houdini.queue});
            start_sync.done(this.syncin.bind(this));
        },
        syncin: function (resp) {
            var resp_obj;
            if (typeof resp === typeof {}) {
                resp_obj = resp;
            } else if (typeof resp === typeof '') {
                resp_obj = JSON.parse(resp);
            }
            var data = resp_obj;
            this.syncing = true;
            this.sync_task = new LongTask({
                'id': data.task
            });

            //Create LongTaskView
            this.sync_task_view = new LongTaskView({
                model: this.sync_task
            });

            //Display it, then forget about it
            this.sync_task.fetch();
            this.sync_task_view.render();

            this.render();

        },
        trigger_change_course: function (e) {
            if (e && e.preventDefault) {
                e.preventDefault();
            }
            this.trigger('select_different_course');
        }
    });
    return CanvasSyncView;
});
