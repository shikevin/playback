/*globals define, _*/
define([
    // 'backbone'
], function () {
    'use strict';
    // hack until the lobby uses requirejs fully
    if (typeof window.Backbone === 'undefined') {
        Backbone = require('backbone');
    } else {
        Backbone = window.Backbone;
    }
    var CourseMembership = Backbone.Model.extend({
        idAttribute: 'resource_uri',
        urlRoot: '/api/v2/course_memberships/',
        defaults: {
            course: null
        },
        toJSON: function () {
            var attrs = _.clone(this.attributes);
            if (_.isObject(attrs.course)) {
                attrs.course = attrs.course.get('resource_uri');
            }
            return attrs;
        },
        validation: {
            course: {
                required: true
            }
        }
    });
    return CourseMembership;
});
