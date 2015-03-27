/* globals define, Houdini, panels, Daedalus, _, publisher */

define([
    'modules/Module',
    'models/feedback/feedback',
    'views/ModuleControl',
    'layouts/edumacation/LayoutCollection'
], function (
    Module,
    Feedback,
    FeedbackControlView,
    layouts
) {
    'use strict';
    var FeedbackModule = Module.extend({
        defaults: _.defaults({}, Module.prototype.defaults, {
            model: Feedback,
            id: 'feedback',
            name: 'Feedback',
            order: 6,
            color: 'green',
            control_view: FeedbackControlView,
            tree_actions: [{
                group: 'Set Status',
                items: [{
                    id: 'active_visible',
                    title:'<b>Ask</b>(Active + Visible)',
                    description: 'Online students can see and submit feedback'
                },
                {
                    id: 'inactive',
                    title: '<b>Closed</b>(Inactive)',
                    description: 'Only professors can see this item.'
                }]
            }, {
                'group': 'Actions',
                'items': [
                    {id: 'Duplicate', instant: true, title: 'Duplicate Item'},
                    {id: 'Edit', instant: true, title: 'Edit Item'},
                    {id: 'Preview', instant: true, title: 'Preview Item'},
                    {id: 'Answers', instant: true, title: 'Show Answers'},
                    {id: 'Schedule', instant: true, title: 'Schedule Item'}
                ]
            }]
        }),

        initialize: function() {
            Module.prototype.initialize.call(this);
            Houdini.on('feedback:update_report', this.update_feedback_report.bind(this));
            this.get('items').bind('change:status', this.set_update_timer, this);
            this.set_update_timer();
        },

        set_update_timer: function () {
            var update_timer = this.get('update_timer');
            if (this.get('items').where({status: 'active_visible'}).length > 0) {
                if (update_timer === undefined) {
                    this.set({
                        update_timer: setInterval(this.update.bind(this), 60*1000)
                    });
                    this.update();
                }
            } else {
                if (update_timer !== undefined) {
                    clearInterval(update_timer);
                    this.unset('update_timer');
                }
            }
        },

        update: function () {
            _.each(this.items().where({status: 'active_visible'}), function(item) {
                item.fetch();
            });
        },

        add_item: function() {
            // Show a panel that contains the Feedback creation form
            var panel = panels.add({
                id: 'add_feedback',
                module: 'feedback',
                layout: layouts.get('dialog'),
                title: 'Add Feedback',
                width: 350,
                footer_buttons: {
                    'Close': {
                        bt_class: 'danger',
                        callback: 'remove'
                    },
                    'Save': {
                        bt_class: 'affirmative',
                        callback: function() {
                            if (!form.is_valid()) { return; }

                            // Get the folder to insert the Feedback into
                            var folder_id = require('Modules').get_module('feedback').get_folder_id_to_insert_into();

                            // Create brand-spanking-new Feedback
                            var fb = new Feedback({
                                title: form.get('title').value(),
                                duration: form.get('duration').value(),
                                folder: folder_id,
                                course: window.course.get('course_data').get('resource_uri')
                            });

                            // Save the newly created Feedback to the server
                            fb.save().done(function() {
                                panel.remove();

                                // Track event with Daedalus
                                var event_name = 'feedback created';
                                Daedalus.track(event_name);
                                Daedalus.increment('numFeedbacksCreated');
                                Daedalus.set_property('lastFeedbackCreated', new Date());
                            }).fail(function() {
                                publisher.footer_message('Something bad happened! Your Feedback has not been saved.', 'red');
                            });

                            panel.loading();
                        }
                    }
                }
            });

            var form = panel.$b().composer([
                {
                    id: 'title',
                    type: 'text',
                    label: 'Title',
                    validation: ['not_empty'],
                    placeholder: 'Please slow down'
                },
                {
                    id: 'duration',
                    type: 'text',
                    label: 'Duration (minutes)',
                    value: '5',
                    validation: ['num_greater_than_equal'],
                    num_greater_than_equal: 1
                }
            ]);

        },

        update_feedback_report: function (args) {
            // Feedback has been updated
            var module_item = this.items().findWhere({id: args.module_item.toString()});
            if (module_item) {
                module_item.set({data: args.data});
            }
        }
    });

    return FeedbackModule;
});
