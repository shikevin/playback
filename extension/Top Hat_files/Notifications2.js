/* global Backbone */
define([
    'models/Notification2'
], function (
    Notification2
) {
    'use strict';

    var Notifications2 = Backbone.Collection.extend({
        urlRoot: '/api/v2/notifications2/',

        model: Notification2,

        initialize: function () {
            this._attributes = {};
        },

        attr: function (prop, value) {
            if (value === undefined) {
                return this._attributes[prop];
            } else {
                this._attributes[prop] = value;
            }
        }
    });

    return Notifications2;
});
