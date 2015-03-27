/* global _, Backbone */
define([
    'collections/Courses',
    'views/lobby/CoursePickerAdmin',
    'views/lobby/utils',
    'text!templates/header/course_list.html'
], function (
    Courses,
    CoursePickerAdminView,
    LobbyUtils,
    course_list_html
) {
    'use strict';
    var CourseListView = Backbone.Marionette.ItemView.extend({
        template: _.template(course_list_html),

        defaults: {
            user: null,
            course_picker_courses: null
        },

        initialize: function (options) {
            this.options = _.defaults(options || {}, this.defaults);
            if (this.options.course) {
                this.listenTo(this.options.course,
                              'change:course_name change:public_code',
                              this.render, this);
            }
        },

        onRender: function () {
            this._render_course_picker_admin();
        },

        serializeData: function () {
            var active_course_name = '';
            if (this.options.course) {
                active_course_name = LobbyUtils.truncate_name(
                    this.options.course.get('course_name'));
            }

            return {
                user: this.options.user,
                course_picker_courses: this._get_course_picker_courses(),
                active_course_name: active_course_name
            };
        },

        templateHelpers: {
            LobbyUtils: LobbyUtils
        },

        _render_course_picker_admin: function () {
            if (!this.options.user.get('is_superuser') || !this.options.course) {
                return;
            }

            var course_picker = new CoursePickerAdminView();

            var $course_search_container = this.$('#course_search_container').show();
            $course_search_container.append(course_picker.$el);
            course_picker.render();
            course_picker.$el.select2('val', this.options.course.get('public_code'));
        },

        _get_course_picker_courses: function () {
            if (!this.options.course || this.options.user.get('is_superuser')) {
                return null;
            }
            var enrolled_courses = new Courses(window.enrolled_courses_data),
                courses_owned = new Courses(window.courses_owned_data),
                all_courses = new Courses();

            enrolled_courses = enrolled_courses.where({available: true});
            courses_owned = courses_owned.where({available: true});

            all_courses.add(enrolled_courses);
            all_courses.add(courses_owned);

            // Update course data with more up-to-date current course data
            all_courses.remove(
                all_courses.findWhere({
                    course_id: parseInt(this.options.course.get('id'), 10)
                })
            );
            all_courses.add(this.options.course);

            return all_courses;
        }
    });

    return CourseListView;
});
