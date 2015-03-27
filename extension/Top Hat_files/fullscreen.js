/* globals _ */

define([
    'util/Browser',
    'lobby/PresentationTool',
    'models/Alert',
    'controllers/Notifications'
], function (
    Browser,
    PresentationTool,
    Alert,
    Notifications
) {
    'use strict';

    var FullScreen = {
        _fullscreen_alert: null,

        show_alert: function () {
            var launch_fullscreen = function (e) {
                FullScreen.set_fullscreen(true);
            };

            FullScreen._fullscreen_alert = new Alert({
                msg: '<span class="fullscreen_alert">Continue to fullscreen?' +
                    '<button id="fullscreen_launch">Yes</button>' +
                    '<button>No</button></span>',
                level: 'info'
            });

            Notifications.alerts.add(FullScreen._fullscreen_alert);

            _.defer(function() {
                $('#fullscreen_launch').click(launch_fullscreen);
            });
        },

        hide_alert: function () {
            Notifications.alerts.remove(FullScreen._fullscreen_alert);
        },

        enter_fullscreen: function () {
            if ($('#course_content').is(':visible')) {
                // go fullscreen regardless (semi-fullscreen)
                if (!FullScreen.is_fullscreen()) {
                    FullScreen.set_fullscreen(true);
                }

                // if able to window-full, request user's permission
                if (!FullScreen.is_max_fullscreen()) {
                    FullScreen.show_alert();
                }
            }
        },

        exit_fullscreen: function () {
            if (FullScreen.is_fullscreen()) {
                FullScreen.set_fullscreen(false);
            }
        },

        set_fullscreen: function (fullscreen) {
            var _screen = window.screenfull;

            // PT Support
            if (Browser.is_presentation_tool()) {

                if (fullscreen) {
                    // store the current width/height and resize to max width/height
                    var $window = $(window);
                    window.prev_width = $window.width();
                    window.prev_height = $window.height();
                    PresentationTool.resize_pt('max', 'max', true, true);
                } else {
                    //recall the previous width/height and resize to that amount
                    PresentationTool.resize_pt(window.prev_width, window.prev_height, true, true);
                    window.prev_width = undefined;
                    window.prev_height = undefined;
                }
            }

            // native Javascript FullScreen API support
            else if (_screen.enabled) {

                if (fullscreen) {
                    var fullscreen_handler = function() {
                        if (!_screen.element) {
                            FullScreen.set_fullscreen(false);
                        }
                    };

                    // Since this constantly gets called I turn on and off the handlers
                    // to avoid stacking several handlers
                    $(document)
                        .off(_screen.raw.fullscreenchange, fullscreen_handler)
                        .on(_screen.raw.fullscreenchange, fullscreen_handler);

                    _screen.request($('body')[0]);

                    // remove header alert if we are maxed
                    if (FullScreen.is_max_fullscreen()) {
                        FullScreen.hide_alert();
                    }
                } else {
                    _screen.exit();
                }
            }

            window.is_fullscreen = fullscreen;

            var $course_content = $('#course_content');
            var contract_overlay;

            contract_overlay = function () {
                $('body').removeClass('expand_overlay');
                $course_content
                    .off('touchstart', contract_overlay)
                    .off('mouseover', contract_overlay);
            };

            var expand_overlay = function (e) {
                e.preventDefault();
                $('body').addClass('expand_overlay');
                $course_content
                    .on('touchstart', contract_overlay)
                    .on('mouseover', contract_overlay);
            };

            $('#fullscreen_overlay')
                .on('touchstart', expand_overlay)
                .on('mouseover', expand_overlay);

            $(window).off('keydown', this._on_keydown);

            if (fullscreen) {
                $('body').addClass('fullscreen');
                $('.footer_button_magnify span').text('Demagnify');

                $(window).on('keydown', this._on_keydown);
            } else {
                $('body').removeClass('fullscreen');
                $('.footer_button_magnify span').text('Magnify');
            }

            // Trigger remagnify and content resize
            $(window).trigger('resize');
        },

        _on_keydown: function (e) {
            if (e.which === $.ui.keyCode.ESCAPE) {
                FullScreen.exit_fullscreen();
            }
        },

        toggle_fullscreen: function () {
            var fullscreen = FullScreen.is_fullscreen();
            fullscreen = !fullscreen;
            FullScreen.set_fullscreen(fullscreen);
        },

        /**
         * Determines if the app is able to and is in full-window fullscreen state.
         *
         * @returns {Boolean}
         */

        is_max_fullscreen: function () {
            var _screen = window.screenfull;
            if (!_.isUndefined(_screen) && _screen.enabled) {
                return _screen.element;
            } else {
                return true;
            }
        },

        /**
         * Determines if the app is in a semi or full-window fullscreen state.
         * Re-sets the window.is_fullscreen var.
         *
         * @returns {Boolean}
         */

        is_fullscreen: function () {
            var _screen = window.screenfull;
            var fullscreen = $('body').hasClass('fullscreen');

            if (!_.isUndefined(_screen)) {
                if (!Browser.is_presentation_tool() && _screen.enabled) {
                    fullscreen = fullscreen || !!_screen.element;
                }
            }

            window.is_fullscreen = fullscreen;
            return fullscreen;
        }
    };

    return FullScreen;

});
