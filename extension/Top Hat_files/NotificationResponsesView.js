/* global _, Backbone */
define([
    'views/NotificationResponseView',
    'text!templates/empty_notification_responses.html',
    'util/accessibility'
], function(
    NotificationResponseView,
    html,
    Accessibility
) {
    'use strict';

    var NoNotificationResponsesView = Backbone.Marionette.ItemView.extend({
        template: _.template(html)
    });

    var NotificationResponsesView = Backbone.Marionette.CollectionView.extend({
        itemView: NotificationResponseView,
        emptyView: NoNotificationResponsesView,
        initialize: function (options) {
            this.options = options || {};
        },
        onAfterItemAdded: function() {
            this.update_notifcount();
        },
        onItemRemoved: function() {
            this.update_notifcount();
        },
        itemViewOptions: function() {
            return {
                notifications2: this.options.notifications2
            };
        },
        update_notifcount: function() {
            var count = this.collection.size();
            var $notif_count = $('.notifcount');
            if (count !== 0) {
                $notif_count.html(count);
                $notif_count.show();
                Accessibility.SR_alert('New Notification');
            } else {
                $notif_count.hide();
                $notif_count.html(count);
            }
        }
    });

    return NotificationResponsesView;
});
