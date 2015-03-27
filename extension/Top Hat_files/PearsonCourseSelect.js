/* global define, Backbone, _ */
define([
    'text!templates/lms/pearson_course_list.html'
], function (template) {
    'use strict';
    var PearsonCourseSelectView = Backbone.View.extend({
        template: _.template(template),
        initialize: function (options) {
            this.options = options || {};
            var loading_course_list = $.get(this.options.course_list_url);
            loading_course_list.done(this.got_courses.bind(this));
            this.state = 'loading';
        },
        render: function () {
            this.$el.html(this.template({}));
            if (this.state === 'loaded') {
                var select_form = this.$('.select_form').composer([
                    {
                        id: 'course',
                        type: 'radio',
                        options: this.course_list_data,
                        label: 'Courses',
                        validation: ['not_empty']
                    },
                    {
                        id: 'next',
                        type: 'button',
                        value: 'Next'
                    }
                ]);

                select_form.get('next').on('click', function () {
                    if (select_form.is_valid()) {
                        this.state = 'saving';
                        var data = select_form.values();
                        this.options.lms_course_name = this.course_list_data[data.course];
                        data.course_name = this.course_list_data[data.course];
                        var saving = $.ajax({
                            url: this.options.course_select_url,
                            data: data
                        });

                        saving.done(this.saved.bind(this));

                        this.render();
                    }
                }.bind(this));
            }

        },
        got_courses: function(courses_data){
            this.course_list_data = courses_data;
            this.state = 'loaded';
            this.render();  // AH - technically this assumes we have already rendered, ohwell
        },
        saved: function () {
            this.trigger('course_selected');
        }
    });
    return PearsonCourseSelectView;
});