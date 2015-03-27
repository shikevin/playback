/* global _, Backbone */
define([
], function (
) {
    'use strict';
    var Course = Backbone.Model.extend({
        urlRoot: '/api/v2/courses/',
        defaults: {
            course_name: null,
            orgname: null,
            org: null,
            prof_name: null,
            paid: true,
            enrolled: false
        },
        toJSON: function () {
            var attrs = this.attributes;
            if (_.isArray(attrs.profs)) {
                attrs.profs = _.reduce(attrs.profs, function (memo, prof) {
                    return memo === '' ? memo + prof.name : memo + ', ' + prof.name;
                }, '');
            }
            return attrs;
        },
        validation: {
            course_name: {
                required: true
            },
            org: {
                required: true
            }
        },
        public_url: function () {
            var public_code = this.get('public_code');
            if (public_code) {
                return '/e/' + public_code;
            } else {
                return null;
            }
        },
        course_id: function () {
            if (_.isUndefined(this.id)) {
                return null;
            }
            return this.id.split('/')[4];
        },
        subscription_url: function () {
            var public_code = this.get('public_code');
            if (public_code) {
                return '/buy/subscription/' + public_code;
            } else {
                return '/buy/subscription/';
            }
        },
        inventory_url: function () {
            var public_code = this.get('public_code');
            if (public_code) {
                return '/buy/checkout/' + public_code;
            } else {
                return '/buy/checkout/';
            }
        }
    });
    return Course;
});
