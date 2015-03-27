/* global _, Backbone */
define([
    'tree/models/Folder',
    'tree/views/Tree',
    'text!templates/course/course_items.html'
], function (
    Folder,
    TreeView,
    course_items_html
) {
    'use strict';
    var CourseItemsView = Backbone.View.extend({
        className: 'module_item_selector',
        defaults: {
            clickable: true,
            sortable: false
        },
        events: {
            'click a': 'module_click'
        },
        initialize: function (options) {
            this.options = _.defaults(options || {}, this.defaults);
            this.model.get('trees').bind('add', this.render, this);
            this.model.get('trees').bind('remove', this.render, this);
            this.model.get('trees').bind('reset', this.render, this);
            this.render();
        },
        template: _.template(course_items_html),
        render: function () {
            // show loading message if no trees have been specified yet
            if (this.model.get('trees').length === 0) {
                $(this.el).html($('#loading_template').html());
                return true;
            }
            var use_unitree = this.model.get('trees').findWhere({id: 'unitree'});
            var modules;
            if (use_unitree) {
                modules = [{
                    id: 'unitree',
                    name: 'Content'
                }];
            } else {
                modules = this.model.get('trees').map(function (module) {
                    return module.pick('id', 'name');
                });
            }
            var html = this.template({
                    cid: this.cid,
                    modules: modules
                });
            this.$el.html(html);

            this.setup_tabs();
            // set up a new tree for each group
            this.model.get('trees').each(function (tree) {
                // render the new tree
                var tree_view = new TreeView({
                        model: tree,
                        sortable: this.options.sortable,
                        max_height: this.model.get('max_height'),
                        resizable: true,
                        empty_message: 'No items in course...'
                    });
                tree_view.render();
                var $module_tree_el = this.$('#' + this.cid + '_' + tree.get('id'));
                $module_tree_el.html(tree_view.el);
                $module_tree_el.dragCheckbox();
                if (this.options.clickable) {
                    this.bind_tree_click(tree);
                }
            }, this);
        },
        bind_tree_click: function (tree) {
            var module = require('Modules').get_module(tree.id);
            if (!module) {
                return false;
            }
            // update the list of selected items on change
            tree.nested_each($.proxy(function (item) {
                // only bind select changes to tree items
                if (item instanceof Folder) {
                    return;
                }
                // trigger the 'click' event on course pack when an item is clicked
                var course_pack_model = this.model;
                item.set({
                    click: function () {
                        course_pack_model.trigger('click', this, module.id);
                    }
                });
            }, this));
        },
        setup_tabs: function () {
            // tabs require the element to be visible in the DOM in order to be properly set up
            // this isn't always possible when the view is initialized, so there is a way to trigger
            // this manually
            var $el = $(this.el);

            if ($el.data('tabs')) {
                $el.tabs('destroy');
            }
            $el.tabs();
        },
        module_click: function (event) {
            event.stopPropagation();
        }
    });

    return CourseItemsView;
});
