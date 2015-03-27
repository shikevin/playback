/* global Backbone, _ */
define([
    'text!templates/lms/pearson_sync.html',
    'models/LongTask',
    'views/LongTask'
], function (
    html,
    LongTask,
    LongTaskView
) {
    'use strict';
    var PearsonSyncView = Backbone.View.extend({
        template: _.template(html),
        initialize: function (options) {
            this.options = options || {};
            this.syncing = false;
        },
        render: function () {
            this.$el.html(this.template(this.options));
            if (!this.syncing) {
                this.$('.sync_button').show();
                this.$('.progress').hide();
                var form = this.$('.pearson_sync_button').composer({
                    'id': 'pearson_sync_button',
                    type: 'button',
                    value: 'Sync your Course Data with Pearson LearningStudio'
                });
                form.get('pearson_sync_button').on('click', this.do_sync.bind(this));
            } else {
                this.$('.sync_button').hide();
                this.$('.progress').show();
                this.$('.progress_display').html(this.sync_task_view.$el);
            }
        },
        do_sync: function () {
            var start_sync = $.post(this.options.sync_url);
            start_sync.done(this.sync_active.bind(this));
        },
        sync_active: function (resp) {
            var data = resp;
            this.syncing = true;
            this.sync_task = new LongTask({
                'id': data.task
            });

            this.sync_task_view = new LongTaskView({
                model: this.sync_task
            });

            this.sync_task.fetch();
            this.sync_task_view.render();
            this.render();
        }
    });
    return PearsonSyncView;
});