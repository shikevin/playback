/* global _, Backbone, MacToolController, QtToolController, publisher */
define([
    'quickadd/QuickAddCreationView',
    'quickadd/QuickAddView',
    'quickadd/AttendanceCreationView',
    'models/attendance/Attendance',
    'models/Clicker',
    'models/UserSettings'
], function (
    QuickAddCreationView,
    QuickAddView,
    AttendanceCreationView,
    AttendanceItem,
    Clicker,
    UserSettings
) {
    'use strict';

    var pre_quickadd_height = $(window).height();
    var pre_quickadd_width = $(window).width();
    var pre_quickadd_page;
    if (require.defined('lobby/PresentationTool')) {
        require('lobby/PresentationTool').get_active_page();
    }

    var upload_screenshot = function (question_key, image_data) {
        // POST screenshot to server
        publisher.send({
            module: 'question',
            command: 'add_quickadd_screenshot',
            args: {
                question_key : question_key,
                image_data : image_data
            },
            timeout_handling: publisher.TOH.retry
        });
    };

    var take_screenshot = function (question_key) {
        var encoded_data;
        if (typeof MacToolController !== 'undefined') {
            // Take screenshot
            encoded_data = MacToolController.takeScreenshot();
            // TODO: Error check to see if encoded data is null?
            // Upload to s3 and link to question
            upload_screenshot(question_key, encoded_data);
        } else if (typeof QtToolController !== 'undefined') {
            // Take Screenshot
            encoded_data = QtToolController.takeScreenshot();
            upload_screenshot(question_key, encoded_data);
        } else {
            require('lobby/PresentationTool').raise_c_event('ScreenshotEvent', question_key);
        }
    };

    var minimize_quickadd = function () {
        $('body').removeClass('quickadd');
        $('#bt_toggle_quickadd').removeClass('active');
        window.quickadd.set({
            dialog_open: false,
            loading: false
        });
        // restore to previous page and height/width
        require('lobby/PresentationTool').set_page(pre_quickadd_page ? '#' + pre_quickadd_page : '#content_page');
        require('lobby/PresentationTool').resize_pt(pre_quickadd_width, pre_quickadd_height, true, true);
    };

    var minimize_attendance = function () {
        $('body').removeClass('attendance');
        $('#bt_toggle_attendance').removeClass('active');
        window.quickadd.set({'dialog_open':false, 'loading': false});

        //restore to previous page and height/width
        require('lobby/PresentationTool').set_page(pre_quickadd_page ? '#' + pre_quickadd_page : '#content_page');
        require('lobby/PresentationTool').resize_pt(pre_quickadd_width, pre_quickadd_height, true, true);
    };

    var QuickAdd = Backbone.Model.extend({
        defaults: {
            module_item: false,
            loading: false,
            dialog_open: false,
            mc_option_count: 4,
            save_screenshot: false
        },
        initialize: function () {
            // Get saved quickadd settings from datastore
            // These get set when the user clicks a question type to create the question.
            UserSettings.get([
                'quickadd_mc_option_count',
                'quickadd_save_screenshot'
            ], $.proxy(function (settings) {
                this.set({
                    'mc_option_count': settings.quickadd_mc_option_count,
                    'save_screenshot': settings.quickadd_save_screenshot
                });
            }, this), //set module defaults of 4 and false
            [
                this.get('mc_option_count'),
                this.get('save_screenshot')
            ]);
            this.on('change:module_item', this.update_module_item, this);
        },
        update_module_item: function () {
            // only execute this is a module item has been created and assigned
            if (!this.get('module_item')) {
                $('#pt_header').show();
                return false;
            }
            var view = new QuickAddView({model: this});
            $('#quickadd').html(view.el);
            $('#pt_header').hide();
            require('lobby/PresentationTool').set_page('#quickadd');
            view.resize_window();
            window.quickadd_view = view;
        },
        toggle: function () {
            if (!this.get('dialog_open')) {
                //store the pre-quickadd height and width so that we know what to resize to
                //when quickadd is toggled again
                pre_quickadd_height = $(window).height();
                pre_quickadd_width = $(window).width();
                pre_quickadd_page = require('lobby/PresentationTool').get_active_page();
                $(this).addClass('active');
                require('lobby/PresentationTool').resize_pt(305, 250, false, false);
                require('lobby/PresentationTool').set_page('#quickadd_picker');
                $('body').addClass('quickadd');
                var view = new QuickAddCreationView({model: this});
                $('#quickadd_picker').html(view.el);
                this.set({dialog_open: true});
            } else {
                // cancel clicked? minimize quickadd!
                this.set({module_item: false});
                minimize_quickadd();
            }
        },
        toggle_attendance: function () {
            if (!this.get('dialog_open')) {
                //store the pre-quickadd height and width so that we know what to resize to
                //when quickadd is toggled again
                pre_quickadd_height = $(window).height();
                pre_quickadd_width = $(window).width();
                pre_quickadd_page = require('lobby/PresentationTool').get_active_page();
                $(this).addClass('active');
                require('lobby/PresentationTool').resize_pt(450, 200, false, false);
                require('lobby/PresentationTool').set_page('#attendance');
                $('body').addClass('attendance');
                // TODO: Properly load any currently active attendance items and use them for the view.
                //       If none are active, create a new one in the database and continue.
                var do_attendance = function (attendance) {
                    var view = new AttendanceCreationView({model: attendance});
                    $('#attendance').html(view.el);
                    this.set({dialog_open: true});
                }.bind(this);
                var attendance = require('Modules').get_module('attendance').current_item;
                if (!attendance) {
                    attendance = new AttendanceItem();
                    attendance.set({course: window.course.get('course_data').url()});
                    // Clear existing attendance display to prevent showing
                    // old SMS number.
                    $('#attendance').html('');
                    attendance.save().done(function () {
                        var items = require('Modules').get_module('attendance').items();
                        var existing_item = items.get(attendance.id);
                        if (existing_item && existing_item !== attendance) {
                            existing_item.set(attendance.attributes);
                            attendance.off();
                            attendance = existing_item;
                        } else {
                            items.add(attendance);
                        }
                        do_attendance(attendance);
                        Clicker.startPolling(attendance.get('id'), 'attendance');
                    });
                } else {
                    do_attendance(attendance);
                }
            } else {
                // cancel clicked? minimize quickadd!
                this.set({module_item: false});
                minimize_attendance();
            }
        },
        //takes a question type (mc, na, wa) and creates question module item, then initializes module item and loads its data
        //sets `loading` property to true while doing this, false when all data is loaded
        //when all data is loaded, sets `module_item` property to be the module item
        create: function (type) {
            this.set({loading: true});
            var title = this.get('question_title');
            var num_questions;
            if (title === '') {
                try {
                    num_questions = require('Modules').get_module('question').get('tree').flatten(true).length;
                } catch (e) {
                    num_questions = 0;
                }
                title = 'Quick-Add Question ' + (num_questions + 1);
            }
            var question_text = 'Please select the correct choice, then click \'Submit\':';
            var mc_potential_choices = 'abcdefghijklmnopqrstuvwxyz'.split('');
            var mc_choices = [];
            if (type === 'mc') {
                mc_choices = _.first(mc_potential_choices, this.get('mc_option_count'));
            }
            var qamo = this;
            var QuestionItem = require('models/question/question');
            var folder = require('Modules').get_module(
                'question'
            ).get_folder_id_to_insert_into();
            /* DON'T directly set the status, use active_immediately and wait for the 201 response!! */
            var item = new QuestionItem({
                title: title,
                question: question_text,
                active_immediately: true,
                has_correct_answer: false,
                correct_answers: [],
                is_anonymous: false,
                advanced: false,
                type: type,
                choices: mc_choices,
                profile: {
                    is_timed: publisher.profiles.question.is_timed,
                    time_limit: publisher.profiles.question.time_limit,
                    correctness_score: publisher.profiles.question.correctness_score,
                    participation_score: publisher.profiles.question.participation_score
                },
                folder: folder
            });
            item.save({}, {
                success: function () {
                    // did user cancel the quickadd?
                    if (!qamo.get('dialog_open')) {
                        return;
                    }
                    // there is a race condition with houdini here
                    // we might have already received the item from the tree update
                    // if not, we need to prevent the update from overriding this one
                    var items = require('Modules').get_module('question').items();
                    var existing_item = items.get(item.id);
                    if (existing_item && existing_item !== item) {
                        existing_item.set(item.attributes);
                        // to save a fetch()
                        item.off();
                        item = existing_item;
                    } else {
                        items.add(item);
                    }
                    item.set({status: 'active_visible'});
                    item.setup_panel();
                    item.start_timer_if_required();
                    // Start polling on attached Clicker devices
                    Clicker.startPolling(item.get('id'), type);
                    // I'd like to be able to reach the question from the quickview model..
                    qamo.item = item;
                    qamo.set({
                        module_item: item,
                        loading: false
                    });
                    if (qamo.get('save_screenshot')) {
                        take_screenshot(item.get('id'));
                    }
                    // quickview view will hook this to change the toggle active button state
                    item.bind('change:status', function () {
                        qamo.trigger('change:status');
                    });
                }
            });
        }
    });

    QuickAdd.minimize_quickadd = minimize_quickadd;
    QuickAdd.minimize_attendance = minimize_attendance;

    return QuickAdd;
});