/* global Backbone */
define([
], function () {
    'use strict';

    var Announcement = Backbone.Model.extend({
        urlRoot: '/api/v2/announcements/'
    });

    return Announcement;
});