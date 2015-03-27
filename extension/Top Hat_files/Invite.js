/* global _, Daedalus */
define([
    'modules/Module',
    'collections/Invites',
    'views/invite/NoStudentPrompt',
    'views/invite/Invite',
    'views/invite/PTInvite',
    'layouts/edumacation/LayoutCollection',
    'course/NavUtils',
    'util/Browser',
    'models/UserSettings'
], function (
    Module,
    InviteCollection,
    NoStudentPrompt,
    InviteView,
    PTInviteView,
    layouts,
    NavUtils,
    Browser,
    UserSettings
) {
    "use strict";

    var InviteModule = Module.extend({
        defaults: _.extend({}, Module.prototype.defaults, {
            id: "invite",
            title: "Student Manager",
            color: "green"
        }),
        initialize: function () {
            Module.prototype.initialize.call(this);
            this.invites_loaded = false;
            this.all_invites = new InviteCollection();
            this.all_invites.limit = 0;
            window.course.on("change:course_data", function () {
                this.update_invite_collection();

            }, this);
            if (window.course.get("course_data")) {
                this.update_invite_collection();
            }
        },
        update_invite_collection: function () {
            this.all_invites.course = window.course.get("course_data").get("id");
            this.all_invites.fetch();
        },
        course_opened: function () {
            //this.close_notification();
            window.course.on("change:num_students", function () {
                // user settings are weird...
                UserSettings.get(
                    {'closed_invite_prompt': 'closed_invite_prompt'},
                    function (result) {
                        if (result['closed_invite_prompt']) {
                            return;
                        }
                        if (
                            course.get("num_students") === 0
                            && window.user.get("role") === "teacher"
                            && course.get('num_enrolled') === 0
                            && this.all_invites.length === 0
                        ) {
                            this.dialog = new NoStudentPrompt({
                                targetEl: $("#footer .students_online")
                            });
                            this.listenTo(this.dialog, "open_invite", this.open_invite, this);
                    } else {
                        this.close_notification();
                    }
                }.bind(this), {'closed_invite_prompt': false});
            }, this);
        },
        course_closed: function () {
            this.close_notification();
        },
        close_notification: function () {
            if (this.dialog) {
                this.stopListening(this.dialog);
                this.dialog.destroy();
                this.dialog = null;
            }
        },
        open_invite: function () {
            Daedalus.set_property("hasOpenedSM", true);
            Daedalus.track("SM - Prof opened student manager");
            this.close_notification();
            var panel = window.panels.get("invite_panel");
            var panel_name = NavUtils.get_students_panel();
            if (!panel) {
                panel = window.panels.add({
                    id: "invite_panel",
                    module: "invite",
                    layout: layouts.get(panel_name),
                    title: this.defaults.title,
                    footer_buttons: {
                        "Close": "remove"
                    }
                });
            }
            if (Browser.is_presentation_tool()) {
                layouts.get(panel_name).focus('invite_panel');
            }
            if (this.view) {
                this.view.remove();
            }

            if (window.is_presentation_tool) {
                this.view = new PTInviteView();
                $(window).trigger("item_set_visible");
            } else {
                this.view = new InviteView();
            }

            this.view.render();

            panel.set({
                body: this.view.$el
            });

            if (window.course.get("num_students") === 0 && this.all_invites.length === 0) {
                this.view.trigger("add");
            } else {
                this.view.trigger("home");
            }
        }
    });
    return InviteModule;
});
