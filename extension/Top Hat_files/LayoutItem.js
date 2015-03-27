/* global Backbone */
define([
], function (
) {
    'use strict';
    var LayoutItem = Backbone.Model.extend({
        defaults: {
            content: undefined
        }
    });

    return LayoutItem;
});
