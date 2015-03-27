/* global _, Backbone */
define([
    'layouts/lobby/Layout',
    'layouts/lobby/LayoutItemView'
], function (
    Layout,
    LayoutItemView
) {
    'use strict';
    var LayoutView = Backbone.View.extend({
        model: Layout,
        item_views: undefined,
        rendered: false,
        item_constructor: LayoutItemView,
        initialize: function () {
            this.item_views = [];
            this.model.bind('add', this.add_item, this);
            this.model.bind('remove', this.remove_item, this);
            this.model.bind('reset', this.reset, this);
        },
        add_item: function (item) {
            // DON'T call this directly! It is called by adding a model to the Layout collection
            var item_view = new this.item_constructor({model: item});
            this.item_views.push(item_view);
            this.render();
        },
        remove_item: function (item) {
            var item_view = _.filter(this.item_views, function (view) {
                return view.model === item;
            })[0];
            this.item_views = _.without(this.item_views, item_view);
            if (item_view) {
                item_view.$el.remove();
            }
        },
        reset: function () {
            _.each(this.item_views, function (view) {
                view.$el.remove();
            });
            this.item_views = [];
        },
        change_item: function (item) {
        },
        render: function (target) {
            this.rendered = true;
            _.each(this.item_views, function (item_view) {
                if (!item_view.rendered) {
                    item_view.render();
                }
                if (!target) {
                    target = this.$el;
                }
                $(target).append(item_view.el);
            }.bind(this));
        }
    });

    return LayoutView;
});
