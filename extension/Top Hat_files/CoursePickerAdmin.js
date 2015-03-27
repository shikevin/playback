/*globals define, Backbone, _*/
define(['views/lobby/utils'], function(utils) {
    'use strict';

    var CoursePickerAdminView = Backbone.View.extend({
        tagName: 'div',
        className: 'dark_list',
        render: function () {
            // do something special
            var course_page_size = 10;
            var new_course_code = 'new';

            var course_map = function (course) {
                return {
                    text: utils.truncate_name(course.course_name),
                    public_code: course.public_code
                };
            };

            this.$el.select2({
                width: '200px',
                placeholder: 'Loading...',
                minimumInputLength: 1,
                id: function (course) {
                    return course.public_code;
                },
                ajax: {
                    url: '/api/v2/courses/',
                    dataType: 'jsonp',
                    quietMillis: 200,
                    data: function (term, page) {
                        return {
                            query: term,
                            limit: course_page_size,
                            offset: (page-1)*course_page_size
                        };
                    },
                    results: function (data, page) {
                        var more = (page * data.meta.limit) < data.meta.total_count;

                        data.objects.unshift({
                            course_name: 'Add Course',
                            public_code: new_course_code
                        });

                        var results = {
                            results: _.map(data.objects, course_map),
                            more: more
                        };

                        results.results.sort(function (a, b) {
                            // sink "Add Course" to the bottom of the list
                            if (a.public_code === new_course_code) {
                                return 1;
                            }
                            if (b.public_code === new_course_code) {
                                return -1;
                            }
                            return a.text.localeCompare(b.text);
                        });

                        return results;
                    }
                },
                formatNoMatches: function (term) {
                    return 'No courses match term ' + _.escape(term) ;
                },
                initSelection: function (element, callback) {
                    var value = $(element).val();
                    $.ajax({
                        url: '/api/v2/courses/',
                        dataType: 'jsonp',
                        data: {public_code: value}
                    }).done(function (result) {
                        var course;
                        if (result.objects.length < 1) {
                            course = {text: 'Error!'};
                        } else {
                            course = course_map(result.objects[0]);
                        }
                        callback(course);
                    }.bind(this));
                }.bind(this)
            });
            this.$el.on('change', function (e) {
                var code = e.val;
                if (code === new_course_code) {
                    window.course.add_course();
                } else {
                    window.contentRouter.navigate(code, {trigger: true});
                }
            });
        }
    });

    return CoursePickerAdminView;
});
