/* global _, Backbone, enrolled_courses, courses_owned */
define([
    'collections/Courses',
    'views/lobby/LobbyCourseLists',
    'views/lobby/Course',
    'views/course/CourseSearchPage'
],
function(
    Courses,
    LobbyCourseListsView,
    CourseView,
    CourseSearchPageView
) {
    'use strict';

    var LobbyRouter = Backbone.Router.extend({
        loaded_course: null,

        routes: {
            'search(/)': 'show_course_search',
            ':public_code(/)': 'show_course',
            ':public_code/students(/)': 'show_students',
            '': 'show_lobby'
        },


        _before: function() {
            // When route changes exist Magnify mode if enabled.
            $(window).trigger('exit_fullscreen');

            // Add sidebar to DOM if switching between course and lobby
            $('#wrapper').contents().detach().prepend($('#sidebar'));

            // Removes qtips (eg. the mobile app popup) when toggling between
            // course list and content views.
            // TODO stevo: When qtip is active, bind a handler to the body
            // click event to remove qtip.
            if ($.fn.qtip) {
                $('.qtip.ui-tooltip-red').qtip('destroy');
            }
        },

        _after: function() {
            $(window).trigger('resize');
        },

        /**
         * Logic ported from lobby/router.js.
         * This logic should be refactored into a layout manager and the
         * view that is being rendered.
         */
        _render_content_view: function(view) {
            // Remove DOM elements from wrapper region.
            $('#wrapper').empty().append(view.el);

            if (this.current_view &&
                _.isFunction(this.current_view.hide_callback)
            ) {
                this.current_view.hide_callback();
            }
            this.current_view = view;

            view.render();

            if (view.display_callback) {
                view.display_callback();
            }
        },

        show_course: function(public_code) {
            this._set_course_id_header(public_code);
            this._before();

            if (this.loaded_course) {
                if (this.loaded_course !== public_code) {
                    window.location.reload();
                }
            } else {
                this.loaded_course = public_code;

                this.course_view = new CourseView({
                    public_code: public_code
                });
            }

            // Dynamically insert and render view in wrapper region.
            this._render_content_view(this.course_view);

            this._after();
        },

        show_lobby: function() {
            this._before();

            $('.nps-active').removeClass('nps-active');
            var course_list_view = new LobbyCourseListsView({
                enrolled_courses: enrolled_courses,
                courses_owned: courses_owned
            });

            // Dynamically insert and render view in wrapper region.
            this._render_content_view(course_list_view);

            this._after();
        },

        show_students: function (public_code) {
            window.contentRouter.navigate(public_code, false);
            window.user.set({
                is_new_prof: false
            });
            this.show_course(public_code);

            require('course/NavUtils').student_manager_active = true;

            this._after();
        },

        show_course_search: function() {
            this._before();

            var course_search_page = new CourseSearchPageView({
                collection: new Courses()
            });

            // Dynamically insert and render view in wrapper region.
            this._render_content_view(course_search_page);

            this._after();
        },

        _set_course_id_header: function (public_code) {
            var cur_course = _.findWhere(window.courses_owned_data, {
                public_code: '' + public_code
            });
            if (!_.isUndefined(cur_course)) {
                var course_id = cur_course.course_id;
                window.ajax_headers['course-id'] = course_id;
                window.update_ajax_headers();
            }
        }

    });

    return LobbyRouter;

});
