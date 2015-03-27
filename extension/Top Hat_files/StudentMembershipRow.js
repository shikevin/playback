/* global _, Backbone, panels */
define([
    'text!templates/invite/membership_row.html',
    'models/StudentId',
    'layouts/edumacation/LayoutCollection'
], function (
    html,
    StudentIdModel,
    layouts
) {
    'use strict';
    var StudentMembershipRowView = Backbone.StatefulView.extend({
        className: "student_membership",
        tagName: "tr",
        template: _.template(html),
        initialize: function (options) {
            this.options = options || {};
            this.listenTo(this.model, 'change', this.render);
            this.listenTo(this.model, "selected", this.set_selected, this);
            this.listenTo(this.model, "deselected", this.set_deselected, this);
            this.listenTo(this.model, 'edit', this.edit, this);
            this.listenTo(this.model, 'hide_confirm', this.hide_confirm, this);
            this.listenTo(this.model, 'cancel', this.cancel, this);
            this.listenTo(this, 'cancel', this.cancel);
            this.listenTo(this.model, 'save', this.save, this);
            this.listenTo(this.model, 'hide_controls_space', this.hide_controls_space, this);
            this.listenTo(this.model, 'show_controls_space', this.show_controls_space, this);
            this.show_space = this.options.show_space;
            this.show_confirm = this.options.show_confirm;
            this.listenTo(this.model, 'non_editable', this.non_editable);
        },
        states: {
            init: {},
            non_editable: {
                enter: ['hide_edit']
            },
            editable: {
                enter: ['show_edit']
            }
        },
        transitions: {
            init: {
                non_editable: 'non_editable'
            },
            non_editable: {
                non_editable: 'non_editable',
                editable: 'editable'
            },
            editable: {
                editable: 'editable',
                non_editable: 'non_editable'
            }
        },
        non_editable: function() {
            this.trigger('non_editable');
        },
        hide_edit: function() {
            this.$('.edit').hide();
            this.$('.save_controls_item').hide();
            // this.$('.save_controls_space').hide();
            this.$('.student_id').show();
            if (this.show_space) {
                this.$('.save_controls_space').show();
            } else {
                this.$('.save_controls_space').hide();
            }
            this.model.trigger('deselected', this.model);
            this.trigger('edit_hide_state');
            this.trigger('check_edit_state');
        },
        show_edit: function() {
            this.$('.edit').show();
            this.$('.save_controls_item').show();
            this.$('.student_id').hide();
            this.$('.save_controls_space').hide();
            this.show_space = true;
        },
        show_controls_space: function() {
            this.$('.save_controls_space').show();
            this.show_space = true;
        },
        hide_controls_space: function() {
            this.$('.save_controls_space').hide();
            this.show_space = false;
        },
        hide_confirm: function() {
            this.show_confirm = false;
        },
        events: {
            'click .save': 'save_confirm',
            'click .cancel': 'cancel',
            'change .new_student_id': 'pending_id_change'
        },
        render: function () {
            var this_email = this.model.get("student").email,
                was_invited = this.model.get('invited'),
                username = this.model.get('student').username,
                first_name = this.model.get('student').first_name,
                last_name = this.model.get('student').last_name,
                student_id = this.model.get('student').student_id,
                user_id = this.model.get('student').id,
                edit_text = (this.options.pending_id == '' ? student_id : this.options.pending_id),
                online = this.model.get('student').online && this.model.get('student').current_course == window.course.get('course_data').get('public_code');

            this.$el.html(this.template({
                email: this_email,
                invited: was_invited,
                username: username,
                first_name: first_name,
                last_name: last_name,
                student_id: student_id,
                user_id: user_id,
                edit_text: edit_text,
                online: online
            }));

            this.$(".selectrow").click(function () {
                // This may seem strange, but this behavior might have to become more complex in the future
                if (this.$(".selectrow").is(":checked")) {
                    this.model.trigger("selected", this.model);
                } else {
                    this.model.trigger("deselected", this.model);
                }

            }.bind(this));

            this.currentState = this.options.init_state;
            if (this.currentState === 'init') {
                this.trigger('non_editable');
            } else {
                this.trigger(this.currentState);
            }

            _.defer(function () {
                this.$('.new_student_id').attr('tabindex', this.options.index + 1);
            }.bind(this));
        },
        set_selected: function () {
            this.$(".selectrow").attr("checked", "checked");
        },
        set_deselected: function () {
            this.$(".selectrow").removeAttr("checked");
        },
        edit: function () {
            this.trigger('editable');
        },
        pending_id_change: function () {
            var text = this.$('.new_student_id').val();
            this.trigger('pending_id_change', text);
        },
        save: function () {
            if ($('#show_again_check').is(':checked')) {
                this.trigger('hide_confirm');
            }

            $('#confirm_panel').remove();
            this.trigger('non_editable');


            var student = new StudentIdModel();
            student.set({
                resource_uri: this.model.get('student').student_resource
            });

            var new_data = {
                student_id: this.$('.new_student_id').val()
            };

            student.save(new_data, {
                patch: true
            });
        },
        save_confirm: function () {
            var new_student_id = this.$('.new_student_id').val();
            if (new_student_id == this.model.get('student').student_id) {
                this.trigger('cancel');
                return;
            }
            if (this.show_confirm) {
                var that = this;
                var body = '<p>Changing a student\'s ID overrides the ID for all courses this student is enrolled in. (The student will be notified by email)</p>' +
                    '<br/>' +
                    '<label><input id="show_again_check" type="checkbox"> Do not show again while I\'m on this page</label>';
                var confirm_panel = panels.add({
                    id: 'confirm_panel',
                    title: 'WARNING',
                    layout: layouts.get('dialog'),
                    body: body,
                    footer_buttons: {
                        'Confirm': function () {
                            that.save();
                        },
                        'Cancel': 'remove'
                    }
                });
            } else {
                this.save();
            }
        },
        cancel: function () {
            this.$('.new_student_id').val(this.model.get('student').student_id);
            this.trigger('non_editable');
        }
    });
    return StudentMembershipRowView;
});
