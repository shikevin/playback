/*global define, Backbone, _ */
define([
    'text!templates/course/course_create.html'
], function (html) {
    'use strict';

    var CourseCreateView = Backbone.View.extend({
        template: _.template(html),
        events: {
            'click #btn-create-course': 'on_create_course'
        },
        tagName: 'span',
        on_create_course: function (e) {
            e.preventDefault();
            if (window.user.get('role') === 'teacher') {
                window.course.add_course();
            }
        },

        render: function () {
            this.$el.html(this.template({
            }));
        }
    });

    return CourseCreateView;
});