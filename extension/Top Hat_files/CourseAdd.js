/*global define, Backbone, _ */
define([
    'text!templates/course/course_add.html'
], function (html) {
    'use strict';

    var CourseAddView = Backbone.View.extend({
        template: _.template(html),
        events: {
            'click #btn-add-course': 'on_add_course'
        },
        on_add_course: function (e) {
            e.preventDefault();
            window.contentRouter.navigate('search', {trigger: true});
        },

        render: function () {
            this.$el.html(this.template({
            }));
        }
    });

    return CourseAddView;
});