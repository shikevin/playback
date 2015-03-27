/* global Backbone */
define([
], function (
) {
    'use strict';
    var NotificationResponse = Backbone.Model.extend({
        urlRoot: '/api/v2/usernotifications/',
        url: function() {
            return this.id ? this.urlRoot + this.id + '/' : this.urlRoot;
        }
    });

    return NotificationResponse;
});
