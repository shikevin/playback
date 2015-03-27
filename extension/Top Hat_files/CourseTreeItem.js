/* global Backbone */
define([
    'mixins/PUTUpdateFieldMixin',
    'backbone.cocktail'
], function (
    PUTUpdateFieldMixin,
    Cocktail
) {
    'use strict';
    var TreeItem = Backbone.Model.extend({
        idAttribute: 'resource_uri',
        url: function () {
            return ('/api/v3/course/' + $.ajaxSetup().headers['course-id'] +
                    '/tree_item/' + this.get('item_id')) + '/';
        }
    });

    Cocktail.mixin(TreeItem, PUTUpdateFieldMixin);
    return TreeItem;
});
