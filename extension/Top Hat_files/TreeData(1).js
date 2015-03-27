/* global Backbone */
define([
    'models/TreeData'
], function (
    TreeDataModel
) {
    'use strict';
    var TreeDataCollection = Backbone.Collection.extend({
        urlRoot: '/api/v1/tree_data/',
        model: TreeDataModel
    });

    return TreeDataCollection;
});
