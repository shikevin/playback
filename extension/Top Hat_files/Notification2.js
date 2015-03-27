/* global Backbone */
define([
    'models/NotificationResponse'
], function (NotificationResponse) {
    'use strict';

    var Notification2 = Backbone.Model.extend({
        urlRoot: '/api/v2/notifications2/',
        url: function() {
            return this.id ? this.urlRoot + this.id + '/' : this.urlRoot;
        },
        defaults: {
            content: null
        },
        respond: function(options, callback) {
            options = options || {};
            var response_int = options.response_int;
            var responded = options.responded || false;
            var response;
            var response_id = this.get('response_id');

            if(response_id) {
                response = new NotificationResponse();
                response.id = response_id;  // User has existing response. Set response ID to trigger update.
                response.save({ responded: responded, response_int: response_int }, { patch: true, success: function(model, response, options) {
                    if (callback) {
                        callback(model);
                    }
                }});
            }
            else {
                response = new NotificationResponse({ notificationid: this.get('id'), responded: responded, response_int: response_int });
                response.save({}, {success: function(model, response, options) {
                    if (callback) {
                        callback(model);
                    }
                }});
            }
        }
    });

    return Notification2;
});
