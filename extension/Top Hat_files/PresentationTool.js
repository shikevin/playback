/* global _, MacToolController, QtToolController */
define([
    'quickadd/QuickAdd',
    'models/Clicker',
    'layouts/edumacation/LayoutCollection',
    'layouts/presentation_tool/PTPages',
    'layouts/presentation_tool/PTDialog',
    'util/Browser'
], function (
    QuickAdd,
    Clicker,
    layouts,
    PTPagesLayout,
    PTDialogLayout,
    Browser
) {
    'use strict';
    var $window = $(window);
    var chrome_height = null;
    var chrome_width = null;

    var PresentationTool = {
        raise_c_event: function raiseEvent (evtName, strJSONData) {
            /*
             * Raise an obj C event from JS http://goo.gl/fmY2tR
             */
            var element = document.createElement('ToAppData');
            element.setAttribute('JSONString', strJSONData);
            document.documentElement.appendChild(element);
            if (document.createEvent) {
                var evt = document.createEvent('Events');
                evt.initEvent(evtName, true, false);
                element.dispatchEvent(evt);
            }
            document.documentElement.removeChild(element);
        },
        set_page: function (id) {
            id = id.replace('#', '');
            $('a.page_nav').not('[rel=' + id + ']').removeClass('active');
            $('a.page_nav[rel=' + id + ']').addClass('active');
            $('.page').removeClass('visible');
            $('.page#' + id).addClass('visible');
            $('.page#' + id).trigger('pageshow');
            $('body').attr('page', id);
        },
        get_active_page: function () {
            return $('a.page_nav.active').attr('rel');
        },
        loadQuickadd: function () {
            // removed question (module_item)? minimize quickadd!
            window.quickadd.bind('change:module_item', function () {
                if (!this.get('module_item')) {
                    QuickAdd.minimize_quickadd();
                }
            });

            $('#bt_toggle_quickadd').click(function (event) {
                event.preventDefault();
                window.quickadd.toggle();
            });

            $('#bt_toggle_attendance').click(function (event) {
                event.preventDefault();
                window.quickadd.toggle_attendance();
            });
        },
        loadPT: function () {
            PresentationTool.loadQuickadd();
            // Daedalus tracking
            window.Daedalus.initialize(window.site_data.settings.MIXPANEL_TOKEN);
            window.Daedalus.identify(window.user_data);
            window.Daedalus.track('using presentation tool');
            window.Daedalus.increment('ptOpens');
            window.Daedalus.set_property('lastOpenedPT', new Date());
            // Set up fake chrome or set location of real chrome
            $window = $(window);
            //enter the course specified by a hash code or by the user's current choice
            var current_course = window.site_data.settings.COURSE_PUBLIC_CODE;
            if (current_course) {
                window.publisher.enter_course(current_course);
                PresentationTool.set_page('#control_page');
            } else {
                PresentationTool.set_page('#course_list_page');
            }
            var Courses = require('collections/Courses');
            var all_courses = new Courses();
            all_courses.add(window.enrolled_courses.models);
            all_courses.add(window.courses_owned.models);
            all_courses.each(function (c) {
                var $el = $('<li><a href="/emobile/' + c.get('public_code') + '">' + c.get('course_name') + '</a></li>');
                $('#course_selection_list').append($el);
                $el.on('click', function (e) {
                    e.preventDefault();
                    // why not just use href? because jquery mobile breaks it!
                    window.location.href = '/emobile/' + c.get('public_code');
                });
            });
            // Detect chrome resize and trigger "resize_delayed"
            // Timeout command used to minimize the number of resize events that are triggered (will only be triggered
            // if no resize event has occured within 50 ms). When no change detected, triggers "resize_delayed" on self
            // Presentation tool content and quickadd window are both bound to 'resize_delayed' event
            $window.bind('resize', _.debounce(function () {
                $window.trigger('resize_delayed');
            }, 200));
            // When the chrome is resized, redo magnification
            $window.bind('resize_delayed', function () {
                var layout = layouts.get('content');
                if (layout.is_active()) {
                    var panel_id = layout.current_panel_el().attr('id');
                    var panel = window.panels.get(panel_id);
                    layout.resize_panels();
                    if (panel) {
                        panel.trigger('redo_magnify');
                    }
                }
            });
            // set up ghetto navigation menu
            $('a.page_nav').bind('click', function (e) {
                e.preventDefault();
                if ($('.footer_button_demagnify')) {
                    $('.footer_button_demagnify').trigger('click');
                }
                PresentationTool.set_page($(this).attr('rel'));
            });
            // set up layouts and panels system
            layouts.add([
                {
                    id: 'content',
                    el: $('#content #panels_list')
                },
                {
                    id: 'control',
                    el: $('#control #panels_list')
                },
                {
                    id: 'dialog',
                    el: $('body')
                },
                {
                    id: 'magnify_dialog',
                    el: $('body')
                }
            ]);
            layouts.get('content').set_render_class(PTPagesLayout);
            layouts.get('dialog').set_render_class(PTDialogLayout);
            $('#qanda_control_div .thm_panel_body a').live('click', function () {
                PresentationTool.set_page('#content_page');
            });
            $('#course_control_div .thm_panel_body #gradebook').live('click', function () {
                PresentationTool.set_page('#content_page');
            });
            $('#account_actions #add_course').click(function (e) {
                e.preventDefault();
                window.course.add_course();
            });
            //resizing events
            $('#content_page').bind('pageshow', function () {
                if ($('body').hasClass('minimized')) {
                    return true;
                }
                PresentationTool.resize_pt(650, 600, true, false);
                //we must wait until the page transition animation is complete before resizing, or else things will
                //get cut off
                setTimeout(function () {
                    layouts.get('content').resize_panels();
                }, 0);
                // This is such a hack -- Anson
                var do_this_later = function () {
                    layouts.get('content').current_panel_el().trigger('focus');
                };
                setTimeout(do_this_later, 1000);
            });
            $('#control_page').bind('pageshow', function () {
                if ($('body').hasClass('minimized')) {
                    return true;
                }
                PresentationTool.resize_pt(380, 600, true, false);
            });
            $('#course_list_page').bind('pageshow', function () {
                if ($('body').hasClass('minimized')) {
                    return true;
                }
                PresentationTool.resize_pt(380, 600, true, false);
            });
            //set up events on presentation tool header; these should not be available until
            //the system is ready
            window.is_presentation_tool_mini_mode = function () {
                return Browser.is_presentation_tool() && $('#bt_toggle_minimize').hasClass('minimized');
            };
            $('#bt_toggle_minimize').fadeIn('slow').toggle(function () {
                $(this).addClass('minimized');
                $(this).find('span').text('Maximize');
                //store the pre-minimized height and width so that we know what to resize to
                //when minimize is toggled again
                window.pre_minimized_height = $window.height();
                window.pre_minimized_width = $window.width();
                $('body').addClass('minimized');
                if (require('Modules').get_module('attendance').get('active')) {
                    $('#bt_toggle_attendance').show();
                    PresentationTool.resize_pt(82, 30, true, true);
                } else {
                    $('#bt_toggle_attendance').hide();
                    PresentationTool.resize_pt(60, 30, true, true);
                }
            }, function () {
                $(this).removeClass('minimized');
                $(this).find('span').text('Minimize');
                PresentationTool.resize_pt(window.pre_minimized_width, window.pre_minimized_height, true, true);
                $('body').removeClass('minimized');
                //if we are going back into a PageLayout, we need to resize the panel that was just magnified
                //back to it's original size; this addresses a rare situation in which an item was activated
                //and rendered while the presentation tool was in its minified form
                var content = layouts.get('content');
                if (content.get('el').is(':visible') && content.resize_panels) {
                    content.resize_panels();
                }
            });
            $(window).bind('item_set_visible', function (event, list) {
                //switch to content page when professor clicks on something that adds content data
                PresentationTool.set_page('#content_page');
            });
            // Notify the Presentation Tool that the DOM is ready to accept events
            Clicker.setDomReadyStatus();
            $('body').removeClass('loading');
        },
        resize_pt: function (width, height, forceWidth, forceHeight, skip_verify, num_tries) {
            if (!width || !height) {
                return false;
            }

            if (!num_tries) {
                num_tries = 1;
            }
            if (num_tries > 5) {
                return false;
            } else {
                num_tries++;
            }

            // TODO DD: Is this ever an element?
            var $chrome = $('#chrome');
            if ($chrome.length) {
                if (width === 'max') {
                    width = $chrome.width();
                }
                if (height === 'max') {
                    height = $chrome.height();
                }

                $chrome.css('width', width).css('height', height);
                return true;
            }

            if (_.isUndefined(skip_verify)) {
                skip_verify = false;
            }
            if (_.isUndefined(forceWidth)) {
                forceWidth = true;
            }
            if (_.isUndefined(forceHeight)) {
                forceHeight = true;
            }

            //resizing includes the height of the window chrome; this must be added onto the provided height
            //by default, we use the windows vista/7 chrome height
            if (chrome_height === null) {
                chrome_height = 67;
            }
            if (chrome_width === null) {
                chrome_width = 0;
            }

            var combined_height = _.isString(height) ? 'max' : chrome_height + height;
            var combined_width = _.isString(width) ? 'max' : chrome_width + width;

            // TODO: This seems to apply only to the old windows version of the PT.
            // Maybe it should be removed if that version is no longer being used.
            PresentationTool.raise_c_event('ResizeToContentEvent', combined_width + ',' +
                                           combined_height + ',' + forceWidth + ',' +
                                           forceHeight);

            if (_.isString(combined_height)) {
                combined_height = -1;
            }

            if (_.isString(combined_width)) {
                combined_width = -1;
            }

            // Check to see if the Mac presentation tool controller object is defined
            if (!_.isUndefined(window.MacToolController)) {
                if (_.isString(width)) {
                    width = -1;
                }

                MacToolController.resizeWidth_andHeight_(combined_width, combined_height);
            } else if (!_.isUndefined(window.QtToolController)) {
                // Used in the new QT version of the PT

                // Call the native resize method
                QtToolController.resize(combined_width, combined_height);
            } else {
                skip_verify = true;
                window.resizeTo(combined_width, combined_height);
            }

            // chrome HEIGHT can vary from OS & version; this crappy little hack will
            // calculate the height of the chrome and readjust the sizing if it is incorrect
            var actual_window_height = $window.height();
            if (!skip_verify && !isNaN(height) && forceHeight && actual_window_height !== height) {
                chrome_height += height - actual_window_height; // tweak height of the chrome
                if (chrome_height <= 0) {
                    chrome_height = 0;
                }
                PresentationTool.resize_pt(width, height, forceWidth, forceHeight, skip_verify, num_tries);
                return false;
            }

            // chrome WIDTH can vary from OS & version; this crappy little hack will
            // calculate the width of the chrome and readjust the sizing if it is incorrect
            var actual_window_width = $window.width();
            if (!skip_verify && !isNaN(width) && forceWidth && actual_window_width !== width) {
                chrome_width += width - actual_window_width; // tweak width of the chrome
                if (chrome_width <= 0) {
                    chrome_width = 0;
                }
                PresentationTool.resize_pt(width, height, forceWidth, forceHeight, skip_verify, num_tries);
                return false;
            }

        }
    };

    return PresentationTool;
});