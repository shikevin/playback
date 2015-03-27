/* global Backbone */
define([
    'layouts/edumacation/Layout'
], function (
    Layout
) {
    'use strict';
    var LayoutCollection = Backbone.Collection.extend({
        model: Layout,
        idAttribute: 'id',
        clear: function () {
            this.each(function (layout) {
                layout.clear();
            });
        }
    });

    return new LayoutCollection();
});
