/*globals define, Backbone*/
define([], function () {
    'use strict';
    var Notification = Backbone.Model.extend({
        urlRoot: '/api/v1/notifications/',
        idAttribute: 'resource_uri'
    });
    return Notification;
});
