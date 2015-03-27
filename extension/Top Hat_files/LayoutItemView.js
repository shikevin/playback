/* global _, Backbone */
define([
    'layouts/lobby/LayoutItem',
    'text!templates/lobby/layout_item.html'
], function (
    LayoutItem,
    layout_item_html
) {
    'use strict';
    var LayoutItemView = Backbone.View.extend({
        model: LayoutItem,
        rendered: false,
        template: layout_item_html,
        initialize: function () {
            this.model.bind('change', function () { this.rendered = false; }, this);
            this.model.bind('change', this.render, this);
        },
        render: function (cb) {
            if (this.rendered) {
                return;
            }
            this.rendered = true;
            var template = require(this.template);
            this.$el.html(_.template(template, this.model.attributes));
            if (!_.isUndefined(cb)) {
                cb();
            }
        }
    });

    return LayoutItemView;
});
