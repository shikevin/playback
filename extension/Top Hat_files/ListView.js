/* global Backbone */
define([
], function (
) {
    'use strict';
    var ListView = Backbone.View.extend({
        initialize: function (options) {
            this.options = options || {};
            // When items get added, render them into this view
            this.items = {};
            this.collection.on('add', this.add_item, this);
            this.collection.on('reset', this.render, this);
            this.collection.on('sort', this.render, this);
        },

        render: function () {
            this.$el.empty();
            this.collection.each(function (item) {
                this.render_item(item);
            }.bind(this));
            return this;
        },

        render_item: function (item, prepend) {
            var item_view;
            if (this.items[item.cid] === undefined) {
                item_view = new this.view({
                    model: item,
                    grading_enabled: this.options.grading_enabled,
                    hide_usernames: this.options.hide_usernames
                });
                this.items[item.cid] = item_view;
            } else {
                item_view = this.items[item.cid];
            }
            if (this.collection.indexOf(item) === 0) {
                this.$el.prepend(item_view.render().$el);
            } else {
                var rendered = item_view.render();
                if (rendered) {
                    if (prepend) {
                        this.$el.prepend(rendered.$el);
                    } else {
                        this.$el.append(rendered.$el);
                    }
                }
            }
        },

        add_item: function (item) {
            this.render_item(item, this.options.prepend);
        }
    });

    return ListView;
});
