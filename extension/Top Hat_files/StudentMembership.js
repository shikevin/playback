define([], function () {
    'use strict';
    var StudentMembership = Backbone.Model.extend({
        urlRoot: "/api/v2/student_membership/",
        idAttribute: "resource_uri"
    });
    return StudentMembership;
});