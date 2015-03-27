/* global Backbone */
define([
    'layouts/lobby/LayoutItemCollection'
], function (
    LayoutItemCollection
) {
    'use strict';
    var Layout = Backbone.Model.extend({
        defaults: {
            items: undefined
        },
        initialize: function () {
            this.set({
                items: new LayoutItemCollection()
            });
        },
        add: function (item) {
            this.get('items').add(item);
            this.trigger('add', item);
        },
        remove: function (item) {
            this.get('items').remove(item);
            this.trigger('remove', item);
        },
        reset: function () {
            this.get('items').reset();
            this.trigger('reset');
        }
    });

    return Layout;
});
