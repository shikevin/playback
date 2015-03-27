/*global define, window*/
define([
    // 'underscore',
    // 'backbone',
    'text!templates/invite/enter_emails.html',
    'collections/Invites',
    'models/invite/BulkInvite'
], function (html, InviteCollection, BulkInvite) {
    "use strict";
    //unrequire
    var InviteAddView = Backbone.View.extend({
        className: "enter_emails",
        template: _.template(html),
        events: {
            'click #save_roster' : 'save',
            'keyup .invite_input': 'update_counts',
            'keyup .studentid_input': 'update_counts',
            'click .cancel': 'cancel',
            'click .add_studentids': 'show_studentid_field',
            'click .no_studentids': "hide_studentid_field"
        },
        email_regex : "[\\w\\-\\.\\+]+@[a-zA-Z0-9\\.\\-]+\\.[a-zA-z0-9]{2,4}",
        reset: function () {
            this.$("textarea").val("");
            this.update_counts();
        },
        initialize: function (options) {
            this.options = options || {};
            this.num_students = 0;
            this.boot_now();
        },
        boot_now: function () {
            if (!window.course.get("course_data")) {
                this.listenTo(window.course, "change:course_data", this.boot_now, this);
                return;
            }
            this.stopListening(window.course, "change:course_data", this.boot_now, this);
            this.render();
            this.listenTo(window.course, 'change:actual_students_enrolled', this.update_counts, this);
            this.listenTo(window.course, 'change:num_invites', this.update_counts, this);
            this.update_counts();
        },
        remove: function () {
            Backbone.View.prototype.remove.apply(this, arguments);

        },
        render: function () {
            this.$el.html(this.template());

            this.$(".studentid_input").hide().css("width", "50%");
            this.hide_studentid_field();
            this.studentid_mode = false;
            this.delegateEvents();
        },
        show_studentid_field: function () {

            this.studentid_mode = true;
            this.update_counts();

            // Internal UI
            this.$(".no_studentids, .studentid_label").show();
            this.$(".add_studentids").hide();
            this.$(".invite_input, .highlightTextarea").animate({
                width: '50%'
            }, 400, "swing", function () {
                this.$(".studentid_input").show().animate({
                    width: '49%'
                });
            }.bind(this));
        },
        hide_studentid_field: function () {
            this.studentid_mode = false;
            this.update_counts();

            // Internal UI
            this.$(".no_studentids, .studentid_label").hide();
            this.$(".add_studentids").show();
            this.$(".studentid_input").animate({
                width: "0px"
            }, 400, 'swing', function () {
                this.$(".studentid_input").hide();
                this.$(".invite_input, .highlightTextarea").animate({
                    width: '100%'
                });
            }.bind(this));
        },
        update_with_course_data: function () {
            this.update_counts();
        },
        update_counts: function () {
            this.num_students = window.course.get("actual_students_enrolled");
            this.num_invites = window.course.get('num_invites');
            var entered_emails = this.get_textbox_emails().length,
                entered_studentids = this.get_studentids().length,
                is_freemium = window.user.get("freemium");

            this.$(".num_students").html(this.num_students);
            this.$(".spaces_left").html(30 - this.num_students);
            this.$(".pending_invites").html(this.num_invites);
            this.$(".entered_emails").html(entered_emails);

            this.$(".mismatched_counts").toggle(
                this.studentid_mode && entered_emails !== entered_studentids
            );

            this.$(".class_full").toggle(this.num_students >= 30 && is_freemium);

            this.$(".too_many_students").toggle(this.num_students + this.num_invites + entered_emails > 30 && is_freemium);
        },
        get_textbox_emails: function () {
            var input_text, replace_regex, parsed_emails;

            input_text = $.trim(this.$el.find(".invite_input").val());
            //Entered string of emails are split by any of the characters in the regex group
            //in this case comma, semicolon or space. This is a temporary solution.
            replace_regex = new RegExp("[,;\\s]+");
            parsed_emails = input_text.split(replace_regex);
            // If there is a space at the end, the split array ends with an empty string
            //   This is a fix for that
            if (parsed_emails[parsed_emails.length - 1] === "") {
                parsed_emails.pop();
            }
            return parsed_emails;
        },
        get_studentids: function () {
            var input_text = $.trim(this.$el.find(".studentid_input").val()),
                replace_regex = new RegExp("[,\\s]+"),
                parsed_studentids = input_text.split(replace_regex);
            if (parsed_studentids[parsed_studentids.length - 1] === "") {
                parsed_studentids.pop();
            }
            return parsed_studentids;
        },
        cancel: function () {
            this.trigger("pending");
        },
        save: function () {
            var parsed_emails = this.get_textbox_emails(),
                parsed_studentids = this.get_studentids(),
                that = this;
            if (parsed_emails.length === 0) {
                this.trigger('pending');
                return;
            }
            Daedalus.track('SM - Prof added students', {
                includedStudentIds: this.studentid_mode,
                numberAdded: parsed_emails.length,
                isFreemium: window.user.get("freemium")
            });
            Daedalus.set_property('hasAddedStudents', true);

            var save_arr = _.map(
                parsed_emails,
                function (email, index) {
                    var new_invitation;

                    new_invitation = {
                        email: email
                    };

                    if (that.studentid_mode) {
                        if (parsed_studentids[index]) {
                            new_invitation.student_id = parsed_studentids[index];
                        }
                    }

                    return new_invitation;
                },
                this
            );

            var bulk = new BulkInvite({
                student_list: JSON.stringify(save_arr),
                course: window.course.get('course_data').get('resource_uri')
            });

            var bulk_save = bulk.save();
            bulk_save.done(function () {
                this.options.bulk = bulk;
                this.trigger('saved');
            }.bind(this));
        }
    });

    return InviteAddView;
});
