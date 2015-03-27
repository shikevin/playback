/*global window, define, Backbone, _, $*/
define([
    'text!templates/invite/invite.html',
    'views/invite/Home',
    'views/invite/Pending',
    'views/invite/AddFlow'
], function (
    html,
    InviteHomeView,
    PendingInviteView,
    InviteAddFlowView
) {
    'use strict';
    function proxy(from, to) {
        to.listenTo(from, "all", function () {
            to.trigger.apply(to, arguments);
        }, to);
    }

    //unrequire
    var InviteView = Backbone.StatefulView.extend({
        className: "invite",
        states: {
            home: {enter: ["enter_home"]},
            add: {enter: ["enter_add"]},
            pending: {enter: ["enter_pending"]}
        },
        transitions: {
            "init" : {
                home: "home",
                add: "add",
                no_students: "add",
                pending: 'pending'
            },
            "home" : {
                add : "add",
                no_students: "add",
                pending: "pending"
            },
            pending: {
                add: "add",
                home: "home"
            },
            add: {
                add: "add",
                home: "home",
                pending: 'pending'
            }
        },
        events: {
            'click li#invite': 'trigger_add',
            'click li#pending': 'trigger_pending',
            'click li#enrolled': 'trigger_home'
        },
        template: _.template(html),
        initialize: function () {
            this.current_add_view = null;
            this.homeview = new InviteHomeView();
            this.pendingview = new PendingInviteView();
            this.addview = {
                "$el": $("<div class='add_view_wrapper'></div>")
            };
            this.listenTo(window.course, "change:available", this.availiability_warning, this);
            proxy(this.homeview, this);
            proxy(this.pendingview, this);
        },
        availiability_warning: function () {
            if (!window.course) {
                return;
            }

            this.$(".unavailable_course_warning").toggle(!window.course.get("available"));
        },
        render : function () {
            this.$el.html(this.template());
            this.pendingview.render();
            this.homeview.render();

            this.$("#body")
                .append(this.homeview.$el)
                .append(this.addview.$el)
                .append(this.pendingview.$el);
            this.availiability_warning();

            this.$('.make_course_available').click(this.make_course_available.bind(this));

            this.trigger("home");
        },
        make_course_available: function (e) {
            e.preventDefault();
            require('Modules').get_module('course').save_available(true);
        },
        hide_all_but: function (view_to_show) {
            _.each({
                "home": this.homeview,
                "add": this.addview,
                "pendingview": this.pendingview
            }, function (view, viewname) {

                if (viewname === view_to_show) {

                    view.$el.show();
                } else {
                    view.$el.hide();
                }
            });
        },
        trigger_add: function () {
            Daedalus.track('SM - Prof clicked invite');
            this.trigger("add");
        },
        trigger_home: function () {
            this.trigger("home");
        },
        trigger_pending: function () {
            this.trigger("pending");
        },
        enter_home: function () {
            this.hide_all_but("home");
            this.$el.find('li.active').removeClass('active');
            this.$el.find('li#enrolled').addClass('active');
        },
        enter_add: function () {
            if (this.current_add_view !== null && this.current_add_view.can_reset === true) {
                this.stopListening(this.current_add_view);
                this.current_add_view.remove();
                this.current_add_view = null;
            }
            if (this.current_add_view === null) {
                this.current_add_view = new InviteAddFlowView();
                this.listenTo(this.current_add_view, "pending", this.trigger_pending, this);
                this.addview.$el.append(this.current_add_view.$el);
            }


            this.hide_all_but("add");
            this.$el.find('li.active').removeClass('active');
            this.$el.find('li#invite').addClass('active');
        },
        enter_pending: function () {
            this.hide_all_but("pendingview");
            this.$el.find('li.active').removeClass('active');
            this.$el.find('li#pending').addClass('active');
        },
        remove: function () {
            this.homeview.remove();
            this.pendingview.remove();
            if (this.current_add_view !== null) {
                this.current_add_view.remove();
            }
            Backbone.StatefulView.prototype.remove.apply(this, arguments);
        }
    });

    return InviteView;
});
