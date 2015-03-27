/* global define, Backbone, Houdini, lms_onerror */
define([
    'views/lms/CanvasAuth',
    'views/lms/CanvasCourseSelect',
    'views/lms/CanvasSync'
], function (CanvasAuthView, CanvasCourseSelectView, CanvasSyncView) {
    'use strict';
    var Canvas = Backbone.View.extend({
        className: 'canvas_lms',
        initialize: function (options) {
            this.options = options || {};
            this.heard_authentication = false;
            this.heard_course_choice = false;
            this.login_button = null;
            this.course_select = null;
            Houdini.on('lms:authenticated', this.authenticated, this);
            Houdini.on('lms:error', lms_onerror);
        },
        render: function () {
            if (!this.options.authenticated && !this.heard_authentication) {
                this.show_login();
            } else if (!this.options.course_selected && !this.heard_course_choice) {
                if (this.login_button) {
                    this.login_button.remove();
                    this.login_button = null;
                }
                this.show_course_select();
            } else {
                this.show_sync_button();
            }
        },
        show_login: function () {
            this.login_button = new CanvasAuthView(this.options);
            this.login_button.render();
            this.$el.html(this.login_button.$el);
        },
        show_course_select: function () {
            this.course_select = new CanvasCourseSelectView(this.options);
            this.course_select.render();
            this.$el.html(this.course_select.$el);
            this.listenTo(this.course_select, 'course_selected', this.course_selected, this);
        },
        authenticated: function () {
            this.heard_authentication = true;
            this.render();
        },
        course_selected: function () {
            if (this.course_select) {
                this.course_select.remove();
            }
            this.show_sync_button();
        },
        remove: function () {
            Houdini.off('lms:authenticated', this.authenticated, this);
        },
        show_sync_button: function () {
            this.sync_view = new CanvasSyncView(this.options);
            this.sync_view.render();
            this.$el.html(this.sync_view.$el);
            this.listenTo(this.sync_view, 'select_different_course', this.show_course_select, this);
        }
    });
    return Canvas;
});
