/* global define, Backbone */
define([
    //'backbone',
    'views/AlertItem'
], function (AlertItemView) {
    'use strict';

    var AlertListView = Backbone.View.extend({
        tagName: 'div id="messages" role="alert" aria-live="assertive"',

        /**
         * Initialize this view.
         * Bind the render and renderItem callbacks to this collection.
         * @param  {Array} options
         */
        initialize: function(options) {
            // When alert is added to this collection, add AlertItemView to
            // items.
            this.items = {};
            this.collection.on('add remove reset sort destroy', this.render, this);
        },

        /**
         * Render this view.
         * @return {AlertListView} this
         */
        render: function () {

            if (this.collection.length > 0) {
                $('#layout').addClass('has-alerts');
            } else {
                $('#layout').removeClass('has-alerts');
            }

            this.$el.empty();
            this.collection.each(function (item) {
                this.renderItem(item);
            }.bind(this));
            
            return this;
        },

        /**
         * Append and render an `AlertItemView` to this view's $el.
         * @param  {Alert} item
         */
        renderItem: function(item) {
            // Get or instantiate Alert Item View.
            var alertItemView;
            if (this.items[item.cid] === undefined) {
                alertItemView = new AlertItemView({
                    model: item
                });
                this.items[item.cid] = alertItemView;
            } else {
                alertItemView = this.items[item.cid];
            }

            // Render Alert Item View and add to Alert List element.
            this.$el.append(alertItemView.render().$el);
        }
    });

    return AlertListView;
});
