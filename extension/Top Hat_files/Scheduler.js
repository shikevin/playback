/* global Backbone */
define([
    'models/invite/Scheduler',
    'text!templates/invite/scheduler.html'
], function (
    SchedulerModel,
    html
) {
    "use strict";
    var SchedulerView, course;



    SchedulerView = Backbone.StatefulView.extend({
        className: "scheduler",
        states: {
            init: {},
            home: { enter: ["home"] },
            confirm: { enter: ["confirm"] },
            sending: { enter: ["sending"] },
            sent: { enter: ["sent"] }
        },
        transitions: {
            init: {
                home: "home"
            },
            home: {
                send: "confirm",
                "click .spam:not(.disabled)": "confirm"
            },
            confirm: {
                confirmed: "sent",
                cancel: "home",
                "click .spam-now": "sending",
                "click .cancel-spam": "home"
            },
            sending: {
                sent: "sent"
            },
            sent: {
                "click .back_home": "home"
            }
        },
        template: _.template(html),
        initialize: function () {
            this.scheduler = new SchedulerModel();
            this.listenTo(require('Modules').get_module('course'), 'change:available', this.change_available, this);
            this.scheduler_loaded = false;
        },
        load_scheduler_data: function () {
        },
        done_loading: function () {
            this.scheduler_loaded = true;
            this.trigger("home");
        },

        render: function () {
            this.toState("init");
            // TODO - AH set lms properly
            this.$el.html(this.template({lms: false}));
            this.$(".confirm, .sent, .sending, .display").hide();
            this.change_available();
            this.done_loading();
        },
        change_available: function () {
            if (!window.course) {
                return;
            }
            this.$(".spam").toggleClass('disabled', !window.course.get('available'));
        },
        home: function () {
            this.$(".confirm, .sent, .sending").hide();
            this.$(".display").show();
        },
        confirm: function () {
            this.$(".display ,.sent,.sending").hide();
            this.$(".confirm").show();
        },
        sending: function () {
            Daedalus.track('SM - Prof forced entire resend');
            Daedalus.set_property('hasInvitedStudents', true);
            var q, addr, message_sender;
            this.$(".display,.confirm,.sent").hide();
            this.$(".sending").show();
            addr = "/invite/sendmessages/";

            addr += require('Modules').get_module('course').get("course_data").get("id");
            message_sender = $.post(addr, q);
            message_sender.done(function () {
                this.trigger("sent");
            }.bind(this));

        },
        sent: function () {
            this.$(".display, .sending, .confirm").hide();
            this.$(".sent").show();
        }
    });

    return SchedulerView;
});
