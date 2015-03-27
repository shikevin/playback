/* globals
    Backbone, _,
    user,
    Daedalus, course, enrolled_courses, views,
    courses_owned,
    publisher */
define([
    'routers/Lobby',
    'layouts/Lobby',
    'views/lobby/Footer',
    'views/lobby/LobbyCourseLists',
    'views/lobby/SwappableContent',
    'views/course/CourseSearchPage',
    'collections/Courses',
    'views/Sidebar',
    'layouts/edumacation/Layout',
    'layouts/lobby/LayoutView',
    'layouts/edumacation/DialogLayout',
    'layouts/edumacation/LayoutCollection',
    'util/Dashboard',
    'models/lobby_user',
    'models/Org',
    'layouts/lobby/MagnifyDialog',
    'util/fullscreen',
    'text!templates/lobby/layout_item.html',
    'text!templates/lobby/search_layout.html',
    'text!templates/lobby/footer.html',
    'text!templates/publisher/thm_feedback_form.html',
    'text!templates/lobby/search_layout.html',
    'text!templates/lobby/no_content_placeholder_teacher.html',
    'text!templates/lobby/no_content_placeholder_student.html',
    'text!templates/composer/upload.html',
    'text!templates/course/course_password.html',
    'models/CourseMembership'
], function (
    LobbyRouter,
    LobbyLayout,
    FooterView,
    LobbyCourseListsView,
    SwappableContentView,
    CourseSearchPageView,
    Courses,
    SidebarView,
    Layout,
    LayoutView,
    DialogLayout,
    layouts,
    Dashboard,
    User,
    Org,
    Fullscreen,
    MagnifyDialogLayout
) {
    'use strict';
    var course_load_start;

    var $window = $(window);
    var $body = $('body');

    window.is_mobile = _.isUndefined(window.is_mobile) ? false : window.is_mobile;
    window.Daedalus.initialize(window.site_data.settings.MIXPANEL_TOKEN);

    var get_available_courses = function (all_courses) {
        // Filter so only available courses show up
        return all_courses.filter(function (item) {
            return item.get('available') === true ||
                   item.get('public_code') === window.site_data.settings.COURSE_PUBLIC_CODE;
        });
    };
    var load_lobby = function () {
        if (window.user.is_teacher()) {
            window.Service.load('fullstory');
        }

        layouts.add({
            id: 'dialog',
            el: $body
        });
        var lobby_layout = new LobbyLayout();
        $('#main').html(lobby_layout.render().el);
        window.contentRouter = new LobbyRouter();
        Backbone.history.start({
            pushState: true,
            root: '/e/'
        });
        window.views = {
            footer: new FooterView(),
            gradebook: new LayoutView({model: new Layout()})
        };

        $('a#add_course').on('click', function (e) {
            // temporary hack til subnav works
            Daedalus.track('add course from lobby');
            Daedalus.increment('addCourseFromLobbyCount');
            e.preventDefault();
            if (user.get('role') === 'teacher') {
                course.add_course(false);
            }
            return false;
        });
        $('a#my_courses').on('click', function (e) {
            // temporary hack til subnav works
            e.preventDefault();
            window.contentRouter.navigate('');
            return false;
        });
        $('a#logo').on('click', function (e) {
            // temporary hack til subnav works
            e.preventDefault();
            window.contentRouter.navigate('');
            return false;
        });
        // Set global user org.
        window.org = user.get('org');
        // Init course picker view and even listeners on courses collection.
        var all_courses = new Courses();
        all_courses.add(enrolled_courses.models);
        all_courses.add(courses_owned.models);
        all_courses.listenTo(window.enrolled_courses, 'add', function (item) {
            this.add(item);
        }, all_courses);
        all_courses.listenTo(window.courses_owned, 'add', function (item) {
            this.add(item);
        }, all_courses);
        // Insert common views into lobby_layout regions.
        // Dynamically insert and render views in header view.
        // Marionette.Layout can't dynamically insert nested views.
        // FINE. Don't use lobby_layout.header.show(views.header).
        // TODO stevo: We should use backbone.layoutmanager.js instead.
        lobby_layout.footer.show(views.footer);
        // Insert course picker view into lobby_layout.

        layouts.add([
            {
                id: 'dialog',
                el: $body,
                create_panel_callback: function (panel) {
                    $(panel.get('view').el).dialog();
                }
            },
            {
                id: 'magnify_dialog',
                el: $body
            }
        ]);
        layouts.get('dialog').set_render_class(DialogLayout);
        layouts.get('magnify_dialog').set_render_class(MagnifyDialogLayout);
        $('input[name=course_search]').keydown(function (e) {
            if (e.which === 13) {
                $('.search-wrapper a').trigger('click');
            }
        });
        // todo: hide inactive / active if empty
        if (enrolled_courses.length === 0 && user.get('role') === 'teacher') {
            $('#add_course').addClass('teacher');
        }
        $('#add_course').removeClass('hidden');
        publisher.check_requirements();
    };

    var initialize = function () {
        course_load_start = new Date();

        window.user = new User(window.user_data);
        window.org = new Org(window.org_data);
        window.user.set({org: window.org});
        window.enrolled_courses = new Courses(window.enrolled_courses_data);
        window.courses_owned = new Courses(window.courses_owned_data);
        window.ajax_headers = {
            username: window.user.get('username'),
            version: window.site_data.settings.VERSION,
            'user-id': window.user.get('id'),
            'org-id': window.org.get('id'),
            'country-code': window.org.get('country_code'),
            'API-KEY': window.site_data.settings.API_KEY
        };
        window.update_ajax_headers = function () {
            $.ajaxSetup({headers: window.ajax_headers});
        };
        $.ajaxSetup({cache: false});
        window.update_ajax_headers();
        if (window.site_data.settings.user_role === 'teacher') {
            window.Service.load('walkme', 'mixpanel', 'google_analytics');
        } else {
            window.Service.load('mixpanel', 'google_analytics');
        }
        var track_session_length = _.once(function () {
            var length = (new Date() - course_load_start) / 1000;
            window.Daedalus.track('session_length', { session_length: length }, false);
        });
        $window.on('beforeunload unload pagehide', track_session_length);
        window.alert = function (msg, callback) {
            window.panels.add({
                id: 'alert',
                layout: layouts.get('dialog'),
                body: msg,
                title: 'Alert',
                footer_buttons: { Close: callback || 'remove' }
            });
        };
        window.submit_demo_quiz_answer = function (demo_name, quiz_name, is_correct) {
            // global method needed because currently flash's ExternalInterface.call
            // does not seem to work on instance methods
            var demo_module = require('Modules').get_module('demo');
            demo_module.submit_demo_quiz_answer(demo_name, quiz_name, is_correct);
        };

        window.js_completeSWF = function (urlString) {
            /*
            * The js_completeSWF function is called by the Flash preloader.
            * We remove the Flash preloader from the DOM, but we
            * must return this function before we can do so or some browsers
            * will crash. We call a setTimeout() on the 'actual'
            * js_completeSWF function, which will be executed immediately
            * after this function is finished.
            */
            setTimeout(function () {
                window.flash_preloader.loaded(urlString);
            }, 0);
            return true;
        };

        window.flash_preloader = {
            demo_url_dict: {},
            // for loading flash files with the preloader
            embed: function (demo_id, demo_url) {
                // Must yield to browser to draw page so divs are there to plot to
                var that = this;
                setTimeout(function () {
                    that.embed_delayed(demo_id, demo_url);
                }, 0);
            },
            embed_delayed: function (demo_id, demo_url) {
                var flashvars = {
                    'demo_name': demo_id,
                    'loadSWF': demo_url
                };
                this.demo_url_dict[demo_url] = [
                    demo_id,
                    flashvars
                ];
                this.embed_swf(window.site_data.urls.flash_preloader, demo_id, flashvars, undefined);
            },
            loaded: function (urlString) {
                /*
                * For the demo preloader, is called when demo has finished
                * loading the file, and is thus now in cache
                */
                var target_id = window.flash_preloader.demo_url_dict[urlString][0];
                var flashvars = window.flash_preloader.demo_url_dict[urlString][1];
                // replace demo_target and embed swf straight up
                $('#' + target_id).replaceWith('<div class="demo_target" id="' + target_id + '""></div>');
                // from demo/templates/demo_center_div.html
                this.embed_swf(urlString, target_id, flashvars);
                delete window.flash_preloader.demo_url_dict[urlString];
            },
            embed_swf: function (url_string, target_id, flashvars) {
                // wmode:opague needed to prevent flash from being on top of all content
                if (window.swfobject && window.swfobject.getFlashPlayerVersion().major >= 10) {
                    window.swfobject.embedSWF(url_string, target_id, '480', '320', '9.0.0', '', flashvars, {
                        wmode: 'opaque',
                        allowscriptaccess: 'always'
                    }, { 'class': 'magnify_scale_pixel' });
                } else {
                    var data = '<div>Adobe Flash Player v10 is required to access this demo. Please download it from the link below.</div><div><a href="http://www.adobe.com/go/getflashplayer"><img src="http://www.adobe.com/images/shared/download_buttons/get_flash_player.gif" alt="Get Adobe Flash player" /></a></div>';
                    $('#' + target_id).append(data);
                }
            }
        };

        /*
        * Natural Sort algorithm for Javascript - Version 0.6 - Released under MIT license
        * Author: Jim Palmer (based on chunking idea from Dave Koelle)
        * Contributors: Mike Grier (mgrier.com), Clint Priest, Kyle Adams, guillermo
        */
        window.naturalSort = function (a, b) {
            var re = /(^-?[0-9]+(\.?[0-9]*)[df]?e?[0-9]?$|^0x[0-9a-f]+$|[0-9]+)/gi, sre = /(^[ ]*|[ ]*$)/g, dre = /(^([\w ]+,?[\w ]+)?[\w ]+,?[\w ]+\d+:\d+(:\d+)?[\w ]?|^\d{1,4}[\/\-]\d{1,4}[\/\-]\d{1,4}|^\w+, \w+ \d+, \d{4})/, hre = /^0x[0-9a-f]+$/i, ore = /^0/,
                // convert all to strings and trim()
                x = a.toString().replace(sre, '') || '', y = b.toString().replace(sre, '') || '',
                // chunk/tokenize
                xN = x.replace(re, '\0$1\0').replace(/\0$/, '').replace(/^\0/, '').split('\0'), yN = y.replace(re, '\0$1\0').replace(/\0$/, '').replace(/^\0/, '').split('\0'),
                // numeric, hex or date detection
                xD = parseInt(x.match(hre), 10) || xN.length !== 1 && x.match(dre) && Date.parse(x), yD = parseInt(y.match(hre), 10) || xD && y.match(dre) && Date.parse(y) || null;
            // first try and sort Hex codes or Dates
            if (yD) {
                if (xD < yD) {
                    return -1;
                } else if (xD > yD) {
                    return 1;
                }
            }
            // natural sorting through split numeric strings and default strings
            var oFxNcL, oFyNcL;
            for (var cLoc = 0, numS = Math.max(xN.length, yN.length); cLoc < numS; cLoc++) {
                // find floats not starting with '0', string or 0 if not defined (Clint Priest)
                oFxNcL = !(xN[cLoc] || '').match(ore) && parseFloat(xN[cLoc]) || xN[cLoc] || 0;
                oFyNcL = !(yN[cLoc] || '').match(ore) && parseFloat(yN[cLoc]) || yN[cLoc] || 0;
                // handle numeric vs string comparison - number < string - (Kyle Adams)
                if (isNaN(oFxNcL) !== isNaN(oFyNcL)) {
                    return isNaN(oFxNcL) ? 1 : -1;
                }    // rely on string comparison if different types - i.e. '02' < 2 != '02' < '2'
                else if (typeof oFxNcL !== typeof oFyNcL) {
                    oFxNcL += '';
                    oFyNcL += '';
                }
                if (oFxNcL < oFyNcL) {
                    return -1;
                }
                if (oFxNcL > oFyNcL) {
                    return 1;
                }
            }
            return 0;
        };
        // If we're not using dataTables, don't define sorting for it
        if (jQuery.fn.dataTableExt !== undefined) {
            jQuery.fn.dataTableExt.oSort['percent-asc'] = function (a, b) {
                var x = a === '-' ? 0 : a.replace(/%/, '');
                var y = b === '-' ? 0 : b.replace(/%/, '');
                x = parseFloat(x);
                y = parseFloat(y);
                return x < y ? -1 : x > y ? 1 : 0;
            };
            jQuery.fn.dataTableExt.oSort['percent-desc'] = function (a, b) {
                var x = a === '-' ? 0 : a.replace(/%/, '');
                var y = b === '-' ? 0 : b.replace(/%/, '');
                x = parseFloat(x);
                y = parseFloat(y);
                return x < y ? 1 : x > y ? -1 : 0;
            };
            // Gradebook sorting
            $.fn.dataTableExt.oSort['natural-asc'] = function (a, b) {
                return window.naturalSort(a, b);
            };
            $.fn.dataTableExt.oSort['natural-desc'] = function (a, b) {
                return window.naturalSort(a, b) * -1;
            };
        }
    };

    var trigger_course_load_finished = _.once(function () {
        if (!course_load_start) {
            return;
        }
        var course_load_finish = new Date();
        var dt = (course_load_finish - course_load_start) / 1000.0;
        Dashboard.event('course_load', {
            course_id: require('Modules').get_module('course').get('course_data').get('id'),
            load_time: dt
        });
    });

    return {
        load_lobby: load_lobby,
        get_available_courses: get_available_courses,
        initialize: initialize,
        trigger_course_load_finished: trigger_course_load_finished
    };
});
