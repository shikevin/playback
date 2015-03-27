/* global define, _, Houdini, course, org, panels */
define([
    'text!templates/course/course_info.html',
    'layouts/edumacation/LayoutCollection',
    'util/Browser'
], function (
    html,
    layouts,
    Browser
) {
    'use strict';
    var CourseInfo = {
        /**
         * A helper object that displays the course info panel which contains
         * information about the course's SMS number, URL and attendance as
         * well as links to top hat apps.
         * @class CourseInfo
         * @static
         */
        panel: null,
        is_visible: false,
        demagnify: function () {
            this.hide();
            if (this.mini_view) {
                this.mini_view.show();
            }
        },
        $: function (selector) {
            if (this.panel === null) {
                return $();
            }
            return this.panel.$el(selector);
        },
        show: function (MiniView, dont_broadcast) {
            /**
             * Show the course info panel.
             * @method show
             */
            if (!course.get('course_data')) {
                return;
            }

            var template = _.template(html);
            var course_code = course.get('course_data').get('public_code');
            var phone_number = '+1 123-123-1234';
            var code = '';
            var attendance_percentage = 0;
            var attendance_item = require('Modules').get_module('attendance').get('current_item');
            var user_channel = 'user.' + window.user.get('id');
            var sms_enabled = course.get('course_data').get('settings').get('sms_participation');

            if (!dont_broadcast) {
                Houdini.broadcast(user_channel, 'show_course_info');
            }

            var load_course_info = function () {
                if (!org.get('phone_number_country_code') && !org.get('sms_phone_number')) {
                    var user_org = window.user.get('org');
                    phone_number = user_org.get('phone_number_country_code') + ' ' + user_org.get('sms_phone_number');
                } else {
                    phone_number = org.get('phone_number_country_code') + ' ' + org.get('sms_phone_number');
                }

                // Create new panel or update existing panel
                if (
                    window.is_presentation_tool &&
                    window.is_presentation_tool_mini_mode()
                ) {
                    return;
                }
                if (CourseInfo.panel !== null) {
                    CourseInfo.panel = panels.get('course_details_popup');
                } else {
                    CourseInfo.panel = panels.add({
                        id: 'course_details_popup',
                        module: 'course',
                        layout: layouts.get('dialog'),
                        color: 'none',
                        width: require('Modules').get_module('attendance').get('active') === true ? 1024 : 650,
                        height: (sms_enabled || attendance_item) ? 600 : 450
                    });
                }

                CourseInfo.panel.set('body',
                    template({
                        attendance_active: require('Modules').get_module('attendance').get('active'),
                        web_browser: Browser.is_web(),
                        code: code,
                        attendance_percentage: attendance_percentage,
                        phone_number: sms_enabled ? phone_number : false,
                        host_url: window.location.host === 'app.tophat.com' ? 'tophat.com' : window.location.host,
                        course_code: course_code
                    })
                );
                CourseInfo.panel.on('destroy', function () {
                    // Remove panel reference on destroy (when it is closed)
                    if (CourseInfo.panel !== null) {
                        CourseInfo.panel = null;
                        CourseInfo.hide();
                    }
                });
            };

            var bind_events_course_info = function () {
                if (CourseInfo.panel) {
                    var course_info_panel_view = CourseInfo.panel.get('view');
                    // Bind our custom "close" button
                    course_info_panel_view.$('.close').on('click', function (event) {
                        event.preventDefault();
                        CourseInfo.hide();
                        Houdini.broadcast(user_channel, 'close_course_info');
                    });

                    // Bind demagnify button
                    course_info_panel_view.$('.demagnify-course-info').on('click', function (event) {
                        event.preventDefault();
                        CourseInfo.demagnify();
                    });
                }

                $('.course-info-modal .take-attendance .n-btn').on('click', function (event) {
                    event.preventDefault();

                    require('Modules').get_module('attendance').get('control_panel').take_attendance(
                        function (attendance_item) {
                            var code = attendance_item.get('code');
                            CourseInfo.$('#attendance_code').html(code);
                            CourseInfo.$('#attendance_code_sms').html(code);

                            CourseInfo.$('.stop-attendance').show();
                            CourseInfo.$('.take-attendance').hide();
                        }
                    );
                });

                $('.course-info-modal .stop-attendance .finish-attendance').on('click', function (event) {
                    event.preventDefault();

                    require('Modules').get_module('attendance').get('control_panel').stop_attendance();

                    CourseInfo.$('.take-attendance').show();
                    CourseInfo.$('.stop-attendance').hide();
                });
            };

            var update_attendance = function () {
                attendance_item = require('Modules').get_module('attendance').get('current_item');
                if (!attendance_item) {
                    return;
                }

                attendance_item.fetch().done(function () {
                    code = attendance_item.get('code');

                    // set correct attendance percentage
                    attendance_percentage = require('Modules').get_module('attendance').current_percentage();

                    load_course_info();

                    $('.course-info-modal .take-attendance').hide();

                    // set attendance percentage and progress bar fill
                    if (CourseInfo.panel) {
                        CourseInfo.panel.get('view').$('#attendance_percentage').html(attendance_percentage);
                    }
                    $('.course-info-modal .progress-bar-fill').width(Math.round(250 * attendance_percentage / 100));

                    bind_events_course_info();
                });
            };

            if (attendance_item) {
                update_attendance();
            } else {
                require('Modules').get_module('attendance').on('change:current_item', _.once(update_attendance));
                load_course_info();

                $('.course-info-modal .stop-attendance').hide();

                bind_events_course_info();
            }
            this.is_visible = true;
        },
        hide: function () {
            /**
             * Hide the course info panel.
             * @method hide
             */
            if (this.panel) {
                this.panel.remove();
            }
            this.panel = null;
            this.is_visible = false;
        },
        update: function () {
            /**
             * Updates the course info panel
             * @method update
             */
            if (this.is_visible) {
                this.show();
            }
        }
    };
    return CourseInfo;
});
