/* global _, Backbone */
define([
    'util/Browser'
], function (
    Browser
) {
    'use strict';

    var NavUtils = {
        APPS: {
            ACCOUNTS: 'ACCOUNTS',
            BUY: 'BUY',
            COURSE: 'COURSE',
            INSTADMIN: 'INSTADMIN',
            LOBBY: 'LOBBY',
            REGISTER: 'REGISTER',
            SANDBOX: 'SANDBOX'
        },

        header_tabs: function (user, course, course_settings) {
            var APPS = NavUtils.APPS;
            var active_app = NavUtils.get_active_app();
            var current_course_url = NavUtils.current_course_url();
            var public_code = course ? course.get('public_code') : '';
            var active_course_modules = course_settings ? course_settings.get(
                'active_modules') : [];
            var _is_app_active = function (app_list) {
                return _.contains(app_list, active_app);
            };

            return [{
                label: 'Content',
                href: '/e/' + public_code,
                is_active: active_app === APPS.COURSE,
                enabled: _is_app_active([APPS.COURSE, APPS.SANDBOX]),
                onclick: function (event) {
                    if (active_app === APPS.SANDBOX) {
                        return;
                    }
                    event.preventDefault();
                    NavUtils.show_panel('#course_content');
                    NavUtils.show_panel('#control');
                    NavUtils.hide_panel('#gradebook_content');
                    NavUtils.hide_panel('#students_content');
                }
            }, {
                label: 'Gradebook',
                requires_course_settings: true,
                is_active: false,
                enabled: _is_app_active([APPS.COURSE, APPS.SANDBOX]),
                onclick: function (event) {
                    event.preventDefault();
                    require('Modules').get_module('course').load_gradebook();
                    NavUtils.hide_panel('#course_content');
                    NavUtils.hide_panel('#control');
                    NavUtils.hide_panel('#students_content');
                    NavUtils.show_panel('#gradebook_content');
                },
                is_authorized: function () {
                    return _.contains(active_course_modules, 'gradebook');
                }
            }, {
                label: 'Gradebook',
                requires_course_settings: true,
                href: '/e/' + public_code + '/gradebook',
                is_active: active_app === APPS.SANDBOX,
                enabled: _is_app_active([APPS.COURSE, APPS.SANDBOX]),
                is_authorized: function () {
                    return _.contains(active_course_modules, 'gradebook_beta');
                }
            }, {
                label: 'Students',
                is_active: false,
                enabled: _is_app_active([APPS.COURSE, APPS.SANDBOX]),
                onclick: function (event) {
                    if (active_app === APPS.SANDBOX) {
                        window.location.href = current_course_url + '/students';
                        return;
                    }

                    event.preventDefault();
                    if (require('Modules').get_module('invite')) {
                        require('Modules').get_module('invite').open_invite();
                    }
                    NavUtils.hide_panel('#course_content');
                    NavUtils.hide_panel('#control');
                    NavUtils.hide_panel('#gradebook_content');
                    NavUtils.show_panel('#students_content');
                },
                is_authorized: function () {
                    return user.is_teacher();
                }
            }, {
                label: 'Courses',
                is_active: active_app === APPS.LOBBY,
                enabled: _is_app_active([APPS.LOBBY, APPS.INSTADMIN]),
                onclick: function (event) {
                    if (active_app === APPS.INSTADMIN) {
                        event.preventDefault();
                        window.location.href = '/e/';
                        return;
                    }
                }
            }, {
                label: 'Polls',
                href: '/instadmin',
                is_active: active_app === APPS.INSTADMIN,
                enabled: _is_app_active([APPS.LOBBY, APPS.INSTADMIN]),
                is_authorized: function () {
                    return user.has_perm('use_polls');
                }
            }];
        },

        student_manager_active: false,

        // TODO DD: Remove these show\w+ methods
        show_content: function () {
            $('.header-nav-item:contains(Content)').click();
        },

        show_students: function () {
            $('.header-nav-item:contains(Students)').click();
        },

        show_gradebook: function () {
            $('.header-nav-item:contains(Gradebook)').click();
        },

        // The following methods are used to determine if the Gradebook and Invite Manager should
        // be opened in the 'Course' context, or in their own tabs.  This is dependant on the PT.
        // The resulting string is the 'layout' string that should be passed to `layouts.get`.
        get_gradebook_panel: function () {
            return Browser.is_presentation_tool() ? 'content' : 'gradebook';
        },

        get_students_panel: function () {
            return Browser.is_presentation_tool() ? 'content' : 'students';
        },

        // Some utility methods to ensure that site sections are hidden.  They use various methods, setting
        // multiple CSS attributes.  This is done due the race conditions within the site that force tabs
        // to be visible when other events occur.
        show_panel: function (selector) {
            var $element = $(selector);
            $element.show();
            // HACK. Fixes WEB-2479. When the course content is hidden, for
            // some reason the content is resized to a 50x30 pixel area. The
            // consequent resize event redraws the lighthouse annotations but
            // they remain at that size when the course content is shown
            // again. We trigger a resize to force lighthouse annotations to
            // redraw themselves.
            $element.trigger('resize');
        },

        hide_panel: function (selector) {
            var $element = $(selector);
            $element.hide();
        },

        current_course_url: function () {
            if (Browser.is_sandbox_app) {
                return '/' + Backbone.history.getFragment().match(/^(e\/\d+).+/)[1];
            }
            return '/e/' + Backbone.history.getFragment();
        },

        get_active_app: function () {
            var APPS = NavUtils.APPS;
            var fragment = Backbone.history.getFragment();
            var root = Backbone.history.options.root;
            var course_url = this.current_course_url();

            if (root === '/instadmin/') {
                return APPS.INSTADMIN;
            } else if (root === '/buy/') {
                return APPS.BUY;
            } else if (/^gradebook/.test(fragment.substring(course_url.length))) {
                return APPS.SANDBOX;
            } else if (fragment && root + fragment === course_url) {
                return APPS.COURSE;
            } else if (root === '/accounts/') {
                return APPS.ACCOUNTS;
            } else if (root === '/register/') {
                return APPS.REGISTER;
            } else if (course_url === '/e/') {
                return APPS.LOBBY;
            } else {
                throw 'Active app unknown.';
            }
        }
    };
    return NavUtils;
});
