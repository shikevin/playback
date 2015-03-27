/*global Backbone */
define([], function () {
    'use strict';
    var ClassInvite = Backbone.Model.extend({
        urlRoot: "/api/v2/invites/",
        idAttribute: "resource_uri"
    });
    return ClassInvite;
});