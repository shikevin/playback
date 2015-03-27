/* global Backbone */
define([
], function (
) {
    'use strict';
    var SubPage = Backbone.Model.extend({
        urlRoot: '/api/v2/subpages/',
        idAttribute: 'resource_uri',
        defaults: {
            content: 'SubPage Content Here',
            deleted: false
        },
        parse: function (response) {
            if (response && response.page) {
                var split = response.page.split('/');
                var page_id = split[split.length-2];
                response.page = require('Modules').get_module_item(page_id);
            }
            return response;
        },
        toJSON: function () {
            return {
                content: this.get('content'),
                page: this.get('page').url(),
                order: this.collection.where({deleted:false}).indexOf(this),
                deleted: this.get('deleted')
            };
        }
    });
    return SubPage;
});