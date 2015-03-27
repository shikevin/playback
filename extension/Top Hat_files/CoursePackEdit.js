/* global _ */
define([
    'models/course/CourseItems',
    'views/course/CoursePackCreate',
    'text!templates/course/course_pack_edit.html'
], function (
    CourseItems,
    CoursePackCreateView,
    CoursePackEditTemplate
) {
    'use strict';
    var CoursePackEditView = CoursePackCreateView.extend({
        render_items: function () {
            this.panel.$b().html(_.template(CoursePackEditTemplate));
            //set up item selector
            var CourseItemsView = require('views/course/CourseItems');
            this.item_selector = this.item_selector || new CourseItemsView({
                model: this.model,
                sortable: true
            });
            this.panel.$b('div.items').html(this.item_selector.el);
            this.item_selector.render();
            //set up add button
            this.panel.$b('.add_bt').composer([{
                    id: 'add_bt',
                    type: 'button',
                    value: 'Add Items',
                    change: $.proxy(function () {
                        this.render_add_items();
                    }, this)
                }]);
            //draw footer buttons
            var footer_buttons = {
                    Delete: $.proxy(function () {
                        //delete model
                        this.model.delete_pack($.proxy(function () {
                            this.panel.remove();
                        }, this));
                        //set panel to loading spinner
                        this.panel.set({ 'footer_buttons': { 'Cancel': 'remove' } });
                        this.panel.loading();
                    }, this),
                    Cancel: 'remove',
                    Next: $.proxy(function () {
                        this.show_details_page();
                    }, this)
                };
            this.panel.set({ 'footer_buttons': footer_buttons });
        },
        render_add_items: function () {
            var new_course_items = new CourseItems({ sortable: true });
            new_course_items.populate_from_course();
            var panel = new_course_items.launch_dialog();
            panel.set({
                footer_buttons: {
                    Cancel: 'remove',
                    Add: $.proxy(function () {
                        this.add_course_items(new_course_items);
                        panel.remove();
                    }, this)
                }
            });
        },
        add_course_items: function (new_course_items) {
            var course_pack = this.model;
            new_course_items.get('trees').each(function (tree) {
                var module = require('Modules').get_module(tree.get('id'));
                if (tree.selected().length === 0) {
                    return;
                }
                course_pack.get_or_create_tree(module).recursive_merge(tree, {
                    selected: true,
                    root: tree.get('id')
                });
            });
            // Tell the course pack about the new items we selected
            var selected_ids = new_course_items.get('selected_ids');
            _.each(selected_ids, function (id) {
                course_pack.get('selected_ids').push(id);
            });
        }
    });

    return CoursePackEditView;
});
