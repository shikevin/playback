/* global define, Backbone*/
define([
    'models/Notification2'
], function (Notification2) {
    'use strict';

    var NotificationResponses = Backbone.Collection.extend({
        urlRoot: '/api/v2/notifications2/',
        model: Notification2
    });

    return NotificationResponses;
});
