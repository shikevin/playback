/* global Backbone */
define([
    'views/NotificationView'
], function (NotificationView) {
    'use strict';

    var NotificationListView = Backbone.Marionette.CollectionView.extend({
        itemView: NotificationView,

        initialize: function (options) {
            this.options = options || {};
        },

        /**
         * After an item is added to the notification centre collection..
         * @return {undefined} undefined
         */
        onAfterItemAdded: function () {
            $('#region-navbar').addClass('nps-active');
            $('#wrapper, #region-content').addClass('nps-active');
        },

        /**
         * Add these properties to every object in the collection
         * under the 'options' property.
         *
         * @return {Object} object of properties to be added to options
         */
        itemViewOptions: function () {
            return {
                ncentrenotifs: this.options.ncentrenotifs
            };
        },

        /**
         * When an item is removed from the notification centre collection...
         * @return {undefined} undefined
         */
        onItemRemoved: function () {
            if (this.collection.size() === 0) {
                if (window.is_mobile) {
                    $('.nps-notifs').hide();
                } else {
                    $('#region-navbar').removeClass('nps-active');
                }
            }
        }
    });

    return NotificationListView;

});
