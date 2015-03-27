/* global _ */
define([
    'views/attendance/control',
    'views/attendance/content',
    'models/attendance/Attendance',
    'modules/Module',
    'course/CourseInfo',
    'reporting',
    'views/attendance/MiniView'
], function (
    AttendanceControlView,
    StudentAttendanceView,
    AttendanceItem,
    Module,
    CourseInfo,
    reporting,
    MiniView
) {
    'use strict';
    var Attendance = Module.extend({
        current_form: undefined,
        defaults: _.extend({}, Module.prototype.defaults, {
            id: 'attendance',
            name: 'Attendance',
            color: 'aqua',
            control_view: AttendanceControlView,
            model: AttendanceItem,
            order: 1,
            current_item: null
        }),
        initialize: function() {
            Module.prototype.initialize.call(this);
            if (window.user.get('role') === 'teacher') {
                // teachers
                this.listenTo(this.items(), 'change:status', this.set_current_item, this);
            } else {
                // students
                this.items().on('change:status', this.set_student_view, this);
            }
            this.set_current_item();
        },
        set_current_item: function () {
            var active_item = this.get_currently_active_attendance_item();

            // only release the report if the report is no longer applicable to the current active item
            if (
                this.report &&
                (
                    !active_item || active_item.get_id() !== this.report.get_id()
                )
            ) {
                reporting.Reports.release(this.report.get_id(), this);
                this.stopListening(this.report);
                this.report = undefined;
            }
            if (active_item) {
                if (!this.report) {
                    // only request a report if we have not already requested a report
                    this.report = reporting.Reports.request(active_item.get_id(), this);
                    this.listenTo(this.report, 'change:data', this.update_report_data);
                }
                this.set({current_item: active_item});
                // If the prof is using the app from multiple devices
                // (e.g. web app on desktop and ios app on an iPad),
                // we want to show the CourseInfo panel on all devices if
                // attendance is activated.
                CourseInfo.show();
            } else {
                this.set({current_item: null});
                // Redraw the course info panel.
                CourseInfo.update();
            }
        },
        get_currently_active_attendance_item: function () {
            return this.items().findWhere({status: 'active_visible'});
        },
        set_student_view: function () {
            var attendance_item = this.get_currently_active_attendance_item();
            if (attendance_item) {
                var view = new StudentAttendanceView({model: attendance_item});
                view.render();
            } else if (!_.isUndefined(window.student_panel)) {
                window.student_panel.remove();
            }
        },
        current_percentage: function () {
            if (!this.report) {
                return 0;
            }
            var code = this.get('current_item').get('code');
            var correct_responses = 0;
            _.each(this.report.current_data(), function (num) {
                if (num === code) {
                    correct_responses++;
                }
            });
            var attendance_percentage = Math.round((correct_responses / window.course.get('num_students')) * 100);
            if (_.isNaN(attendance_percentage)) {
                attendance_percentage = 0;
            } else if (attendance_percentage > 100) {
                attendance_percentage = 100;
            }
            return attendance_percentage;
        },
        current_correct_responses: function () {
            if (!this.report) {
                return 0;
            }
            var code = this.get('current_item').get('code');
            var correct_responses = 0;
            _.each(this.report.current_data(), function (num) {
                if (num === code) {
                    correct_responses++;
                }
            });
            return correct_responses;
        },
        update_report_data: function () {
            this.set({current_data: this.current_percentage()});
        }
    });

    return Attendance;
});
