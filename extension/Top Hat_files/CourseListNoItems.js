/*global define, Backbone, _ */
define([
    'text!templates/lobby/course_list_no_items.html'
], function (html) {
    'use strict';

    var CourseListNoItemsView = Backbone.View.extend({
        template: _.template(html),
        render: function () {
            this.$el.html(this.template());
        }
    });

    return CourseListNoItemsView;
});