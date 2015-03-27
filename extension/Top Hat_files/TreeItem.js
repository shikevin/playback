/* global Backbone, _ */
define([
], function (
) {
    'use strict';
    var TreeItem = Backbone.Model.extend({
        defaults: {
            click: undefined, //optional function that is called when item clicked
            selectable: false,
            selected: false,
            item_type: 'item',
            title: '-',
            module_id: ''
        },
        serialize: function () {
            var result = this.pick(['id', 'title']);
            result.item_type = 'module_item';
            return result;
        },
        deserialize: function (data) {
            this.set(data);
        },
        initialize: function () {
            this.bind('click', function () {
                if (this.get('click')) {
                    this.get('click').call(this);
                }
            });
        },
        is_selected: function () {
            return this.get('selectable') && this.get('selected') === true;
        }
    });

    if (_.isUndefined(window.tree_constructors)) {
        window.tree_constructors = {
            views: {},
            models: {}
        };
    }

    window.tree_constructors.models.item = TreeItem;
    return TreeItem;
});