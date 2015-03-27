/* global _, Backbone */
define([
    'views/header/Header',
    'text!templates/lobby/course_view.html',
    'layouts/edumacation/LayoutCollection',
    'Modules',
    'util/fullscreen',
    'course/NavUtils',
    'text!templates/lobby/no_content_placeholder_teacher.html',
    'text!templates/lobby/no_content_placeholder_student.html'
], function (
    Header,
    html,
    layouts,
    Modules,
    Fullscreen,
    NavUtils,
    no_content_placeholder_teacher_html,
    no_content_placeholder_student_html
) {
    'use strict';
    var CourseView = Backbone.View.extend({
        js_loaded: false,
        rendered: false,
        template: html,
        className: 'course_view',
        current_course: undefined,
        hide_subnav: true,

        initialize: function (options) {
            this.public_code = options.public_code;

            this.control_el = $('<div class="panels"></div>');
            this.content_el = $('<div class="panels"></div>');
            this.gradebook_el = $('<div class="panels"></div>');
            this.students_el = $('<div class="panels"></div>');

            var $placeholder_control = $('<div class="placeholder_control">\
                No items currently visible</div>');

            var $placeholder_content = $('<div class="placeholder">');
            var $fullscreen_content = $('<a class="fullscreen_content">\
                Exit Fullscreen Mode</a>');

            var is_teacher = window.user.get('role') === 'teacher';

            var place_holder_template;
            if (is_teacher) {
                place_holder_template = no_content_placeholder_teacher_html;
            } else {
                place_holder_template = no_content_placeholder_student_html;
            }

            var content = _.template(place_holder_template, {});
            var $content = $(content);

            if (is_teacher) {
                $content.append($fullscreen_content);
                $placeholder_content.append($content);
            } else {
                $placeholder_content.append($content);
            }

            $fullscreen_content.click(function() {
                Fullscreen.set_fullscreen(false);
            });

            this.control_el.append($placeholder_control);
            this.content_el.append($placeholder_content);

            layouts.add([
                {id: 'control', el: this.control_el},
                {id: 'content', el: this.content_el},
                {id: 'gradebook', el: this.gradebook_el},
                {id: 'students', el: this.students_el}
            ]);
        },

        render: function () {
            this.enter_course(this.public_code);

            if (this.rendered) {
                return;
            }
            this.rendered = true;

            var template = require('text!templates/lobby/course_view.html');
            this.$el.html(_.template(template, {}));

            $('#control', this.el).prepend(this.control_el);
            $('#course_content', this.el).append(this.content_el);
            $('#gradebook_content', this.el).prepend(this.gradebook_el);
            $('#students_content', this.el).prepend(this.students_el);

            // Resize elements to fit
            $(window).trigger('resize');
        },

        _load_header: function () {
            var course_data = window.course.get('course_data');
            var course_settings = course_data.get('settings');
            if (course_settings === null) {
                course_data.once(
                    'change:settings',
                    this._load_header_with_course_settings,
                    this);
            } else {
                this._load_header_with_course_settings(
                    window.course, course_settings);
            }
        },

        _load_header_with_course_settings: function (course, course_settings) {
            var header_view = new Header({
                display_back_arrow_and_logo: true,
                course: window.course.get('course_data'),
                course_settings: course_settings,
                display_nav_items: true,
                display_conn_status: true,
                display_skip2main: true
            });
            // Bind to the gradebook module to render the tabs properly if the status changes
            var show_tabs = function () {
                header_view.reRender();
            };
            Modules.get_module('gradebook').on('change:active', show_tabs);
            Modules.get_module('gradebook_beta').on('change:active', show_tabs);
            header_view.render();
            $('#region-navbar').html(header_view.$el);

            if (NavUtils.student_manager_active) {
                NavUtils.show_students();
            }
        },

        display_callback: function () {
            // hacks per minute... rising...
            if (Modules.get_module('invite')) {
                Modules.get_module('invite').course_opened();
            }

            this._load_header();
        },

        hide_callback: function () {
            $('#footer .right:not(.ignore)').toggle(false);
            $('#course_search_container').toggle(false);
            if (Modules.get_module('invite')) {
                Modules.get_module('invite').course_closed();
            }
        },

        enter_course: function (public_code) {
            // Any time you enter a course, ensure that the DOM is "Setup" properly
            $('#gradebook_content, #students_content').hide();
            $('#course_content, #control').show();

            if (public_code === undefined) {
                return;
            }

            // If current course is set...
            if (this.current_course) {
                // If current course is same as course to enter...
                if (public_code === this.current_course) {
                    if (!window.course.get('course_data')) {
                        // We've returned to course page but dont have course data yet.
                        this._get_course_data(public_code);
                    }
                }
                // If current course is different from course to enter...
                else {
                    window.location.href = '/e/' + public_code;
                }
            }
            // If current course not set...
            else {
                this._get_course_data(public_code);
            }
        },

        _get_course_data: function (public_code) {
            window.site_data.settings.COURSE_PUBLIC_CODE = public_code;
            this.current_course = public_code;
            window.publisher.enter_course(public_code);
        }
    });

    return CourseView;
});
