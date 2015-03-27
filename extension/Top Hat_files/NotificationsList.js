/*globals define, Marionette, _*/
define([
    'text!templates/lobby/notification_item_redux.html'
], function (html) {
    'use strict';
    var NotificationItemView = Backbone.Marionette.ItemView.extend({
        template: _.template(html),
        className: 'notification_item clear section',
        initialize: function () {
            this.listenTo(this.model, 'aggregate', this.render, this);
        }
    });

    var NotificationListView = Backbone.Marionette.CollectionView.extend({
        itemView: NotificationItemView
    });

    return NotificationListView;
});