/* global Backbone */
define([
    'layouts/lobby/LayoutItem'
], function (
    LayoutItem
) {
    'use strict';
    var LayoutItemCollection = Backbone.Collection.extend({
        model: LayoutItem
    });

    return LayoutItemCollection;
});
