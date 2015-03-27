/* global Backbone, Daedalus, _, panels, publisher, course */
define([
    'text!templates/lobby/footer.html',
    'layouts/edumacation/LayoutCollection',
    'Modules'
], function (
    footer_html,
    layouts,
    Modules
) {
    'use strict';

    var FooterView = Backbone.View.extend({
        template: _.template(footer_html),

        initialize: function(){
            // track desktop visits
            Daedalus.identify(window.user_data);
            Daedalus.track('using desktop site');
            Daedalus.increment('desktopOpens');
            Daedalus.set_property('lastDesktopLogin', new Date());
            this.listenTo(
                window.course,
                'change:num_online change:num_enrolled change:num_students',
                this.render_elements,
                this
            );
        },
        render: function() {
            this.$el.append(this.template(window.user.toJSON()));

            this.render_elements();
            this.bind_elements();
            this.bind_support_button();
            this.bind_student_list();
            this.bind_help();
            this.bind_course_info();

            if (window.location.pathname === '/e/') {
                $('#footer .right:not(.ignore)').toggle(false);
            }
        },

        bind_student_list: function() {
            if(window.site_data.settings.user_role === 'teacher') {
                $('.students_online', this.el).bind('click', function() {
                    // Pass the click through to the student manager tab
                    $('#region-navbar .action-students').click();

                    //course.show_student_list();
                    Daedalus.track( 'opens student list' );
                }).css({ cursor: 'pointer' });
            }
        },
        bind_support_button: function() {
            // legacy code
            $('.support a', this.el).unbind('click').bind('click', function(e){
                e.preventDefault();
                Daedalus.track( 'clicks support button' );
                Daedalus.increment('clickedSupportButton');
                var data = require('text!templates/publisher/thm_feedback_form.html');

                var ok_func = function() {
                    var module_dialog = panels.find_el('dialog', 'publisher', 'thm_feedback_dialog');
                    var msg = $.trim(module_dialog.find('textarea').val());
                    if (msg === '') {
                        panels.add({
                            id: 'support_empty_error',
                            module: 'publisher',
                            layout: layouts.get('dialog'),
                            title: 'Support request',
                            body: '<p>You may not submit empty support requests.</p>',
                            width: 300,
                            footer_buttons: {
                                'Close': 'remove'
                            }
                        });
                        return;
                    }

                    publisher.post( 'publisher', 'record_thm_feedback', '',
                            { feedback_msg : module_dialog.find('textarea').val() },
                            function () {
                                publisher.create_message_dialog_box_command( 'publisher', 'thm_feedback_succesfully_received',
                                                                'Support Request Sent',
                                                                '<div class="thm_panel_content_title">Thank you very much for taking the time to help us improve the product!</div>');
                            });

                    module_dialog.remove();
                    publisher.track_analytics_event('System', 'Support', 'Support message sent');
                    Daedalus.track( 'opens support ticket' );
                };

                var close_func = function() {
                    var module_dialog = panels.find_el('dialog', 'publisher', 'thm_feedback_dialog');

                    module_dialog.remove();
                    publisher.track_analytics_event('System', 'Support', 'Support panel closed');
                };

                var args = { 'width':550, 'title':'Support request','color':'blue', 'minimize':false,
                         'footer_style':'max', 'buttons':{'Submit': ok_func, 'Cancel': close_func} };

                //create dialog
                publisher.create_dialog_box_command( 'publisher', undefined, 'dialog', 'thm_feedback_dialog', data, '0', args );

                publisher.track_analytics_event('System', 'Support', 'Support button clicked');

                return false;
            });
        },
        render_elements: function() {
            // Hide appropriate elements from students
            if (window.user.get('role') !== 'teacher') {
                this.$el.find('.students_online').hide();
                this.$el.find('.course-info').hide();
            }
            // Update the 'Number Online' value
            var num_online = window.course.get('num_online');
            var num_students = window.course.get('num_students');
            var pct = 0;
            if ((!num_students && num_online > 1) || (num_online > num_students)) {
                pct = 100;
            } else {
                pct = num_students && num_online ? Math.floor(num_online * 100 / num_students) : 0;
            }
            pct = Math.min(100, pct);

            this.$el.find('.students_online span.profile').html(pct + '%');
            this.$el.find('.students_online span.invitelist').html(num_online + '/' + num_students);

            // Update the Freemium Display
            this.$el.find('.freemium-limit .num_students').html(num_students);
        },

        bind_elements: function(){
            var handler = function(){
                this.$el.find('.students_online span').toggle();
            }.bind(this);

            this.$el.find('.students_online').hover(handler, handler);
        },

        bind_course_info: function(){
            this.$el.find('.course-info span').on('click', function(event){
                event.preventDefault();
                $('.attendance_miniview').hide();

                if (Modules.get_module('attendance').get('active')) {
                    if (Modules.get_module('attendance').get('control_panel').subview) {
                        Modules.get_module('attendance').get('control_panel').magnify();
                    }
                    else {
                        require('course/CourseInfo').show();
                    }
                }

                else {
                    require('course/CourseInfo').show();
                }
            });
        },

        bind_help: function(){
            this.$el.find('.help span').on('click', function(event){
                event.preventDefault();
                if(window.user.get('role') === 'teacher'){
                    // Set data for the WalkMe analytics tracker
                    if(window.WalkMeAPI){
                        window.WalkMeAPI.setAnalyticsCustomField(1, window.user_data.username);
                    }

                    window.WalkMePlayerAPI.toggleMenu();
                }
            });
        },

        update_freemium_display: function(){
            var num_students = course.get('num_students');
            var is_freemium = course.get('course_data').get('freemium');
            var max_users = course.get('course_data').get('max_free_users');
            if(is_freemium){
                this.$el.find('.freemium-limit span.num_students').html(num_students);
                this.$el.find('.freemium-limit span.student_limit').html(max_users);
                this.$el.find('.freemium-limit').show();
            } else {
                this.$el.find('.freemium-limit').hide();
            }
        }
    });
    return FooterView;
});
