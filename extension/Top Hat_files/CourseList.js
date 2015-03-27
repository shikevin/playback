/* global Marionette */
define([
    'views/lobby/CourseListNoItems',
    'views/lobby/CourseListItem'
], function (
    CourseListNoItemsView,
    CourseListItemView
) {
    'use strict';
    var CourseListView = Backbone.Marionette.CollectionView.extend({
        itemView: CourseListItemView,
        emptyView: CourseListNoItemsView
    });
    return CourseListView;
});