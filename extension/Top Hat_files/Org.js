/*globals define, Backbone*/
define([], function() {
    'use strict';
    var Org = Backbone.Model.extend({
        urlRoot: '/api/v1/org/',
        idAttribute: 'resource_uri',
        model: Org
    });
    return Org;
});

