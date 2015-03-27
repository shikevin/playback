/* global Backbone */
define([
    'text!templates/invite/no_student_dialog.html',
    'course/NavUtils',
    'models/UserSettings'
], function (
    html,
    NavUtils,
    UserSettings
) {
    'use strict';

    var NoStudentPrompt = Backbone.View.extend({
        // Default required attributes: targetEl and course
        className: "no_students",
        template: _.template(html),
        events: {
            "click #invite_btn": "load_inviter",
            'click .close_notification': 'destroy'
        },
        initialize: function (options) {
            this.options = options || {};
            this.render();

            this.dialog = $(this.options.targetEl).qtip({
                content:  this.$el,
                position: {
                    viewport: $(window),
                    my: "bottom center",
                    at: "top center"
                },
                show: {
                    ready: true // This makes it actually appear
                },
                hide: false,
                style: {
                    classes: 'tooltip-light no-students-tooltip',
                    tip: {
                        height: 10,
                        width: 20,
                        border: 1
                    }
                }
            });
        },
        destroy: function () {
            UserSettings.set({
                'closed_invite_prompt': true
            });

            this.dialog.qtip('destroy', true);

            this.remove();
        },
        render: function () {
            this.$el.html(this.template());
        },
        load_inviter : function (e) {
            e.preventDefault();
            NavUtils.show_students();
            this.trigger("open_invite");
        }
    });
    return NoStudentPrompt;
});