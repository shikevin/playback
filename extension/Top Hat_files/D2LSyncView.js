/* global define, Backbone, _, panels */
define([
    'models/course/CourseItems',
    'views/course/CourseItems',

    'text!templates/lms/d2l_sync_basic.html',
    'text!templates/lms/d2l_sync_advanced.html',
    'models/LongTask',
    'views/LongTask'
], function (
    CourseItems,
    CourseItemsView,

    basic_html,
    advanced_html,
    LongTask,
    LongTaskView
) {
    'use strict';

    var D2LSyncView = Backbone.View.extend({
        events: {
            'change input[data-attribute]': 'update'
        },

        initialize: function (options) {
            this.options = options || {};
            this.syncing = false;
            this.sync_form = null;
            this.sync_task = null;
            this.sync_task_view = null;

            //parse d2l_settings
            if (_.isString(this.options.d2l_settings)) {
                this.options.d2l_settings = JSON.parse(this.options.d2l_settings);
            }

            this.items_to_export = new CourseItems({
                selected_ids: this.options.d2l_settings.selected_grade_ids,
                excluded_module_item_types: [
                    'files',
                    'feedback'
                ],
                extra_module_item_types: [
                    'tournament'
                ]
            });

            this.items_to_export.populate_from_course();

            this.tree_view = new CourseItemsView({
                model: this.items_to_export,
                sortable: true
            });
        },
        render: function () {
            if (this.syncing) {
                return this.$el.html(this.sync_task_view.$el);
            } else if (window.user.has_perm('can_full_d2l_sync')) {
                return this.render_advanced_sync();
            } else {
                return this.render_basic_sync();
            }
        },
        render_advanced_sync: function () {
            var template = _.template(advanced_html),
                panel = panels.get('edit_course_panel');

            if (panel) { panel.set('width', 700); }

            this.$el.html(
                template({
                    lms_name: 'D2L',
                    course_display_name: this.options.lms_course_name
                })
            );

            this.$('.lms_tree_selector').append(this.tree_view.el);

            this.sync_form = this.$el.find('.d2l_sync_form').composer({
                id: 'sync',
                type: 'button',
                value: 'Sync'
            });

            this.sync_form.get('sync').on('click', this.do_sync, this);
            _.each(this.options.d2l_settings, function(val, key) {
                var $input = this.$('[data-attribute=' + key + ']');

                if ($input.is('[type=checkbox]')) {
                    //Todo Yaz: not this :( ... return boolean (not strings) from server
                    val = parseInt(val, 10);
                    if(val) {
                        $input.attr('checked', true);
                    } else {
                        $input.attr('checked', false);
                    }
                } else if ($input.is('[type=radio]')) {
                    this.$('input[data-attribute=' + key + '][value=' + val + ']').attr('checked', true);
                } else {
                    this.$('[data-attribute=' + key + ']').val(val);
                }

            }.bind(this));
            return this.$el;
        },
        render_basic_sync: function () {
            var template = _.template(basic_html);
            this.$el.html(template({
                course_display_name: this.options.lms_course_name
            }));

            this.sync_form = this.$el.find('.d2l_sync_form').composer({
                id: 'sync',
                type: 'button',
                value: 'Sync'
            });

            this.sync_form.get('sync').on('click', this.do_sync, this);

            return this.$el;
        },
        do_sync: function () {
            var settings = _.extend({}, this.options.d2l_settings);

            settings.selected_grade_ids = this.items_to_export.get('selected_ids').map(
                function (id) {
                    return id.replace(/\D/g,'');
                }
            );

            var sync_req = $.ajax({
                url: this.options.sync_url,
                type: 'POST',
                dataType: 'json',
                data: settings
            });

            sync_req.done(this.sync.bind(this));
            sync_req.error(this.error.bind(this));
        },
        sync: function (resp) {
            var resp_obj;
            if (typeof resp === typeof {}) {
                resp_obj = resp;
            } else if (typeof resp === typeof '') {
                resp_obj = JSON.parse(resp);
            }

            var data = resp_obj;
            this.syncing = true;
            this.sync_task = new LongTask({
                id: data.task
            });

            this.sync_task_view = new LongTaskView({
                model: this.sync_task
            });

            this.sync_task.fetch();
            this.sync_task_view.render();

            this.render();
        },
        error: function (resp) {
            //console.log('ERROR DOG');
        },
        update: function(e) {
            e.preventDefault();
            var $input,
                attribute,
                value;

            $input = $(e.target);
            attribute = $input.attr('data-attribute');

            //Set value
            if ($input.is('[type=checkbox]')) {
                value = $input.is(':checked');
            } else {
                value = $input.val();
            }

            //D2L hack
            if (_.isBoolean(value)) {
                value = (value)? 1 : 0;
            }

            this.options.d2l_settings[attribute] = value;
        }
    });

    return D2LSyncView;
});
