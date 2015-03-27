define([
    'text!templates/invite/pending_row.html',
    'models/invite/InviteMessage'
], function (html, InviteMessageModel) {
    "use strict";

    function liveAttributes(attrArr, scope) {
        // All this does is bind "change:attrname" to call render__attrname() on a view
        //   for every attr in the attrArr array
        if (!scope) {
            return;
            // scope = this;
        }
        _.each(attrArr, function (attr) {
            if (typeof scope["render__" + attr] === typeof function () {}) {
                scope.listenTo(scope.model, "change:" + attr, scope["render__" + attr], scope);
                scope["render__" + attr]();
            }
        });
    }

    var PendingInviteRowView = Backbone.StatefulView.extend({
        className: "pending_entry",
        tagName: 'tr',
        events: {
            "click .once-and-for-all": "hide_removed_row",
            // For Daedalus
            'click .action-column .resend': 'resend_clicked'
        },
        template: _.template(html),
        states: {
            init: {},
            display: {enter: ["display", 'set_action_column']},
            delete_confirm: {enter: ["delete_confirm", 'set_action_column']},
            edit: { enter: ["edit", 'set_action_column']},
            saving: {enter: ["saving", 'set_action_column']},
            edit_error: { enter: ["edit_error", 'set_action_column']},
            sending: { enter: ["sending", 'set_action_column']},
            sent: { enter: ["sent", 'set_action_column']},
            removing: {enter: ["removing", 'set_action_column']},
            removed: {enter: ["removed", 'set_action_column']},
            invalid_email: {enter: ["invalid_email", 'set_action_column']},
            message_too_soon: {enter: ["message_too_soon", 'set_action_column']}
        },
        transitions: {
            init: {
                display: "display"
            },
            display: {
                display: 'display',
                edit: "edit",
                "click .action-column .fix": "edit",
                "click .action-column .remove": "removing",
                'sending': 'sending'
            },
            edit: {
                'edit': 'edit',
                "click .edit .save": "saving",
                "click .edit .cancel": "display"
            },
            saving: {
                display: 'display',
                edit_error: "edit_error",
                sending: "sending",
                invalid_email: "invalid_email"
            },
            edit_error: {
                "click .edit_error .edit": "edit",
                "click .edit_error .cancel": "display"
            },
            invalid_email: {
                'invalid_email': 'invalid_email',
                "click .invalid_email .edit": "edit",
                "click .invalid_email .delete": "removing",
                "click .invalid_email .cancel": "display"
            },
            sending: {
                sent: "sent",
                message_too_soon: "message_too_soon"
            },
            message_too_soon: {
                message_too_soon: 'message_too_soon',
                "click .message_too_soon .cancel": "display"
            },
            sent: {
                'sent': 'sent',
                "click .sent .ok": "display"
            },
            removing: {
                "removed": "removed"
            }
        },
        initialize: function () {
            this.superinvalid = false;
        },
        render: function () {
            // Just in case
            if (this.model.get("deleted")) {
                this.$el.hide();
                return;
            }

            this.$el.html(this.template());
            liveAttributes([
                "email",
                "invite_last_sent",
                "messages_sent",
                "active",
                "message_queued",
                "student_id"
            ], this);

            this.$(".selectrow").click(function () {
                if (this.$(".selectrow").is(":checked")) {
                    this.model.trigger("selected", this.model);
                } else {
                    this.model.trigger("deselected", this.model);
                }
            }.bind(this));
            this.listenTo(this.model, 'change', this.set_action_column, this);
            this.listenTo(this.model, "selected", this.set_selected, this);
            this.listenTo(this.model, "deselected", this.set_deselected, this);
            this.listenTo(window.course, "change:available", this.set_action_column, this);
            this.listenTo(this.model, "edit", function () {
                this.trigger("edit");
            }.bind(this));
            if (this.currentState === 'init') {
                this.trigger('display');
            } else {
                this.trigger(this.currentState);
            }
        },
        set_selected: function () {
            this.$(".selectrow").attr("checked", "checked");
        },
        set_deselected: function () {
            this.$(".selectrow").removeAttr("checked");
        },
        render__email: function () {
            var email = this.model.get("email");

            // This condition applies exclusively to migrated entries
            // rather haxy, can be deleted probably by 2014
            if (email.slice(0, 9) === 'no-reply+' && email.slice(-10) === 'tophat.com') {
                email = '-- No Email --';
                this.superinvalid = true;
            }

            this.$(".email-display").text(email);
            this.$(".email-mailto").attr("href",  "mailto:" + email);
            if (this.superinvalid || this.model.get('invalid')) {
                this.$(".email-mailto").removeAttr('href');
            }
            this.$(".new-email").val(email);
        },
        render__invite_last_sent: function () {

            var invite_last_sent = this.get_invite_last_sent();

            if (invite_last_sent !== null) {
                this.$(".invite_last_sent-display").text(invite_last_sent.format("MMM Do, ha"));
            } else {
                this.$(".invite_last_sent-display").text("");
            }
        },
        render__messages_sent: function () {
            var messages_sent = this.model.get("messages_sent");
            this.$(".messages_sent-display").text(messages_sent);
        },
        render__active: function () {
            var active = this.model.get("active");
            this.$(".active-display").text(active);
        },
        render__message_queued: function () {
            var queued = this.model.get("message_queued");
            var $in_el = this.$(".message_queued-display");
            $in_el.find(".sending").toggle(queued);
            $in_el.find(".not-sending").toggle(!queued);
            if (queued) {
                this.$(".action-column a.resend").hide();
            }
        },
        render__student_id: function () {
            var disp_student_id;
            if (this.model.get('student_id') === 0) {
                disp_student_id = 'none';
            } else {
                disp_student_id = this.model.get('student_id');
            }
            this.$(".student_id-display").html(disp_student_id);
        },
        get_invite_last_sent: function () {
            var last_sent = this.model.get('invite_last_sent');
            var parsed = moment(last_sent);
            return parsed;
        },
        set_action_column: function () {
            this.$el.toggleClass("invalid", this.model.get("invalid"));
            this.$el.toggleClass("rejected", this.model.get("rejected"));
            this.$(".action-column a").hide();

            this.$(".action-column a.remove").toggle(this.model.get("rejected"));

            this.$(".action-column a.fix").toggle(this.model.get("invalid") || this.superinvalid);

            this.$(".action-column a.resend").toggle(
                !this.superinvalid &&
                this.model.get("active") &&
                !this.model.get("message_queued") &&
                window.course.get('available')
            );

        },
        display_section: function (display_mode) {
            this.$("td").hide();
            this.$("td" + display_mode).show();
        },
        display: function () {
            this.display_section(".display");
        },
        delete_confirm: function () {

        },
        edit: function () {
            this.display_section(".edit");
        },
        saving: function () {
            var new_email, old_data, saving_state, new_data;
            this.display_section(".saving");
            new_email = this.$(".new-email").val();
            old_data = {
                email: this.model.get("email"),
                invite_last_sent: this.model.get("invite_last_sent"),
                messages_sent: this.model.get("messages_sent")
            };
            new_data = {
                email: new_email,
                invite_last_sent: null,
                messages_sent: 0
            };
            this.model.set(new_data);

            saving_state = this.model.save();

            saving_state.done(function () {
                if (this.model.get("invalid")) {
                    this.trigger("invalid_email");
                } else {
                    this.trigger("display");
                }
            }.bind(this));

            saving_state.fail(function () {
                this.model.set(old_data);

                this.trigger("edit_error");
            }.bind(this));
        },
        edit_error: function () {
            this.display_section(".edit_error");
        },
        invalid_email: function () {
            this.display_section(".invalid_email");
        },
        resend_clicked: function () {
            Daedalus.track('SM - Prof clicked quick resend');
            Daedalus.set_property('hasInvitedStudents', true);
            this.trigger('sending');
        },
        sending: function () {
            var message, saving;
            if (this.model.get("message_queued")) {
                this.trigger("sent");
                return;
            }

            this.display_section(".sending");

            message = new InviteMessageModel({
                invite: this.model.get("resource_uri")
            });
            saving = message.save();
            saving.done(function () {
                this.trigger("sent");
            }.bind(this));

            saving.fail(function (req, state, resp) {
                var resp_obj = JSON.parse(resp);
                if (resp_obj.too_soon) {
                    this.trigger("message_too_soon");
                }
            }.bind(this));
        },
        message_too_soon: function () {
            this.display_section(".message_too_soon");
        },
        sent: function () {
            this.model.set("message_queued", true);
            this.display_section(".sent");
        },
        removing: function () {
            this.display_section(".removing");
            this.model.set("deleted", true);
            var delete_act = this.model.save();
            delete_act.done(function () {
                //this.model.trigger("destroy");
                this.trigger("removed");
            }.bind(this));
        },
        removed: function () {
            this.display_section(".removed");
        },
        hide_removed_row: function () {
            // One way: this.model.trigger("destroy")
            this.$el.hide(); // another way
        }
    });
    return PendingInviteRowView;
});
