/* global define, Backbone */

define([
    'views/lms/PearsonAuth',
    'views/lms/PearsonCourseSelect',
    'views/lms/PearsonSync'
], function (AuthView, CourseSelectView, SyncView) {
    'use strict';

    var Pearson = Backbone.View.extend({
        className: 'pearson_lms',
        initialize: function (options) {
            this.options = options || {};
            this.authenticated = this.options.authenticated;
            this.course_selected = this.options.course_selected;
        },
        render: function () {
            if (!this.authenticated) {
                this.render_login();
            } else if (!this.course_selected) {
                this.render_course_select();
            } else {
                this.render_sync();
            }
        },
        render_login: function () {
            this.auth_view = new AuthView(this.options);
            this.auth_view.render();
            this.$el.html(this.auth_view.$el);
            this.listenTo(this.auth_view, 'authenticated', this.logged_in, this);
        },
        logged_in: function () {
            this.auth_view.remove();
            this.authenticated = true;
            this.render();
        },
        render_course_select: function () {
            this.course_select_view = new CourseSelectView(this.options);
            this.course_select_view.render();
            this.$el.html(this.course_select_view.$el);
            this.listenTo(this.course_select_view, 'course_selected', this.course_select_fn, this);
        },
        course_select_fn: function () {
            this.course_select_view.remove();
            this.course_selected = true;
            this.render();
        },
        render_sync: function() {
            this.sync_view = new SyncView(this.options);
            this.sync_view.render();
            this.$el.html(this.sync_view.$el);
            this.listenTo(this.sync_view, 'sync_completed', this.sync_completed, this);
        },
        sync_completed: function () {
            this.sync_view.remove();
            this.trigger('sync_completed');
        }
    });
    return Pearson;
});