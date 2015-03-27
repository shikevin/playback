/*global define, Backbone */
define([
    'models/inst_admin/Announcement'
], function (Announcement) {
    'use strict';

    var Announcements = Backbone.Collection.extend({
        urlRoot: '/api/v2/announcements/',
        model: Announcement
    });

    return Announcements;
});