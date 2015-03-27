/* global _, Houdini */
define([
    'views/lms/LMS'
], function (
    LMSView
) {
    'use strict';
    return function (course, html, callback) {
        // These widgets are defined globally because they are used
        // by multiple lms "templates" (such as
        // choose_course_form.js) as globally available elements.
        // window.lms_el will be inserted into #lms
        window.lms_el = $('<div class="lms_setup"></div>');
        window.lms_loading = $('<div style="text-align: center;"><img src="' + window.site_data.settings.MEDIA_URL + 'images/edumacation/loading_big.gif' + '" /></div>');
        window.lms_error = $('<div class="error" style="margin: auto; background-color:#FAAFBA; border: 1px solid #7A3F4A; width:92%; padding: 10px; text-align:center;"></div>');
        window.lms_success = $('<div class="error" style="margin: auto; background-color:#AAFFBA; border: 1px solid #3A7F4A; width:92%; padding: 10px; text-align:center;"></div>');
        window.lms_text = $('<div class="lms_text" style="margin: 10px"></div>');
        window.lms_form = $('<div class="lms_form"></div>');
        window.d2l_sync_form = html;
        window.lms_el.html(window.lms_loading);

        window.lms_onerror = function () {
            window.lms_error.html('<strong>An error occurred attempting to communicate with your LMS.</strong><br />Please contact Top Hat Support.');
            window.lms_el.empty();
            window.lms_el.append(window.lms_error);
        };

        // Pull the setup URL for our particular LMS
        function pull_lms_setup_url_success (houdini_url) {
            $.ajax({
                url: houdini_url,
                data: {
                    course_id: course.get('course_id') ? course.get('course_id') : course.get('id')
                },
                success: call_lms_setup_url_success,
                error: function () {
                    window.lms_onerror();
                    if (!_.isUndefined(callback)) {
                        callback('Could not get setup URL');
                    }
                }
            });
        }

        function call_lms_setup_url_success (data) {
            var parsed_resp = null;
            if (_.isObject(data)) {
                parsed_resp = data;
            } else {
                try {
                    parsed_resp = JSON.parse(data);
                } catch (e) {}
            }

            if (parsed_resp !== null) {
                var lms_modview = new LMSView(parsed_resp);
                lms_modview.render();

                window.lms_el.html(lms_modview.$el);
            } else {
                // TODO There's got to be a better way
                // than this.
                // Don't do this at home, kids!
                /* jshint evil:true */

                eval(data);
            }
            if (!_.isUndefined(callback)) {
                callback();
            }
        }

        $.ajax({
            url: '/e/lms/' +
                 Houdini.queue +
                 '/setup/',
            success: pull_lms_setup_url_success,
            error: function () {
                window.lms_onerror();
                if (!_.isUndefined(callback)) {
                    callback('Could not get URL from houdini');
                }
            }
        });
    };
});
