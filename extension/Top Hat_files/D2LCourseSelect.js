/* global define, Backbone, _ */
define([
    'text!templates/lms/d2l_course_list.html'
], function (html) {
    'use strict';

    var D2LCourseSelectView = Backbone.View.extend({
        template: _.template(html),
        initialize: function (options) {
            this.options = options || {};
            this.form = null;
        },
        render: function () {
            this.$el.html($('#loading_template').html());
            $.get(this.options.course_list_url)
            .done(this.got_course_list.bind(this))
            .fail(this.failed_request.bind(this));

            return this.$el;
        },
        got_course_list: function (resp) {
            var parsed_resp;
            if (_.isObject(resp)) {
                parsed_resp = resp;
            } else if (_.isString(resp)) {
                parsed_resp = JSON.parse(resp);
            }

            this.$el.html(this.template({
                courses: parsed_resp.courses
            }));

            if (parsed_resp.courses.length > 0) {
                this.form = this.$el.find('.d2l_course_list_form').composer([
                    {
                        id: 'course',
                        type: 'radio',
                        options: parsed_resp.courses,
                        label: 'Courses',
                        validation: ['not_empty']
                    },
                    {
                        id: 'next',
                        type: 'button',
                        value: 'Next'
                    }
                ]);

                // Handle the next button being clicked!
                this.form.get('next').on('change:value', this.select_course, this);
            }
        },
        failed_request: function () {
            this.$el.html(this.template({
                courses: []
            }));
        },
        select_course: function () {
            var course = this.form.get('course').value();
            var course_name = _.find(this.form.get('course').get('options'), function (option) {
                return option.value.toString() === course;
            }).option;
            var save_course = $.post(
                this.options.course_select_url,
                {
                    course: course,
                    course_name: course_name
                }
            );

            this.options.lms_course_name = course_name;

            save_course.done(this.saved.bind(this));
            save_course.fail(this.broke.bind(this));
            this.$el.html($('#loading_template').html());
        },
        saved: function (resp) {
            this.options.d2l_settings = resp;
            this.trigger('course_selected');
        },
        broke: function () {
            // TODO!?
        }
    });

    return D2LCourseSelectView;
});
