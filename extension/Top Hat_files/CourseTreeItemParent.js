/* global Backbone */
define([
], function (
) {
    'use strict';
    var TreeItemParent = Backbone.Model.extend({
        idAttribute: 'resource_uri',
        url: function () {
            return ('/api/v3/course/' + $.ajaxSetup().headers['course-id'] +
                    '/tree_item/' + this.get('item_id') + '/parent');
        }
    });

    return TreeItemParent;
});
