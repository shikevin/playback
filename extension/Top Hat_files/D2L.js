/* global define, Backbone, Houdini */
define([
    'views/lms/D2LAuth',
    'views/lms/D2LCourseSelect',
    'views/lms/D2LSyncView'
], function (D2LAuthView, D2LCourseSelectView, D2LSyncView) {
    'use strict';

    var D2L = Backbone.View.extend({
        initialize: function (options) {
            this.options = options || {};

            // State trackers
            this.authenticated = false;
            this.heard_course_choice = false;

            // Sub-views
            this.auth_view = null;
            this.course_select_view = null;
            this.sync_view = null;

            // Event listeners
            Houdini.on('lms:authenticated', this.d2l_authenticated, this);
        },
        render: function () {
            if (!this.authenticated) {
                return this.render_login();
            } else if (!this.options.d2l_settings && !this.heard_course_choice) {
                return this.render_course_select();
            } else {
                this.render_sync();
            }
        },
        render_login: function () {
            this.auth_view = new D2LAuthView(this.options);
            this.$el.html(this.auth_view.render());
            return this.$el;
        },
        render_course_select: function () {
            this.course_select_view = new D2LCourseSelectView(this.options);
            this.$el.html(this.course_select_view.render());
            this.listenToOnce(this.course_select_view, 'course_selected', this.course_selected_handler, this);
            return this.$el;
        },
        render_sync: function () {
            this.sync_view = new D2LSyncView(this.options);
            this.$el.html(this.sync_view.render());
            //this.listenTo(this.sync_view, 'select
        },
        d2l_authenticated: function () {
            this.authenticated = true;

            if (this.auth_view) {
                this.auth_view.remove();
            }

            this.render();
        },
        course_selected_handler: function () {
            if (this.course_select_view) {
                this.course_select_view.remove();
            }
            this.heard_course_choice = true;
            this.render();
        }
    });

    return D2L;
});
