/* global Backbone, Daedalus, panels */
define([
    'views/course/CoursePackDetails',
    'text!templates/course/course_pack_create.html',
    'layouts/edumacation/LayoutCollection',
    'models/LongTask',
    'views/LongTask'
], function (
    CoursePackDetailsView,
    CoursePackCreateTemplate,
    layouts,
    LongTask,
    LongTaskView
) {
    'use strict';
    var CoursePackCreateView = Backbone.View.extend({
        initialize: function () {
            this.render();
            this.model.bind('change:id', this.render_items, this);
        },
        render: function () {
            this.panel = this.panel || panels.add({
                'id': 'course_pack',
                'title': 'Course Pack',
                'layout': layouts.get('dialog'),
                'body': '<div class=\'course_pack\'></div>',
                'width': 490
            });
            this.render_items();
        },
        render_items: function () {
            this.panel.$b().html(_.template(CoursePackCreateTemplate));
            //add an item selector to the content
            var CourseItemsView = require('views/course/CourseItems');
            this.item_selector = this.item_selector || new CourseItemsView({
                model: this.model,
                sortable: true
            });
            this.panel.$b('div.items').html(this.item_selector.el);
            this.item_selector.render();
            //draw footer buttons
            var footer_buttons = {
                    'Cancel': 'remove',
                    'Next': $.proxy(function () {
                        this.show_details_page();
                    }, this)
                };
            this.panel.set({ 'footer_buttons': footer_buttons });
        },
        show_details_page: function () {
            if (!this.model.get('selected_ids').length) {
                this.render_error('Please select one or more items');
            } else {
                this.render_details();
            }
        },
        render_error: function (msg) {
            var error_el = this.panel.$b('p.error');
            if (!error_el.length) {
                error_el = $('<p></p>').addClass('error');
                this.panel.$b().prepend(error_el);
            }
            error_el.html(msg);
        },
        render_details: function () {
            this.item_details = this.item_details || new CoursePackDetailsView({ 'model': this.model });
            this.panel.$b().html(this.item_details.el);
            this.panel.set({
                'footer_buttons': {
                    'Cancel': 'remove',
                    'Previous': $.proxy(function () {
                        this.render_items();
                    }, this),
                    'Save': $.proxy(function () {
                        if (!this.model.get('title')) {
                            this.render_error('Please enter a title');
                        } else {
                            var panel = this.panel;
                            //set course pack layout to loading spinner
                            panel.set({ 'footer_buttons': { 'Cancel': 'remove' } });
                            panel.loading();
                            var properties = {
                                    category: this.model.get('category'),
                                    title: this.model.get('title')
                                };
                            Daedalus.track('created course pack', properties);
                            Daedalus.increment('numCoursePacksCreated');
                            //save course pack
                            this.model.save(function (data, args) {
                                var import_task = new LongTask({ id: args.task });
                                var import_task_view = new LongTaskView({
                                        model: import_task,
                                        el: panel.get('view').$('.thm_panel_body')
                                    });
                                panel.set({ title: 'Saving Course Pack...' });
                                import_task.fetch();
                                // in case it already finished
                                import_task_view.render();
                                import_task.on('change:complete', function () {
                                    if (import_task.get('complete') === 1) {
                                        panel.set({
                                            footer_buttons: { Close: 'remove' },
                                            title: 'Course Pack saved'
                                        });
                                    }
                                });
                            });
                        }
                    }, this)
                }
            });
        }
    });

    return CoursePackCreateView;
});
