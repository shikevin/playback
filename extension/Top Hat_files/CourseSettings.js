/* global _, Backbone */
define([
], function (
) {
    'use strict';
    var CourseSettings = Backbone.RelationalModel.extend({
        idAttribute: 'resource_uri',
        urlRoot: '/api/v1/course_settings/'
    });

    _.extend(CourseSettings, {
        resource_uri_from_id: function (id) {
            return CourseSettings.prototype.urlRoot + id + '/';
        }
    });

    return CourseSettings;
});
