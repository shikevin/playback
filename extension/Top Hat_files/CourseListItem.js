/* global _, Marionette */
define([
    'models/Course',
    'views/inst_admin/AnnouncementListCreateBtn',
    'util/accessibility',
    'text!templates/lobby/course_list_layout_item.html',
    'layouts/edumacation/LayoutCollection'
], function (
    Course,
    AnnouncementListCreateBtnView,
    Accessibility,
    html,
    layouts
) {
    'use strict';
    var CourseView = Backbone.Marionette.ItemView.extend({
        model: Course,
        events: {
            'click .disenroll_btn': 'disenroll',
            'keydown .disenroll_btn': 'keydown'
        },
        initialize: function() {
            var can_enter_course = false;
            if ((window.user.get('role') === 'student' && this.model.get('available')) ||
                (window.user.get('role') === 'teacher' && this.model.get('owned'))) {

                can_enter_course = true;
                // Add click event and callback.
                this.delegateEvents(_.extend(this.events, {'click .enter-course': 'navigate'}));
            }
            this.model.set('can_enter_course', can_enter_course);
        },
        onRender: function(){
            // Insert nested announcement create view.
            try {
                var regex = /^\/api\/v2\/courses\/(.*)\/$/;
                var course_id = regex.exec(this.model.get('resource_uri'))[1];
                if (this.model.get('available') === true) {
                    // If course is available and user has permission to add announcement, render announcement create button.
                    window.user.has_perm('add_announcement_course', {
                        permitted: function() {
                            var announcement_list_create_btn_view = new AnnouncementListCreateBtnView({
                                // Popover options.
                                popover: {
                                    placement: 'left'
                                },
                                // View specific options.
                                id: 'popover-course-' + course_id,
                                btn_text: '',
                                btn_classes: 'btn-default',
                                announcements_query_params: { 'course' : course_id },
                                course_resource_uri: this.model.get('resource_uri')
                            });
                            this.$('.course-actions').prepend(announcement_list_create_btn_view.el);
                            announcement_list_create_btn_view.render();
                        }.bind(this)
                    });
                }
            }
            catch (e) {
                // TODO stevo: Display alert.
            }
        },
        disenroll: function (e) {
            e.preventDefault();
            e.stopPropagation();
            var c = this.model, panel;

            var disenroll_user = function () {
                // destroy the membership
                // can't pass resource_uri because tastypie tries to parse it as an integer
                $.ajax({
                    url: '/api/v2/course_memberships/',
                    data: JSON.stringify({
                        course: c.get('resource_uri').split('/')[4]
                    }),
                    type: 'DELETE',
                    contentType: 'application/json'
                }).done(function () {
                    c.collection.remove(c);
                    panel.remove();
                    $('#btn-add-course').focus();
                    Accessibility.SR_alert('You left the course. ');
                }).fail(function () {
                    panel.set({
                        body: 'There was a problem removing the course.',
                        footer_buttons: {
                            'Close': 'remove'
                        }
                    });
                    Accessibility.SR_alert('There was a problem removing the course. ');
                });
            };

            panel = window.panels.add({
                id: 'disenroll_verify',
                module: 'publisher',
                layout: layouts.get('dialog'),
                title: 'Leave Course',
                body: $('<p>Are you sure you want to leave the course "' + this.model.get('course_name') + '"?</p>'),
                footer_buttons: {
                    'Yes': {
                        bt_class: 'affirmative',
                        callback: disenroll_user
                    },
                    'No': {
                        bt_class: 'danger',
                        callback: function () {
                            window.panels.remove('disenroll_verify');
                            this.$el.find('.disenroll_btn').focus();
                        }.bind(this)
                    }
                }
            });
        },
        navigate: function () {
            window.contentRouter.navigate(this.model.get('public_code'), {trigger: true});
        },
        keydown: function (e) {
            if (e.which === $.ui.keyCode.ENTER) {
                this.disenroll(e);
                e.stopPropagation();
            }
        },
        className: 'course-list-item',
        template: _.template(html)
    });
    return CourseView;
});
