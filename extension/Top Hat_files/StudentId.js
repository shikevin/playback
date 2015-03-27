define([], function () {
    'use strict';
    var StudentId = window.Backbone.Model.extend({
        idAttribute: 'resource_uri',
        urlRoot: '/api/v2/resources/student_id/'
    });
    return StudentId;
});
