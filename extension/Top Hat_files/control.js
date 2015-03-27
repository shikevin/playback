/* global _, panels, Daedalus */
define([
    'text!templates/attendance/sidebar.html',
    'models/attendance/Attendance',
    'text!templates/attendance/tutorial.html',
    'views/attendance/MiniView',
    'layouts/edumacation/LayoutCollection',
    'views/ModuleControl',
    'models/Clicker',
    'models/UserSettings',
    'course/CourseInfo'
], function (
    sidebar,
    AttendanceItem,
    tutorial,
    MiniView,
    layouts,
    ModuleControlView,
    Clicker,
    UserSettings,
    CourseInfo
) {
    'use strict';
    var AttendanceControlView = ModuleControlView.extend({
        template: _.template(sidebar),
        events: {
            'click .take_attendance .button': 'take_attendance',
            'click .finish_attendance': 'stop_attendance',
            'click .magnify_attendance_sidebar': 'magnify'
        },
        initialize: function () {
            this.create_attendance_item = _.debounce(this.create_attendance_item.bind(this), 2000, true);
            this.render();

            // Initialize control panel
            if (window.user.get('role') === 'teacher') {
                this.panel = panels.add({
                    id: this.model.get('id') + '_control_panel',
                    module: this.model.get('id'),
                    layout: layouts.get('control'),
                    title: this.model.get('name'),
                    body: this.$el,
                    color: this.model.get('color'),
                    priority: this.model.get('order'),
                    minimize: true
                });

                this.listenTo(this.model, 'change:current_item', this.set_current_item, this);
                this.set_current_item();

                // Start clicker voting if required
                if (!_.isUndefined(window.Clicker)) {
                    var current_item = this.model.get('current_item');
                    if (current_item !== null) {
                        Clicker.startPolling(current_item.get('id'), 'attendance');
                    }
                }
            }
        },
        set_current_item: function () {
            var attendance_item = this.model.get('current_item');
            this.remove_subview();
            if (attendance_item) {
                this.$('.take_attendance').hide();
                this.$('.stop_attendance').show();
                attendance_item.fetch().done(function () {
                    this.subview = new MiniView({model: attendance_item});
                    CourseInfo.mini_view = this.subview;
                    this.listenTo(this.model, 'change:current_data', this.update_attendance_report, this);
                    this.update_attendance_report();
                }.bind(this));
            } else {
                this.$('.take_attendance').show();
                this.$('.stop_attendance').hide();
            }
        },
        render: function () {
            this.$el.html(this.template());
        },
        take_attendance: function (callback) {
            // check if tutorial is done
            UserSettings.get(
                {finished_attendance_tutorial: 'finished_attendance_tutorial'},
                function (result) {
                    if (!result.finished_attendance_tutorial) {
                        this.show_tutorial();
                    } else {
                        this.create_attendance_item(callback);
                    }
                }.bind(this),
                {finished_attendance_tutorial: false}
            );
        },
        create_attendance_item: function (callback) {
            if (require('Modules').get_module('attendance').get('current_item') === null) {
                // start taking attendance

                if (this.subview) {
                    this.subview.remove();
                }

                var attendance_item = new AttendanceItem({
                    course: window.course.get('course_data').url()
                });
                attendance_item.save().done(
                    function () {
                        this.subview = new MiniView({model: attendance_item});
                        this.listenTo(this.model, 'change:current_data', this.update_attendance_report, this);
                        this.update_attendance_report();
                        this.magnify();

                        // hack: fix when courseinfo is backbone
                        if (_.isFunction (callback)) {
                            callback(attendance_item);
                        }

                        // Start clicker voting
                        if (!_.isUndefined(window.Clicker)) {
                            var current_item = this.model.get('current_item');
                            if (current_item !== null) {
                                Clicker.startPolling(current_item.get('id'), 'attendance');
                            }
                        }
                    }.bind(this)
                );
            }

        },
        stop_attendance: function () {
            var correct_responses = require('Modules').get_module('attendance').current_correct_responses();
            var attendance_percentage = require('Modules').get_module('attendance').current_percentage();

            var attendance_response_properties = {
                numberStudentsAttended: correct_responses,
                percentageStudentsAttended: attendance_percentage
            };
            Daedalus.track('finished attendance', attendance_response_properties);
            Daedalus.set_property('hasFinishedAttendance', true);
            Daedalus.increment('clickedFinishAttendanceCount');

            if (this.model.get('current_item')) {
                this.model.get('current_item').save_status('inactive');
            }

            if (this.subview) {
                this.subview.remove();
            }

            $('.attendance_miniview').hide();
        },
        show_tutorial: function () {
            // Load the info panel and render it into a real panel.
            var panel = panels.add({
                id: 'attendance_tutorial_popup',
                module: 'attendance',
                layout: layouts.get('dialog'),
                color: 'none',
                body: tutorial,
                width: 600,
                height: 400
            });

            // Bind our custom 'close' button
            panel.get('view').$('.close').on('click', function (event) {
                event.preventDefault();
                panel.remove();
                UserSettings.set({
                    finished_attendance_tutorial: true
                });
                this.take_attendance();
            }.bind(this));

            $('.attendance-tutorial .step').hide();
            $('.attendance-tutorial .active').show();

            // next button
            $('.attendance-tutorial .step .next').on('click', function (e) {
                e.preventDefault();

                $('.attendance-tutorial').find('.active').removeClass('active').next().addClass('active');

                $('.attendance-tutorial .step').hide();
                $('.attendance-tutorial .active').show();

                var $progress_bar_fill = $('.attendance-tutorial .progress-bar-fill');
                $progress_bar_fill.width($progress_bar_fill.width() + 100);
            });

        },
        update_attendance_report: function () {
            var attendance_percentage = this.model.get('current_data');

            this.$('.attendance_percentage').text(attendance_percentage + '%');

            // update course info attendance percentage and progress bar fill
            var course_info_panel = panels.find('dialog', 'course', 'course_details_popup');
            if (!_.isUndefined(course_info_panel)) {
                var course_info_panel_view = course_info_panel.models[0].get('view');

                course_info_panel_view.$('#attendance_percentage').html(attendance_percentage);
            }
            $('.course-info-modal .progress-bar-fill').width(Math.round(250 * attendance_percentage / 100));
        },
        magnify: function () {
            if (this.subview) {
                this.subview.magnify();
                $('.attendance_miniview').hide();
            }
        },
        remove_subview: function () {
            if (this.subview) {
                this.subview.remove();
            }
        },
        remove: function () {
            ModuleControlView.prototype.remove.apply(this);
            this.remove_subview();
        }

    });
    return AttendanceControlView;
});
