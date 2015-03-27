/* global Backbone */
define([
], function (
) {
    'use strict';
    var CoursePackDetailsView = Backbone.View.extend({
        initialize: function () {
            this.render();
            this.model.bind('change:title', this.set_form_values, this);
            this.model.bind('change:password', this.set_form_values, this);
            this.model.bind('change:category', this.set_form_values, this);
            this.model.bind('change:categories', this.set_form_values, this);
        },
        render: function () {
            var model = this.model;
            this.form = $(this.el).composer([
                {
                    'id': 'title',
                    'type': 'text',
                    'label': 'Title',
                    'change': function () {
                        model.set({ 'title': this.value() });
                    }
                },
                {
                    'id': 'category',
                    'type': 'select',
                    'label': 'Category',
                    'change': function () {
                        model.set({ 'category': this.value() });
                    }
                },
                {
                    'id': 'password',
                    'type': 'password',
                    'label': 'Password (optional)',
                    'change': function () {
                        model.set({ 'password': this.value() });
                    }
                }
            ]);
            this.set_form_values();
        },
        set_form_values: function () {
            this.form.get('title').value(this.model.get('title'));
            this.form.get('category').set({ 'options': this.model.get('categories') });
            this.form.get('category').value(this.model.get('category'));
            this.form.get('password').value(this.model.get('password'));
        }
    });

    return CoursePackDetailsView;
});
