/* global Backbone */
define([
    'models/Course'
], function (Course) {
    'use strict';
    var Courses = Backbone.Collection.extend({
        urlRoot: '/api/v2/courses/',
        model: Course,
        comparator: 'course_name'
    });
    return Courses;
});