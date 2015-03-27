define(['models/pages/SubPage'], function (SubPage) {
    'use strict';
    var SubPages = Backbone.Collection.extend({
        model: SubPage,
        idAttribute: "resource_uri",
        urlRoot: '/api/v2/subpages/'
    });
    return SubPages;
});