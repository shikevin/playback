/* global _, Backbone, panels */
define([
    'layouts/edumacation/LayoutCollection'
], function (
    layouts
) {
    'use strict';
    var CoursePackListView = Backbone.View.extend({
        initialize: function () {
            //set up view defaults
            this.options = $.extend({ 'only_show_owned': false }, this.options);
            this.render();
            this.model.bind('change:category', this.render_course_packs, this);
            this.model.bind('change:only_owned', this.render, this);
            this.model.bind('change:course_packs', this.render, this);
        },
        render: function () {
            this.panel = this.panel || panels.add({
                'id': 'course_pack',
                'title': 'Course Pack',
                'layout': layouts.get('dialog'),
                'footer_buttons': { 'Close': 'remove' }
            });
            //show a different view depending on if we are listing course packs for editing or for importing
            //this is ugly and should be done differently
            if (this.options.only_show_owned) {
                this.panel.$b().html('<h1>Edit a Course Pack</h1><p>Unselect an item to remove it from the course pack</p><div id=\'cpcategories\'></div><div class=\'items\'></div>').addClass('course_pack_edit');
            } else {
                this.panel.$b().html('<h1>Import a Course Pack</h1><p>Click on a course pack to browse its content</p><div id=\'cpcategories\'></div><div class=\'items\'></div><div id=\'cpmine\'></div>').addClass('course_pack_import');
            }
            this.render_course_packs();
            this.render_form();
        },
        render_form: function () {
            //set up list form
            var that = this;
            this.panel.$b('#cpcategories').html('').composer([{
                    'id': 'category',
                    'type': 'select',
                    'label': 'Category',
                    'value': this.model.get('category'),
                    'options': this.categories(),
                    'change': function () {
                        that.model.set({ 'category': this.value() });
                    }
                }]);
            this.panel.$b('#cpmine').html('').composer([{
                    'id': 'owned',
                    'type': 'checkbox',
                    'value': this.model.get('only_owned'),
                    'label': 'Only show my course packs',
                    'change': function () {
                        that.model.set({
                            'category': 'All',
                            'only_owned': this.value()
                        });
                    }
                }]);
        },
        render_course_packs: function () {
            //show loading message if no trees have been specified yet
            if (_.isEmpty(this.model.get('course_packs'))) {
                this.panel.$b('.items').html($('#loading_template').html());
                return true;
            }
            var packs = this.filter_packs(this.model.get('category'), this.options.only_show_owned || this.model.get('only_owned'));
            var model = this.model;
            var Tree = require('tree/models/Tree');
            this.tree = this.tree || new Tree();
            this.tree.get('children').reset();
            if (this.tree_view) {
                this.tree_view.remove();    // stops listening to add events!
            }
            var items = packs.map(function (pack) {
                var TreeActionItem = require('tree/models/TreeActionItem');
                return new TreeActionItem({
                    id: pack.id,
                    title: pack.title,
                    current_action: pack.password ? 'password' : '',
                    click: function (item) {
                        model.trigger('click', this.id);
                    }
                });
            }, this);
            // only trigger **one** add
            this.tree.add(items);
            var TreeView = require('tree/views/Tree');
            this.tree_view = new TreeView({
                'model': this.tree,
                'resizable': true,
                'max_height': 250
            });
            this.tree_view.render();
            this.panel.$b('.items').html(this.tree_view.el);
        },
        categories: function () {
            var categories = _.uniq(_.map(this.model.get('course_packs'), function (pack) {
                    return pack.category;
                }));
            categories.splice(0, 0, 'All');
            return categories;
        },
        filter_packs: function (category, only_owned) {
            var course_packs = this.model.get('course_packs');
            if (category !== 'All') {
                course_packs = _.reject(course_packs, function (pack) {
                    return pack.category !== category;
                });
            }
            if (only_owned) {
                course_packs = _.reject(course_packs, function (pack) {
                    return !pack.owned;
                });
            }
            return course_packs;
        }
    });

    return CoursePackListView;
});
