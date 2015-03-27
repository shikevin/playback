/*global define, Backbone */
define([
    'models/Alert'
], function (Alert) {
    'use strict';

    var Alerts = Backbone.Collection.extend({
        model: Alert,

        /**
         * Override the add function to remove all alerts in this collection
         * before adding an alert.
         * @param  {Alert} alert
         */
        add: function(alert) {
            if (this.length >= 1) {
                this.reset();
            }

            return Backbone.Collection.prototype.add.call(this, alert);
        }
    });
    return Alerts;
});
