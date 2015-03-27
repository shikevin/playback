/* global _, Backbone, Houdini */
define([
    'modules/Module',
    'course/Guide',
    'course/CourseInfo',
    'course/NavUtils',
    'views/course/CoursePackChoices',
    'views/lms/lms_setup',
    'text!templates/lms/d2l_sync.html',
    'models/VisibleItems',
    'tree/views/Tree',
    'tree/models/TreeItem',
    'tree/models/TreeActionItem',
    'text!templates/course/course_presentation_tool.html',
    'text!templates/invite/not_allowed.html',
    'text!templates/course/mobile_app_dialog.html',
    'text!templates/course/course_password.html',
    'models/TreeData',
    'views/StudentSelector',
    'collections/StudentMemberships',
    'layouts/edumacation/LayoutCollection',
    'util/Browser',
    'models/UserSettings',
    'util/fullscreen',
    'models/Alert'
], function (
    Module,
    Guide,
    CourseInfo,
    NavUtils,
    CoursePackChoicesView,
    lms_setup,
    d2l_sync_form,
    VisibleItems,
    TreeView,
    TreeItem,
    TreeActionItem,
    pt_download_template,
    invite_not_allowed,
    mobile_app_html,
    password_template,
    TreeData,
    StudentSelectorView,
    StudentMembershipCollection,
    layouts,
    Browser,
    UserSettings,
    Fullscreen,
    Alert
) {
    'use strict';

    var CourseModule = Module.extend({
        defaults: _.extend({}, Module.prototype.defaults, {
            id: 'course',
            recurring_course_sessions: [],
            hidden_module: true,
            available: false,
            phone_number: '',
            num_online: 0,
            num_enrolled: 0,
            pct_online: 0,
            order: 0
        }),
        initialize: function () {
            Module.prototype.initialize.call(this);
            /**
             * Provides various functions pertaining to the current course.
             * @class CourseModule
             * @constructor
             */
            var course = this;
            // Other files rely on a global course
            window.course = this;

            this.listenTo(this, 'change:num_online change:num_enrolled', _.each(require('Modules').get_module_items(), function (mi) {
                // re-renders status bars to account for students logging in
                if (mi.is_visible()) {
                    mi.trigger('status_updated');
                }
            }));

            this.listenTo(this, 'change:num_online change:num_enrolled', function () {
                if (this.get('num_enrolled') < this.get('num_online')) {
                    this.set({pct_online: 1});
                } else {
                    this.set({
                        pct_online: this.get('num_enrolled') > 0 ?
                            Math.ceil(this.get('num_online') /
                            this.get('num_enrolled')) : 0
                    });
                }
            });

            // Subscribe to the houdini event's we are interested in
            Houdini.on('course:delete course:unavailable course:membership_deleted', function () {
                if (window.user.get('role') === 'student') {
                    window.publisher.course_unavailable_response();
                }
            });

            Houdini.on('course:membership_deleted', function () {
                if (window.user.get('role') === 'student') {
                    window.publisher.course_membership_deleted();
                }
            });

            Houdini.on('course:password_change', function () {
                if (window.user.get('role') === 'student') {
                    course.prompt_password(course.get('course_data'));
                }
            });

            Houdini.on('tree:patch', function (data) {
                var tree, diff, patched, patch;
                tree = TreeData.findOrCreate('/api/v1/tree_data/' + data.i + '/');
                if (tree.get('version') + 1 === data.v) {
                    // good to patch
                    diff = new window.diff_match_patch();
                    patch = diff.patch_fromText(data.p);
                    patched = diff.patch_apply(patch, tree.get('data'));
                    tree.set({data: patched[0]});
                } else {
                    // patch failed, re-fetch
                    tree.fetch();
                }
            });


            Houdini.on('course:set_active_modules', function () {
                course.get('course_data').fetch();
            });

            Houdini.on('course:student_list_update', function (args) {
                var num_online = args.num_online;
                var num_students = args.num_students;
                course.set({
                    num_online: num_online,
                    num_students: num_students
                });
            });

            Houdini.on('course:course_name_update', function (name) {
                var course_data = course.get('course_data');
                course_data.set({course_name: name});
                var course_id = parseInt(course_data.get('id'), 10);
                var other_course_instance = window.enrolled_courses.findWhere({
                    course_id: course_id
                }) || window.courses_owned.findWhere({course_id: course_id});
                if (other_course_instance) {
                    other_course_instance.set({course_name: name});
                }
            });

            Houdini.on('coursepack:created', function (args) {
                var name = args.name;
                var edited = args.edited;
                var message;

                if (edited) {
                    message = '<p>Your Course Pack ' + name + ' has been updated.</p>';
                } else {
                    message = '<p>Your Course Pack ' + name + ' has been created.</p>';
                }

                // TODO: use the upcoming (hopefully) notification API
                var panel = window.panels.find(undefined, 'course', 'course_pack');
                if (panel) {
                    panel.first().remove();
                }
                window.panels.add({
                    id: 'course_pack_update',
                    title: 'Course Pack',
                    layout: layouts.get('dialog'),
                    body: message,
                    footer_buttons: {
                        Close: '__close__'
                    }
                });
            });

            Houdini.on('coursepack:imported', function (args) {
                var name = args.name;
                // TODO: use the upcoming (hopefully) notification API
                var panel = window.panels.find(undefined, 'course', 'course_pack');
                if (panel) {
                    panel.first().remove();
                }
                window.panels.add({
                    id: 'course_pack_update',
                    title: 'Course Pack',
                    layout: layouts.get('dialog'),
                    body: '<p>Your Course Pack ' + name + ' has been imported.</p>',
                    footer_buttons: {
                        Close: '__close__'
                    }
                });
            });
            if (window.user.get('role') === 'teacher') {
                this.initialize_active_content_handlers();
                Houdini.on('question:correct_answer_updated', function (args) {
                    require('Modules').get_module_item(args.module_item_id).fetch();
                });
            }
        },

        initialize_active_content_handlers: function () {
            /**
             * Initializes handlers for the active_content_* Houdini
             * events. These events are currently sent from the iOS prof app.
             * @method initialize_active_content_handlers
             */
            Houdini.on('active_content_focus', function (args) {
                require('Modules').get_module_item(args.module_item_id).scroll_into_view();
            });


            var select_tab = function (module_item_id, name) {
                var mi = require('Modules').get_module_item(module_item_id);
                if (mi) {
                    var view = mi.get('view');
                    view.panel.select_tab(module_item_id + '_' + name);
                }
            };

            Houdini.on('active_content_details', function (args) {
                select_tab(args.module_item_id, 'details');
            });

            Houdini.on('active_content_reports', function (args) {
                var mi_id = args.module_item_id;

                select_tab(mi_id, 'reports');
                if (args.report_type) {
                    var mi = require('Modules').get_module_item(mi_id);
                    if (mi) {
                        var view = mi.get('view');
                        view.reports_view.set_type_by_name(args.report_type);
                    }
                }
            });

            var toggle_answer = function (module_item_id, show_answer) {
                var mi = require('Modules').get_module_item(module_item_id);
                if (mi) {
                    mi.set({show_answer: show_answer});
                    mi.set_buttons();
                }
            };

            Houdini.on('active_content_hide_answer', function (args) {
                toggle_answer(args.module_item_id, false);
            });

            Houdini.on('active_content_show_answer', function (args) {
                toggle_answer(args.module_item_id, true);
            });

            Houdini.on('active_content_magnify', function (args) {
                if (args && args.module_id && args.module_id === 'attendance') {
                    require('Modules').get_module('attendance').get('control_panel').magnify();
                }

                else {
                    Fullscreen.enter_fullscreen();
                }
            });

            Houdini.on('active_content_demagnify', function (args) {
                if (args && args.module_id && args.module_id === 'attendance') {
                    CourseInfo.demagnify();
                } else {
                    // we ignore the ipad instruction to demagnify otherwise
                }
            });

            Houdini.on('close_course_info', function () {
                CourseInfo.hide();
                if (!require('Modules').get_module('attendance').get('active')) {
                    return;
                }
                var attendance_mini_view = require('Modules').get_module('attendance').get(
                    'control_panel').subview;
                if (attendance_mini_view) {
                    attendance_mini_view.hide();
                }
            });

            Houdini.on('show_course_info', function () {
                if (!require('Modules').get_module('attendance').get('active')) {
                    return;
                }

                CourseInfo.show(null, true);
            });
        },

        prompt_password: function (cd, options, cb) {
            var incorrect = false;
            var template = _.template(password_template);
            options = options ? options : {};
            options.data = options.data ? options.data : {};

            var try_password = function () {
                // make the request again with the give password
                var password = $('#course_password_form').val();
                window.panels.get('course_password').set({
                    body: $('#loading_template').html()
                });
                window.HoudiniResource.prototype.fetch.call(cd, {
                    data: _.extend(options.data, {password: password}),
                    success: function (model, response, options) {
                        window.panels.get('course_password').remove();
                        if (!_.isUndefined(cb)) {
                            cb(model, response, options);
                        }
                    },
                    error: function (model, response, options) {
                        // the password didn't work
                        var new_status = options.xhr.status;
                        if (new_status === 467) {
                            incorrect = true;
                            window.panels.get('course_password').set({
                                body: template({incorrect: incorrect})
                            });
                        } else {
                            // something's screwy
                            window.location.reload();
                        }
                        $('#course_password_form').focus();
                    }
                });
            };

            var panel = window.panels.get('course_password') || window.panels.add({
                    id: 'course_password',
                    layout: layouts.get('dialog'),
                    title: 'Course password',
                    body: template({incorrect: incorrect}),
                    footer_buttons: {
                        OK: try_password,
                        Cancel: function () {
                            panel.remove();
                            window.location.href = window.site_data.settings.BASE_URL;
                        }
                    },
                    width: 350
                });
            $('#course_password_form').focus();
        },

        set_profiles: function (data) {
            // why are course profiles stored in publisher? TODO: kill publisher
            window.publisher.profiles = {
                demo: data.demo,
                question: data.question
            };
        },

        save_available: function (available) {
            //TODO: store this as a property of the course
            var course_code = window.course.get('course_data').get('public_code');
            if (!course_code) {
                return false;
            }
            window.publisher.send({
                module: 'course',
                command: 'set_course_availability',
                args: {
                    code: course_code,
                    available: available
                },
                success: $.proxy(function () {
                    this.set({available: available});
                    if (available === true) {
                        window.Daedalus.track('course made available');
                    } else {
                        window.Daedalus.track('course made un-available');
                    }
                    if (window.courses_owned) {
                        var course = window.courses_owned.findWhere({public_code: course_code});
                        if (course) {
                            course.set({available: available});
                        }
                    }
                }, this)
            });
        },

        is_course_name_unique: function (course_name) {
            var result = '';
            $('#course_selection_list').find('option').each(function () {
                var c_name = $(this).text();
                if (c_name === course_name) {
                    result = 'A course with this name already exists';
                }
            });
            return result;
        },

        set_local_active_modules: function (active_modules) {
            // Add non-interactive modules to active module list
            active_modules = active_modules.concat([
                'publisher',
                'course'
            ]);
            window.publisher.pause();
            _.each(require('Modules').get_modules(), function (module) {
                module.set({active: _.contains(active_modules, module.id)});
            });
            _.each(require('Modules').get_modules(), function (module) {
                module.toggle_view();
            });
            window.publisher.play();
            if (window.user.get('role') === 'student') {
                this.get_module_items_answered();
            }
        },

        initialize_control_panel: function () {
            if (window.is_mobile && !window.is_presentation_tool) {
                return;    // mobile will fail at this
            }
            // initialize control panel
            var panel = window.panels.add({
                    id: this.get('id') + '_control_panel',
                    module: this.get('id'),
                    layout: layouts.get('control'),
                    title: 'Course',
                    body: '<div class="cpp"></div>',
                    color: this.get('color'),
                    priority: this.get('order'),
                    minimize: true
                });

            // initialize control panel tree view
            var tree = this.get('tree');
            tree.set({sortable: false});
            var tree_view = new TreeView({
                model: tree,
                empty_message: 'No items here...'
            });
            tree_view.render();
            var el = panel.$('.cpp');
            $(el).html(tree_view.el);

            // add control panel items
            var actions = [{
                    group: 'Course Status',
                    items: [
                        {
                            id: 'On',
                            title: '<b>On</b> (Available)',
                            description: 'Make your course available.  Students will be able to search for and enroll in your course.'
                        },
                        {
                            id: 'Off',
                            title: '<b>Off</b> (Unavailable)',
                            description: 'Make your course unavailable.  Students will not be able to find or enroll in your course.'
                        }
                    ]
                }];
            var current_action_label = this.get('available') ? 'On' : 'Off';

            // prof-specific course buttons
            if (window.user.get('role') === 'teacher') {
                tree.get('children').add(new TreeActionItem({
                    id: 'course_available',
                    title: 'Course available',
                    actions: actions,
                    current_action: current_action_label,
                    description: 'Checking this item will make the course available so that students can begin logging into it in order to participate'
                }));
                tree.get('children').add(new TreeItem({
                    title: 'Settings',
                    click: $.proxy(function () {
                        this.course_config_dialog();
                    }, this),
                    description: 'In course settings you can enable/disable features, modify class session times (which determine how your data is organized,) and modify privacy settings.'
                }));
                tree.get('children').add(new TreeItem({
                    title: 'Course Packs',
                    click: $.proxy(function () {
                        new CoursePackChoicesView();
                    }, this),
                    description: 'Course packs allow you find and import content packages for your course subject matter (such as questions and demonstrations,) as well as to publish course packs that other instructors may use.'
                }));
                if (window.user.get('role') === 'teacher' && Browser.is_presentation_tool()) {
                    tree.get('children').add(new TreeItem({
                        title: 'Student Manager',
                        click: $.proxy(function () {
                            this.show_student_manager();
                        }, this),
                        description: 'Click this item see and manage your class list'
                    }));
                }
                if (window.user.get('role') === 'teacher' && !Browser.is_presentation_tool()) {
                    tree.get('children').add(new TreeItem({
                        title: 'Quick Reference Guide',
                        click: Guide.start,
                        description: 'Click here to see our simple 3-step guide'
                    }));
                }

                //if the course's status is updated, update the tree
                this.bind('change:available', $.proxy(function () {
                    var current_action_label = this.get('available') ? 'On' : 'Off';
                    tree.get_item('course_available').set({current_action: current_action_label});
                }, this));
                //if the status action is clicked, update the course
                tree.get_item('course_available').bind('click:current_action', function () {
                    var available = this.get('current_action') === 'On' ? true : false;
                    require('Modules').get_module('course').save_available(available);
                });
            }

            // bind gradebook button
            if (Browser.is_presentation_tool()) {
                require('Modules').get_module('gradebook').bind('change:active', this.update_gradebook_control_panel_link, this);
                this.update_gradebook_control_panel_link();
            }

            if (window.user.get('role') === 'teacher') {
                if (Browser.is_presentation_tool()) {
                    tree.get('children').add(new TreeItem({
                        title: 'Course Info',
                        click: CourseInfo.show,
                        description: 'Click here to show course info'
                    }));
                }
                if (!Browser.is_presentation_tool()) {
                    tree.get('children').add(new TreeItem({
                        title: 'Download Presentation Tool',
                        click: $.proxy(function () {
                            this.download_powerpoint_plugin();
                        }, this),
                        description: 'Click this item to download a program that will allow you to control Top Hat directly from your presentation tool (such as PowerPoint), including activating questions, and viewing the results'
                    }));
                }
            }
            if (window.user.get('role') === 'student') {
                this.draw_app_control_panel_link(tree);
            }
            // if there are no items in the control panel tree, don't show it
            tree.get('children').bind('add', this.hide_show_control_panel, this);
            tree.get('children').bind('remove', this.hide_show_control_panel, this);
            this.hide_show_control_panel();
        },

        draw_app_control_panel_link: function (tree) {
            var mobile_app_item_text = 'Download the Mobile App';
            if (window.org.get('server_code') !== 'US') {
                return;
            }
            tree.get('children').add(new TreeItem({
                title: mobile_app_item_text,
                click: $.proxy(function () {
                    this.show_app_dialog();
                }, this),
                description: 'Get the Top Hat app for your phone'
            }));

            var $mobile_link = $('li:has(em:contains(' + mobile_app_item_text + '))');

            function close_dialog () {
                $mobile_link.qtip('hide');
                $mobile_link.qtip('destroy');
                UserSettings.set({closed_app_prompt: true});
            }
            function show_dialog (html) {
                var $dialog = $(html);
                $dialog.find('.close_notification').click(close_dialog);
                $mobile_link.qtip({
                    content: $dialog,
                    position: {
                        my: 'left center',
                        at: 'right center',
                        adjust: {
                            x: -135,
                            y: 0
                        },
                        container: $('#course_wrapper')
                    },
                    show: {
                        ready: true
                    },
                    hide: false,
                    style: {
                        classes: 'tooltip-light mobile-app-qtip',
                        tip: {
                            height: 10,
                            width: 20,
                            border: 1
                        }
                    }
                });
            }

            $mobile_link.click(close_dialog);
            UserSettings.get(
                {closed_app_prompt: 'closed_app_prompt'},
                function (result) {
                    if (result.closed_app_prompt) {
                        return;
                    } else {
                        show_dialog(mobile_app_html);
                    }
                }.bind(this),
                {closed_app_prompt: false}
            );
        },

        show_app_dialog: function () {
            window.open('https://tophat.com/mobile-apps', '_blank'); // MY: switched to absolute for IE
        },

        show_student_manager: function () {
            if (require('Modules').get_module('invite')) {
                require('Modules').get_module('invite').open_invite();
            }
        },

        hide_show_control_panel: function () {
            var panel = window.panels.get(this.get('id') + '_control_panel');
            if (!this.get('tree').get('children').length) {
                $(panel.get('view').el).hide();
            } else {
                $(panel.get('view').el).show();
            }
        },

        update_gradebook_control_panel_link: function () {
            var gradebook_item = this.get('tree').get_item('gradebook');
            if (require('Modules').get_module('gradebook').get('active') && !gradebook_item) {
                this.get('tree').get('children').add(new TreeItem({
                    id: 'gradebook',
                    title: 'Gradebook',
                    click: $.proxy(function () {
                        this.load_gradebook();
                        if (window.is_presentation_tool) {
                            $(window).trigger('item_set_visible');
                        }
                    }, this)
                }));
            } else if (gradebook_item) {
                this.get('tree').remove(gradebook_item);
            }
        },

        add_course: function () {
            if (window.user.get('freemium') && window.user.get('courses_owned').length >= 1) {
                window.panels.add({
                    title: 'Free course limit reached',
                    id: 'upgrade_freemium',
                    layout: layouts.get('dialog'),
                    body: 'You\'ve reached your free course limit. Please contact support.',
                    footer_buttons: {Close: 'remove'}
                });
                return;
            }

            var data = $('<div></div>');
            var comp = data.composer([
                    {
                        id: 'name',
                        type: 'text',
                        label: 'Name',
                        validation: ['not_empty'],
                        tooltip: 'A brief name for your course. E.g. "Business Economics (Fall 2013)"',
                        placeholder: 'Course Name'
                    },
                    {
                        id: 'advanced_settings',
                        type: 'fieldset',
                        label: 'Advanced Settings',
                        collapsed: true,
                        collapsible: true
                    }
                ]);
            comp.get('advanced_settings').value([
                {
                    id: 'course_code',
                    type: 'text',
                    label: 'Code',
                    tooltip: 'The course code for your course. E.g. "ECON 201"',
                    placeholder: 'Course Code'
                },
                {
                    id: 'description',
                    type: 'textarea',
                    label: 'Description'
                },
                {
                    id: 'password',
                    type: 'password',
                    label: 'Password',
                    tooltip: 'You can password protect your course by entering a password here.'
                },
                {
                    id: 'subject',
                    type: 'text',
                    placeholder: 'Subject',
                    tooltip: 'Enter your courses subject. E.g. "Biology"',
                    label: 'Subject'
                }
            ]);
            data.append('<div class="thm_panel_content_title"></div>');

            var ok_func = function () {
                var get_name_dialog = window.panels.find_el('dialog', 'course', 'add_course_elem');
                if (comp.is_valid()) {
                    var course_name = comp.get('name').value(), course_code = comp.get('course_code').value(), description = comp.get('description').value(), password = comp.get('password').value(), subject = comp.get('subject').value();
                    var course_params = {
                            course_name: course_name,
                            course_code: course_code,
                            description: description,
                            password: password,
                            subject: subject
                        };
                    window.publisher.run_command('course', 'update_property', 'dialog', 'add_course_elem', '', 0, {});
                    window.publisher.post('course', 'add_course', '', course_params, function (data, args) {
                        var public_code = args.public_code;
                        var properties = {newCourseCode: public_code};
                        window.Daedalus.track('created course', properties);
                        window.Daedalus.increment('numCoursesCreated');
                        // Change to the new course.
                        window.location.href = '/e/' + public_code;
                        // Presentation Tool does not need this logic.
                        if (Browser.is_web()) {
                            // Update courselist
                            window.enrolled_courses.fetch({
                                data: {
                                    enrolled: true,
                                    order_by: 'course_name'
                                }
                            });
                        }
                        get_name_dialog.remove();
                    });
                }
            };

            var cancel_func = function () {
                var get_name_dialog = window.panels.find_el('dialog', 'course', 'add_course_elem');
                get_name_dialog.remove();
            };
            var args = {
                    width: 510,
                    title: 'Create a Course',
                    color: 'blue',
                    minimize: false,
                    footer_style: 'max',
                    buttons: {
                        Cancel: cancel_func,
                        Ok: ok_func
                    }
                };
            window.publisher.create_dialog_box_command('course', 'add_course', 'dialog', 'add_course_elem', data, '0', args);
        },

        course_config_dialog: function () {
            // delete-course-button function for settings tab
            var delete_course = function () {
                var yes_delete = function () {
                    // update original dialog body to spinner
                    window.publisher.run_command('course', 'update_property', 'dialog', 'delete_course_dialog', '', 0, {body: $('#loading_template').html()});
                    window.publisher.post('course', 'delete_course', '', {}, function () {
                        //TODO: remove this hack
                        window.location.href = '/e';
                    });
                };
                var delete_args = {
                        width: 270,
                        title: 'Confirm delete',
                        color: 'blue',
                        minimize: false,
                        footer_style: 'max',
                        buttons: {
                            Cancel: 'remove',
                            Yes: yes_delete
                        }
                    };
                window.publisher.create_dialog_box_command('course', 'delete_course', 'dialog', 'delete_course_dialog', '<div class="thm_panel_content_title">Are you sure you would like to delete this course?</div>', '0', delete_args);
            };

            // Create Course Settings Panel
            var panel = window.panels.get('edit_course_panel');
            if (!panel) {
                panel = window.panels.add({
                    id: 'edit_course_panel',
                    module: 'course',
                    layout: layouts.get('dialog'),
                    title: 'Course settings',
                    width: 450,
                    color: 'blue',
                    minimize: false,
                    footer_style: 'max',
                    footer_buttons: {
                        Cancel: {
                            bt_class: 'danger',
                            callback: 'remove'
                        }
                    }
                });
            }
            panel.set({body: $('#loading_template').html()});

            // get current course settings to prepopulate forms
            window.publisher.post('course', 'get_course_settings', '', {}, function (data, args) {
                window.Daedalus.track('opened course settings');
                window.Daedalus.increment('numOpenedSettings');
                // Settings Tab
                data = $('<div></div>');
                var comp = data.composer([
                        {
                            id: 'course_name',
                            type: 'text',
                            label: 'Name',
                            validation: ['not_empty'],
                            tooltip: 'A brief name for your course. E.g. "Business Economics (Fall 2013)"',
                            placeholder: 'Course Name',
                            value: args.course_settings.course_name
                        },
                        {
                            id: 'advanced_settings',
                            type: 'fieldset',
                            label: 'Advanced Settings',
                            collapsed: true,
                            collapsible: true
                        },
                        {
                            id: 'delete_course',
                            type: 'button',
                            tooltip: 'Clicking this button PERMANENTLY DELETES this course and all content inside of it. This action cannot be undone. You will be asked to confirm this action.',
                            value: 'Delete course',
                            change: $.proxy(delete_course, this)
                        }
                    ]);
                comp.get('advanced_settings').value([
                    {
                        id: 'course_code',
                        type: 'text',
                        label: 'Code',
                        tooltip: 'The course code for your course. E.g. "ECON 201"',
                        placeholder: 'Course Code',
                        value: args.course_settings.course_code
                    },
                    {
                        id: 'course_description',
                        type: 'textarea',
                        label: 'Description',
                        value: args.course_settings.course_description
                    },
                    {
                        id: 'course_password',
                        type: 'text',
                        label: 'Password',
                        tooltip: 'You can password protect your course by entering a password here.',
                        value: args.course_settings.course_password
                    },
                    {
                        id: 'course_subject',
                        type: 'text',
                        placeholder: 'Subject',
                        tooltip: 'Enter your courses subject. E.g. "Biology"',
                        label: 'Subject',
                        value: args.course_settings.course_subject
                    },
                    {
                        id: 'sms_participation',
                        type: 'checkbox',
                        label: 'Allow answering via text (SMS) and Offline Mode',
                        tooltip: 'Checking this item will allow student submissions via text message (SMS) and Offline Mode, when applicable',
                        value: args.course_settings.sms_participation
                    },
                    {
                        id: 'sms_grace_period',
                        type: 'checkbox',
                        label: 'Text message (SMS) Grace Period',
                        tooltip: 'Text message (SMS) responses received after an item has been closed but within the grace period will still be recorded. Enable this option if cell reception is poor in your area',
                        value: (args.course_settings.sms_grace_period > 0.5)
                    },
                    {
                        id: 'auto_create_sessions',
                        type: 'checkbox',
                        label: 'New report session on activation',
                        tooltip: 'Checking this will create a new reporting session automatically each time a question or demo is activated, or the browser is refreshed while a question is open',
                        value: args.course_settings.auto_create_sessions
                    }
                ]);
                data.append('<div class="thm_panel_content_title"></div>');

                // Modules Tab
                //generate a list of modules in the following format: [{name: "qanda", active: true}, {name:"demo", active: false}]
                var authorized_modules = _.pick(require('Modules').get_modules(), window.user.get('authorized_modules'));
                var modules;
                if (require('Modules').get_module('unitree').get('active')) {
                    modules = _.pick(authorized_modules, [
                        'gradebook', 'unitree', 'gradebook_beta']);
                } else {
                    modules = _.filter(authorized_modules, function (module) {
                        return module.get('hidden_module') === false;
                    });
                }

                // Filter beta modules (ie. modules ending in _beta)
                var beta_module_ids = [],
                    beta_module_ids_with_suffix = [],
                    beta_modules = {};
                _.each(modules, function (module) {
                    var beta_module = _.findWhere(modules, {id: module.id + '_beta'});
                    if (!_.isUndefined(beta_module)) {
                        beta_modules[module.id] = beta_module;
                        beta_module_ids.push(module.id);
                        beta_module_ids_with_suffix.push(module.id + '_beta');
                    }
                });

                // Select input template for switching between beta and non-beta modules
                var beta_module_template =
                    '<li>' +
                        '<label><span style="text-transform:capitalize"><%= module.id %></span>' +
                            '<select data-beta-select="<%= module.id %>" class="beta-select" style="float:right;">' +
                                '<option value="disable" <% if (!module.get("active") && !beta_modules[module.id].get("active")) { %>selected<% } %>>No <%= module.id %></option>' +
                                '<option value="old" <% if (module.get("active")) { %>selected<% } %>>Old <%= module.id %></option>' +
                                '<option value="new" <% if (beta_modules[module.id].get("active")) { %>selected<% } %>>New <%= module.id %></option>' +
                            '</select>' +
                        '</label>' +
                    '</li>';

                var modules_template = '<p>Click the checkboxes to activate or deactivate modules in your course.</p>' +
                    '<ul id="modules"><% _.each(modules, function (module) { %>' +
                        '<% if (_.contains(beta_module_ids, module.id)) { %>' +
                            beta_module_template +
                        '<% } else if (!_.contains(beta_module_ids_with_suffix, module.id)) { %>' +
                            '<li><label>' +
                            '<%= module.id === "unitree" ? "Unified Tree" : module.id %>' +
                                '<input id="<%= module.id %>_module" type="checkbox" value="<%= module.id %>" <% if (module.get("active")) { %>checked<% } %> />' +
                                '<% if ((module.id === "files") && module.get("active")) { %> <p class="betainfo">This feature is tagged as beta.<br/> Its design and functionality may not be complete.</p><% } else if (module.id === "files" && !module.get("active")) { %> <p class="betainfo" style="display:none">This feature is tagged as beta. Its design and functionality may not be complete.</p><% } %>' +
                            '</label></li>' +
                        '<% } %>' +
                    '<% }) %></ul>';
                var modules_data = _.template(modules_template, {
                    modules: modules,
                    beta_module_ids: beta_module_ids,
                    beta_module_ids_with_suffix: beta_module_ids_with_suffix,
                    beta_modules: beta_modules
                });

                // Grades Tab
                var grade_data = $('<div></div>');
                var grade_comp = grade_data.composer([{
                    id: 'grades_question',
                    type: 'fieldset',
                    label: 'Questions',
                    collapsed: true,
                    collapsible: true
                },{
                    id: 'grades_demo',
                    type: 'fieldset',
                    label: 'Demos',
                    collapsed: true,
                    collapsible: true
                },{
                    id: 'grades_discussion',
                    type: 'fieldset',
                    label: 'Discussion',
                    collapsed: true,
                    collapsible: true
                }]);

                grade_comp.get('grades_question').value([{
                    id: 'questions_correctness_score',
                    type: 'text',
                    positive_decimal: true,
                    validation: ['number'],
                    label: 'Correct answer score',
                    value: args.course_settings.questions_correctness_score
                },{
                    id: 'questions_participation_score',
                    type: 'text',
                    positive_decimal: true,
                    validation: ['number'],
                    label: 'Participation score',
                    value: args.course_settings.questions_participation_score
                },{
                    id: 'questions_is_timed',
                    type: 'checkbox',
                    label: 'Question timer enabled',
                    value: args.course_settings.questions_is_timed
                },{
                    id: 'questions_time_limit',
                    type: 'text',
                    positive_decimal: true,
                    validation: ['number'],
                    label: 'Question timer in seconds',
                    value: args.course_settings.questions_time_limit
                }]);

                grade_comp.get('grades_demo').value([{
                    id: 'demos_correctness_score',
                    type: 'text',
                    positive_decimal: true,
                    validation: ['number'],
                    label: 'Correct answer score',
                    value: args.course_settings.demos_correctness_score
                },{
                    id: 'demos_participation_score',
                    type: 'text',
                    positive_decimal: true,
                    validation: ['number'],
                    label: 'Participation score',
                    value: args.course_settings.demos_participation_score
                },{
                    id: 'demos_is_timed',
                    type: 'checkbox',
                    label: 'Demo timer enabled',
                    value: args.course_settings.demos_is_timed
                },{
                    id: 'demos_time_limit',
                    type: 'text',
                    positive_decimal: true,
                    validation: ['number'],
                    label: 'Demo timer in seconds',
                    value: args.course_settings.demos_time_limit
                }]);

                grade_comp.get('grades_discussion').value([{
                    id: 'discussion_allow_student_topics',
                    type: 'checkbox',
                    label: 'Students can create new topics',
                    value: args.course_settings.discussion_allow_student_topics
                }]);
                grade_data.append('<div class="thm_panel_content_title"></div>');

                if (args.course_settings.lms_integration_enabled) {
                    lms_setup(window.course.get('course_data'), d2l_sync_form);
                }

                // Save Button
                var ok_func = function () {
                    // used to close window but cant reference panel yet?
                    var panel = window.panels.get('edit_course_panel');
                    var valid = true;
                    // select the tab with errors
                    var tabs = panel.get('view').$('.thm_tabbed_panel');
                    if (!comp.is_valid()) {
                        tabs.tabs('select', 0);
                        valid = false;
                    }
                    if (!grade_comp.is_valid()) {
                        tabs.tabs('select', 2);
                        valid = false;
                    }

                    if (valid) {
                        panel.set({footer_buttons: {}});
                        // set the active modules from the form
                        var active_modules = _.map(panel.get('view').$('#modules li input:checked'), function (checkbox) {
                                return $(checkbox).val();
                            });
                        window.panels.get('edit_course_panel').get('view').$('.beta-select').each(function (index, el) {
                            var $el = $(el);
                            var module = $el.data('beta-select');
                            var module_beta = module + '_beta';
                            var beta_selection = $el.val();
                            active_modules = _.without(active_modules, module, module_beta);
                            if (beta_selection === 'old') {
                                active_modules.push(module);
                            } else if (beta_selection === 'new') {
                                active_modules.push(module_beta);
                            } else if (beta_selection === 'disable') {
                            }
                        });

                        // get values from submitted form
                        var course_name = comp.get('course_name').value(),
                            course_code = comp.get('course_code').value(),
                            course_description = comp.get('course_description').value(),
                            course_password = comp.get('course_password').value(),
                            course_subject = comp.get('course_subject').value(),
                            sms_participation = comp.get('sms_participation').value(),
                            sms_grace_period = comp.get('sms_grace_period').value(),
                            auto_create_sessions = comp.get('auto_create_sessions').value(),
                            questions_correctness_score = grade_comp.get('questions_correctness_score').value(),
                            questions_participation_score = grade_comp.get('questions_participation_score').value(),
                            questions_is_timed = grade_comp.get('questions_is_timed').value(),
                            questions_time_limit = grade_comp.get('questions_time_limit').value(),
                            demos_correctness_score = grade_comp.get('demos_correctness_score').value(),
                            demos_participation_score = grade_comp.get('demos_participation_score').value(),
                            demos_is_timed = grade_comp.get('demos_is_timed').value(),
                            demos_time_limit = grade_comp.get('demos_time_limit').value(),
                            discussion_allow_student_topics = grade_comp.get('discussion_allow_student_topics').value(),
                            // observation_password_protected = comp.get("observation_password_protected").value();
                            //use_clicker = details_form["use_clicker"]; //4.16.03

                            // This is a dictionary that is passed to edit_course, used to save the values in course/course_settings
                            course_params = {
                                course_name: course_name,
                                course_code: course_code,
                                course_description: course_description,
                                course_password: course_password,
                                course_subject: course_subject,
                                sms_participation: sms_participation,
                                sms_grace_period: sms_grace_period,
                                auto_create_sessions: auto_create_sessions,
                                questions_correctness_score: questions_correctness_score,
                                questions_participation_score: questions_participation_score,
                                questions_is_timed: questions_is_timed,
                                questions_time_limit: questions_time_limit,
                                demos_correctness_score: demos_correctness_score,
                                demos_participation_score: demos_participation_score,
                                demos_is_timed: demos_is_timed,
                                demos_time_limit: demos_time_limit,
                                discussion_allow_student_topics: discussion_allow_student_topics,
                                active_modules: active_modules
                            };
                        window.publisher.run_command('course', 'update_property', 'dialog', 'course_settings_dialog', '', 0, {body: data});
                        // check if course_params.active_modules contains 'attendance'
                        // if it does and course.get('course_data').get('settings').get('active_modules') does not have attendance
                        // fire activated attendance event
                        var old_modules = window.course.get('course_data').get('settings').get('active_modules');
                        if (_.contains(course_params.active_modules, 'attendance') && !_.contains(old_modules, 'attendance')) {
                            window.Daedalus.track('attendance module enabled');
                        }
                        // if attendance module disabled, hide attendance item
                        if (!_.contains(course_params.active_modules, 'attendance') && _.contains(old_modules, 'attendance')) {
                            if (require('Modules').get_module('attendance').get('control_panel')) {
                                if (require('Modules').get_module('attendance').get('control_panel').subview) {
                                    require('Modules').get_module('attendance').get('control_panel').subview.hide();
                                    $('.attendance_miniview').hide();
                                }
                            }
                        }
                        panel.set({body: $('#loading_template').html()});
                        // TODO: fix loading spin wheel
                        // edit course settings using submitted form
                        window.publisher.post('course', 'edit_course', '', course_params, function () {
                            window.publisher.post('course', 'get_course_settings', '', {}, function () {
                            });
                            // TODO: ask if this is needed
                            if (window.courses_owned) {
                                var course_code = window.course.get('course_data').get('public_code');
                                var other_course_instance = window.courses_owned.findWhere({public_code: course_code});
                                if (other_course_instance) {
                                    other_course_instance.set({course_name: course_name});
                                }
                            }
                            window.publisher.auto_create_sessions = !_.isEmpty(course_params.auto_create_sessions);
                            window.course.get('course_data').fetch();
                            // Course settings saved dialog
                            panel.set({
                                footer_buttons: {
                                    Ok: function () {
                                        panel.remove();
                                    }
                                }
                            });
                            panel.$b().html('<p>Course settings saved</p>');
                            var panel_gradebook = window.panels.get('gradebook_panel');
                            if (panel_gradebook) {
                                // Updating the course settings may change the gradebook view (i.e. enabling/disabling roster).
                                window.course.load_gradebook(false);
                            }
                        }.bind(this));
                    }
                }.bind(this);
                var course_settings_tabs = [
                    [
                        'settings',
                        'Settings',
                        data
                    ],
                    [
                        'modules',
                        'Modules',
                        modules_data
                    ],
                    [
                        'grades',
                        'Grades',
                        grade_data
                    ]
                ];
                if (args.course_settings.lms_integration_enabled) {
                    course_settings_tabs.push([
                        'lms',
                        'LMS',
                        window.lms_el
                    ]);
                }
                panel.set({
                    body: course_settings_tabs,
                    footer_buttons: {
                        Cancel: {
                            bt_class: 'danger',
                            callback: 'remove'
                        },
                        Save: {
                            bt_class: 'affirmative',
                            callback: ok_func
                        }
                    }
                });

                // Hacky hack for beta hax
                $('input#files_module').click(function () {
                    if ($(this).is(':checked')) {
                        $(this).parent().find('.betainfo').show();
                    } else {
                        $(this).parent().find('.betainfo').hide();
                    }
                });
            });
            window.publisher.track_analytics_event('Course', 'Settings', 'Course settings opened');
        },

        download_powerpoint_plugin: function () {
            // Create a dialog panel
            var panel = window.panels.add({
                id: 'presentation_tool',
                module: 'course',
                layout: layouts.get('dialog'),
                title: 'Download Presentation Tool',
                body: $('#loading_template').html(),
                footer_buttons: {Close: 'remove'},
                width: 605
            });
            var data = {
                MEDIA_URL: window.site_data.settings.MEDIA_URL,
                pt_download_mac: window.site_data.urls.pt_download_mac,
                pt_download_win: window.site_data.urls.pt_download_win,
                pt_download_usb: window.site_data.urls.pt_download_usb
            };
            panel.set({body: _.template(pt_download_template, data)});
            // Hide our Cancel buttons
            panel.get('view').$('.thm_panel_footer').hide();
            // Add event bindings to our "message links".  If we click download, we'll
            // show the download links and footer.
            panel.get('view').$('.download').on('click', function (event) {
                event.preventDefault();
                panel.get('view').$('.message').fadeTo(500, 0, function () {
                    panel.get('view').$('.message').hide();
                    panel.get('view').$('.installer').fadeIn('slow', function () {
                        panel.get('view').$('.thm_panel_footer').slideDown();
                    });
                });
            });
            // If we cancel, we just simulate a click to the cancel button
            panel.get('view').$('.cancel').on('click', function (event) {
                event.preventDefault();
                panel.get('view').$('.footer_button_close').click();
            });
            // Show the appropriate installer link and instructions
            if (Browser.is_mac()) {
                // User is running Mac OS X
                panel.get('view').$('.mac_install_steps').show();
            } else {
                // Assume user is running Windows
                panel.get('view').$('.win_install_steps').show();
            }
            window.Daedalus.track('opened PT download window');
            $('a.download_installer').on('click', function () {
                window.Daedalus.track('downloaded pt');
                window.Daedalus.increment('numPTDownloads');
            });
        },

        load_gradebook: function (is_track) {
            if (this._is_gradebook_loaded || !require('Modules').get_module('gradebook')) {
                return;
            }
            this._is_gradebook_loaded = true;

            if (window.user.is_teacher()) {
                require('Modules').get_module('gradebook').open_gradebook();
            } else {
                require('Modules').get_module('gradebook').create_student_gradebook_details(
                    '', '');
            }

            is_track = _.isUndefined(is_track) ? true : is_track;
            if (is_track) {
                window.Daedalus.track('opened gradebook');
            }
        },

        create_course_password: function (data, args) {
            var html = args.html;
            var panel = window.panels.add({
                id: 'course_password',
                module: 'course',
                layout: layouts.get('dialog'),
                title: 'Course Password',
                body: html,
                footer_buttons: {
                    Cancel: function () {
                        window.location.href = window.site_data.settings.BASE_URL;
                    },
                    Submit: function () {
                        // TODO Er, this seems incomplete.
                        // TODO hughes enter_course set password
                        panel.remove();
                    }
                }
            });
        },

        set_sms_enabled: function (data) {
            this.set({sms_enabled: data.sms_enabled});
        },

        course_participation_enroll: function () {
            return window.course.course_participation_response('enrolled');
        },

        course_participation_response: function () {
            var panel = window.panels.get('dialog_password');
            // Update enroll panel if it exists
            if (!_.isUndefined(panel)) {
                panel.loading();
            }
            // TODO hughes enter_course set password
        },

        init_callback: function () {
            var course_id = this.get('course_data').get('id');
            window.ajax_headers['course-id'] = course_id;
            window.update_ajax_headers();

            this.initialize_control_panel();
            this.start_polling_visible_items();
            if (Browser.is_presentation_tool() && window.user.get('role') === 'teacher') {
                // Cache datastore driven user settings for quickadd
                UserSettings.get([
                    'quickadd_mc_default',
                    'quickadd_attach_scrot'
                ], undefined, [
                    '4',
                    'false'
                ]);
            }
            if (Guide.autoplay()) {
                Guide.start();
            }
        },

        start_polling_visible_items: function () {
            var visible_items = new VisibleItems({
                id: this.get('course_data').get('id')
            });
            this.set({visible_items: visible_items});
        },

        delete_course_callback: function () {
            //the delete_course command cannot execute a callback, because the enter_course command that is called before the success command nulls it
            //this command is called from the server side, and is executed before enter_course is called
            window.panels.find_el('dialog', 'course', 'delete_course_dialog').remove();
            window.panels.find_el('dialog', 'course', 'course_settings_dialog').remove();
        },

        get_course_student_list_timestamp: function () {
            return window.panels.find_el('status', 'course', 'course_student_list').attr('time_stamp');
        },

        custom_student_list_appearance: function (data, args) {
            //args.status_bar_div_id is actually student_list_div right now, so TODO is to rename
            //add image icon
            $('#' + args.status_bar_div_id).prepend('<img id="online_icon_img" style="position:absolute;top:16px;" />');
            $('#online_icon_img').attr('src', window.site_data.settings.MEDIA_URL + 'images/edumacation/thm_tree/icon_online.png');
            //and re-adjust positioning, since no custom css class attached to this as this is a jqplot target, css here, is better than
            //hardcoded element id in css file
            $('#student_list_status_bar').css('left', '10px').css('margin-top', '10px').css('margin-bottom', '-10px');
            //custom adjust for jqplot title just for this status bar for now
            setTimeout(function () {
                //must do this after timeout since graphs are drawn after timeout
                $('#student_list_status_bar').find('.jqplot-title').css('left', '10px').css('text-align', 'left');
            }, 0);
        },

        set_recurring_course_sessions: function (data, args) {
            if (!_.isUndefined(args.sessions_list)) {
                window.course.set({recurring_course_sessions: args.sessions_list});
            }
        },

        generate_supplementary_button: function (text, url) {
            var button = $('<div class="supplementary"><span class="action"><a href="' + url + '">' + text + '</a></span></div>');
            $('#region-navbar .account').prepend(button);
            $('#region-navbar .username').css({right: '150px'});
            return button;
        },

        show_enrollment_button: function () {
            if (window.user.get('is_anonymous_account')) {
                return;
            }
            var button = this.generate_supplementary_button('Enroll', '#');
            $('a', button).bind('click', function (e) {
                e.preventDefault();
                window.course.course_participation_response('enrolled');

                // TODO DD: Fix this so it does what it should
                $('#region-navbar .supplementary').remove();
                $('#region-navbar .username').css({right: '70px'});

                return false;
            });
        },

        show_registration_button: function () {
        },

        update_course_sessions_list: function (data, args) {
            $('.course_session_select').replaceWith(args.course_session_select_html);
        },

        get_module_items_answered: function () {
            var course_id = this.get('course_data').get('id');
            var set_answered = function (ids, module) {
                window.course.set_module_items_answered(null, {
                    module_name: module,
                    item_ids: ids
                });
            };
            return $.ajax({
                type: 'GET',
                url: '/api/v2/answered_items/' + course_id,
                dataType: 'json'
            }).done(function done_get_module_items_answered(data) {
                _.each(data, set_answered);
                this.trigger_module_answered_changed();
            }.bind(this));
        },

        set_module_items_answered: function (data, args) {
            var answered_items = args.item_ids;
            var module_name = args.module_name;
            var module_items = require('Modules').get_module(module_name);
            if (_.isUndefined(module_items)) {
                return false;
            }

            module_items.get('items').each(function (item) {
                if (_.contains(answered_items, parseInt(item.get('id'), 10))) {
                    item.set({answered: true});
                }
            });
            module_items.get('items').on('add', function (item) {
                if (_.contains(answered_items, parseInt(item.get('id'), 10))) {
                    item.set({answered: true});
                }
            });
        },

        trigger_module_answered_changed: function () {
            _.each(require('Modules').get_modules(), function (module) {
                module.items().trigger('change:answered');
            });
        },

        course_pack_update: function (data, args) {
            // This gets called as a remote command from the server when a
            // course pack has been updated (created, or imported)
            var panel = window.panels.find(undefined, 'course', 'course_pack');
            if (panel) {
                panel.first().remove();
            }
            window.panels.add({
                id: 'course_pack_update',
                title: 'Course Pack',
                layout: layouts.get('dialog'),
                body: '<p>' + args.message + '</p>',
                footer_buttons: {Close: '__close__'}
            });
        },

        initialize_status_group_dialog: function (items) {
            var panel = window.panels.get('set_custom_status');
            if (panel) {
                return;
            }
            panel = window.panels.add({
                id: 'set_custom_status',
                module: this.id,
                layout: layouts.get('dialog'),
                title: 'Select students to assign content',
                body: $('#loading_template').html(),
                width: 800
            });

            $.when(this.get_student_memberships(), this.get_answered_students(items))
                .done(function (memberships, answered_students) {
                    var view = new StudentSelectorView({
                        el: panel.$b(),
                        master_collection: memberships,
                        answered_students: answered_students,
                        items: items
                    });
                    view.render();
                    view.on('destroy', function on_destroy_callack () {
                        panel.remove();
                    });
                });
        },

        get_student_memberships: function () {
            // Fetches a collection of all students in the course
            //  Note: returns a deferred object
            var collection = new StudentMembershipCollection();
            var promise = $.Deferred();
            collection.fetch({
                data: {
                    limit: 0,
                    course: this.get('course_data').get('id')
                },
                remove: false
            }).done(function () {
                promise.resolve(collection);
            }).fail(promise.reject);
            return promise;
        },

        get_answered_students: function (items) {
            // Fetches a list of all users who have answered at least one item
            // Note: returns a deferred object
            //
            // This uses the reports resource, but not the Report model
            // This is because all the helper (polling) behaviour is unneeded
            var reports = new Backbone.Collection();
            reports.url = '/api/v1/reports/';

            var params = $.param({
                id__in: items.map(function (item) {
                    return item.get_id();
                })
            }, true);
            function extract_usernames (memo, item) {
                return memo.concat(_.keys(item.get('data')['All Data']));
            }

            var promise = $.Deferred();
            reports.fetch({
                data: params
            }).done(function () {
                var answered_students = reports.reduce(extract_usernames, []);
                promise.resolve(answered_students);
            }).fail(promise.reject);
            return promise;
        }
    });
    return CourseModule;
});
