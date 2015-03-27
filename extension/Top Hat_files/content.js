/* globals Backbone, _, panels */
define([
    'text!templates/attendance/attendance_form.html',
    'util/accessibility',
    'layouts/edumacation/LayoutCollection'
], function (
    attendance_form,
    Accessibility,
    layouts
) {
    'use strict';
    var StudentAttendanceView = Backbone.View.extend({
        template: _.template(attendance_form),
        // events: {
        //     "click .submit_attendance .btn": "submit_attendance"
        // },
        initialize: function() {
            var attendance_item = require('Modules').get_module('attendance').items().where({status: 'active_visible'})[0];
            var correct;
            var attempts;

            if (window.student_panel) {
                window.student_panel.remove();
            }
            if (this.model && window.user.get('role') === 'student') {
                $.get('/api/v2/attendance_response/' + attendance_item.get('id') + '/',
                    function(result) {
                        correct = result.correct;
                        attempts = result.attempts;

                        if (window.user.get('role') === 'student' && correct === false && attempts < 3) {
                            window.student_panel = panels.add({
                                id: this.model.get('id') + '_content_panel',
                                module: this.model.get('id'),
                                layout: layouts.get('content'),
                                title: 'Attendance',
                                body: this.$el,
                                color: this.model.get('color'),
                                priority: 1,
                                minimize: true,
                                footer_buttons: {'Submit': this.submit_attendance}
                            });
                        }
                    }.bind(this)
                );
            }
        },
        render: function() {
            this.$el.html(this.template({}));
            return this;
        },
        submit_attendance: function () {
            var submitted_code = $('#attendance_form input').val();
            var attendance_item = require('Modules').get_module('attendance').items().where({status: 'active_visible'})[0];
            var correct = false;
            var attempts = 0;
            $.ajax({
                url: '/api/v2/attendance_response/' + attendance_item.get('id') + '/',
                type: 'PUT',
                contentType: 'application/json',
                data: '{"response": "' + submitted_code + '"}',
                dataType: 'json',
                success: function(result) {
                    correct = result.correct;
                    attempts = result.attempts;
                    if (correct) {
                        window.student_panel.set({
                            body: '<div id="attendance_form"><p>Your attendance has been recorded.<p></div>',
                            footer_buttons: {Close: 'remove'}
                        });
                        window.student_panel.$('.btn').focus();
                        Accessibility.SR_alert('Your attendance has been recorded. ');
                    }
                    else if (attempts >= 3) {
                        window.student_panel.set({
                            body: '<div id="attendance_form"><p><div class="failed_attendance_center"><div class="failed_attendance">You failed to enter the 4 digit code. Your attendance for this lecture has not been recorded.</div></div><p></div>',
                            footer_buttons: {Close: 'remove'}
                        });
                        window.student_panel.$('.btn').focus();
                        Accessibility.SR_alert('You failed to enter the 4 digit code. Your attendance for this lecture has not been recorded. ');
                    }
                    else {
                        $('#attendance_form .submission_answer .submission_msg').text('Code was incorrect. Attempts remaining: ' + (3 - attempts));
                    }
                }.bind(this),
                error: function(result) {
                    if (result.status === 401) {
                        // This student is not authorized to send attendance responses
                        if (result.responseText.search('clicker')) {
                            $('#attendance_form .submission_answer .submission_msg').text(result.responseText);
                        } else {
                            $('#attendance_form .submission_answer .submission_msg').text('You are not authorized to submit an attendance response.</div></div>');
                        }
                    }
                }.bind(this)
            });
        }
    });
    return StudentAttendanceView;
});
