define([
    // 'backbone',
    'models/invite/ClassInvite'
], function (ClassInvite) {
    'use strict';
    var Invites = Backbone.Collection.extend({
        urlRoot: "/api/v2/invites/",
        model: ClassInvite
    });
    return Invites;
});