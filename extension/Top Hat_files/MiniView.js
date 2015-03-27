/* global _, Backbone */
define([
    'text!templates/attendance/mini_view.html',
    'course/CourseInfo'
], function (
    html,
    CourseInfo
) {
    'use strict';
    var MiniView = Backbone.View.extend({
        className: 'attendance_miniview',
        template: _.template(html),
        initialize: function () {
            this.render();
            this.hide();
        },
        events: {
            'click .hide_attendance_mini_view': 'hide',
            'click .magnify_attendance_mini_view': 'magnify'
        },
        render: function () {
            $('#course_content').append(this.$el);
            this.$el.html(this.template(this.model.toJSON()));
        },
        show: function () {
            this.$el.show();
        },
        hide: function () {
            this.$el.hide();
        },
        magnify: function (dont_broadcast) {
            this.hide();

            CourseInfo.show(this, true);
            if (!dont_broadcast) {
                window.Houdini.broadcast('user.' + window.user.get('id'), 'show_course_info');
            }
        }
    });
    return MiniView;
});
