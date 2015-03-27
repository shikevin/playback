/* global define, _, Backbone */

define([
    'text!templates/lms/canvas_course_list.html'
], function (html) {
    'use strict';
    var CanvasCourseSelectView = Backbone.View.extend({
        className: 'select_course',
        template: _.template(html),
        events: {
            'click .course_entry': 'select_course'
        },
        initialize: function (options) {
            this.options = options || {};
        },
        render: function () {
            this.$el.html($('#loading_template').html());
            var course_list_url = this.options.course_list_url;
            var course_list_req = $.get(
                course_list_url
            );
            course_list_req.done(this.got_course_list.bind(this));
            course_list_req.fail(this.failed_request.bind(this));
        },
        got_course_list: function (resp) {
            var resp_obj;
            if (typeof resp === typeof {}) {
                resp_obj = resp;
            } else if (typeof resp === typeof '') {
                resp_obj = JSON.parse(resp);
            }
            this.$el.html(this.template({
                courses: resp_obj
            }));
        },

        failed_request: function () {
            this.$el.html(this.template({
                courses: []
            }));
        },
        select_course: function (e) {
            var $clicked = $(e.target);
            var course_id = $clicked.attr('data-id');
            var course_name = $clicked.attr('data-name');
            var saving_course = $.post(
                this.options.course_select_url,
                {
                    canvas_course_name: course_name,
                    canvas_course_id: course_id
                }
            );
            this.options.lms_course_name = course_name;
            saving_course.done(this.saved.bind(this));
            saving_course.fail(this.broke.bind(this));
            this.$el.html($('#loading_template').html());
        },
        saved: function () {
            this.trigger('course_selected');
        },
        broke: function () {

        }
    });
    return CanvasCourseSelectView;
});