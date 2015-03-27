define([], function () {
    'use strict';
    var InviteMessage = Backbone.Model.extend({
        urlRoot: "/api/v2/invite_messages/",
        idAttribute: "resource_uri"
    });
    return InviteMessage;
});