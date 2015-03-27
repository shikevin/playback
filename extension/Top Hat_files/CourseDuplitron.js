/*globals define, Backbone, _*/
define([
    'tree/models/Tree',
    'models/course/CourseItems',
    'views/course/CourseItems',
    'text!templates/adminface/course_duplitron.html',
    'text!templates/adminface/course_select.html',
    'text!templates/adminface/course_copy.html'
], function (
    Tree,
    CourseItems,
    CourseItemsView,
    html,
    course_select_html,
    course_copy_html
) {
    'use strict';

    var public_code = ''; // hax, but who cares its the admin panel

    var CourseData = Backbone.Model.extend({
        url: function () {
            return '/api/v1/course_module/public_code/' + public_code + '/';
        }
    });

    var course = new CourseData();

    var CourseSelectorView = Backbone.View.extend({
        template: _.template(course_select_html),
        initialize: function (options) {
            this.options = options || {};
        },
        events: {
            'click button': 'do_search'
        },
        render: function () {
            this.$el.html(this.template());
        },
        do_search: function () {
            public_code = this.$('input').val();
            this.model.fetch().done(function () {
                if(this.options.model.get('public_code') === public_code) {
                    this.trigger('select');
                    this.$('button').attr('disabled', 'disabled');
                } else {
                    this.$('.results').text('not found');
                }
            }.bind(this)).fail(function () {
                this.$('.results').text('not found');
            });
        }
    });

    var items = new CourseItems({});

    var CourseCopyView = Backbone.View.extend({
        template: _.template(course_copy_html),
        events: {
            'click .render': 'render'
        },
        render: function () {
            this.$el.html(this.template(this.model.toJSON()));
            this.populate_trees();
            this.items_view = new CourseItemsView({
                el: this.$('.items_container'),
                model: items
            }); // this auto-renders  >:[
            this.$('.maketabs').tabs();
        },
        populate_trees: function () {
            var tree_data = this.model.get('trees');
            var trees = _.map(tree_data, function (t) {
                var tree = new Tree();
                tree.deserialize(JSON.parse(t.data));
                tree.set({
                    id: t.module_id,
                    name: t.module_id,
                    selected: true
                });
                tree.id = t.module_id;
                return tree;
            });
            items.get('trees').reset(trees);
        }
    });

    var panel; // yay miniglobals

    var CourseDuplitronView = Backbone.View.extend({
        template: _.template(html),
        render: function () {
            this.$el.addClass('duplitron');
            this.$el.html(this.template());
            this.course_selector_view = new CourseSelectorView({
                model: course,
                el: this.$('.course_selector')
            });
            this.course_selector_view.render();
            this.listenTo(this.course_selector_view, 'select', this.setup_copy, this);
        },
        setup_copy: function () {
            this.course_copy_view = new CourseCopyView({
                model: course,
                el: this.$('.course_copy')
            });
            this.course_copy_view.render();
            panel = panels.get('course_duplitron');
            panel.set({
                footer_buttons: {
                    'Cancel': function () {
                        if(confirm('Really cancel the duplitron?')) {
                            panel.remove();
                        }
                    },
                    'OK': this.submit.bind(this)
                }
            });
        },
        verify: function () {
            var inputs = this.$('input[data-type]');
            var valid = true;
            _.each(inputs, function(input) {
                $(input).removeClass('invalid');
                var type = $(input).attr('data-type');
                var val = $(input).val();
                try {
                    val = JSON.parse(val);
                } catch (e) {
                    $(input).addClass('invalid');
                    valid = false;
                } finally {
                    if (typeof(val) !== type) {
                        $(input).addClass('invalid');
                        valid = false;
                    }
                }
            });
            return valid;
        },
        submit: function () {
            if (!this.verify()) {
                return;
            }
            var inputs = this.$('input[data-key]');
            var keys = _.map(inputs, function (input) {
                return $(input).attr('data-key');
            });
            var vals = _.map(inputs, function (input) {
                return JSON.parse($(input).val());
            });
            var data = _.object(keys, vals);
            data.trees = items.get('trees').map(function (tree) {
                return tree.serialize_selected();
            });
            panel.set({
                body: $('#loading_template').html()
            });
            publisher.send({
                module: 'adminface',
                command: 'duplicate_course',
                args: data,
                success: function (data, args) {
                    window.location.href = '/e/'+args.public_code;
                }
            });
        }
    });
    return CourseDuplitronView;
});
