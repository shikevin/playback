/*global define*/
define([], function () {
    'use strict';
    var SchedulerModel = Backbone.Model.extend({
        urlRoot: "/api/v2/invite_scheduler/",
        idAttribute: "resource_uri"
    });
    return SchedulerModel;
});
