/*globals Backbone*/
define(['models/invite/StudentMembership'], function (StudentMembership) {
    'use strict';
    var StudentMemberships = Backbone.Collection.extend({
        model: StudentMembership,
        urlRoot: '/api/v2/student_membership/',
        idAttribute: 'resource_uri'
    });
    return StudentMemberships;
});