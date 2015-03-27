/* global _, Backbone */
define([
], function (
) {
    'use strict';

    var UnansweredItems = Backbone.Marionette.Controller.extend({
        items: [],
        defaults: {
            module: ''
        },
        initialize: function (options) {
            this.options = _.defaults(options, this.defaults);

            this.module_items = require('Modules').get_module(this.options.module).items();
            this.listenTo(
                this.module_items,
                'add remove change:answered change:status closed opened answered',
                this.update,
                this
            );
        },
        update: function () {
            // get module's current unanswered items
            var unopened_unanswered_items = this.module_items.filter(function (item) {
                var answered = false;
                if (item.has('answered')) {
                    answered = item.get('answered');
                } else if (item.get('answer')) {
                    if (item.get('answer').get('response') !== null) {
                        answered = true;
                    }
                } else {
                    answered = item.get('answer');
                }
                return !answered && !item.get('opened') && item.get('status') === 'active';
            });
            if (_.difference(this.items, unopened_unanswered_items)) {
                this.items = unopened_unanswered_items;
                this.render();
            }
        },
        render: function () {
            if (window.is_mobile) {
                return;    //mobile site does not have tree
            }
            var tree_panel = window.panels.find_el('control', this.options.module, this.options.module + '_control_panel');
            var panel = tree_panel.find('.unanswered_items');
            if (!panel.length) {
                var data = '<div class=\'unanswered_items\'><div class=\'description\'><i>0</i> unopened, unanswered item<span class=\'plural\'>s</span></div><div class=\'link\'><a href=\'#\'>Open</a></div></div>';
                tree_panel.find('.thm_panel_body').append(data);
                panel = tree_panel.find('.unanswered_items');
                var that = this;
                $(panel).find('a').click(function (e) {
                    e.preventDefault();
                    _.each(that.items, function (item) {
                        item.trigger('opened');
                    });
                    $(panel).hide();
                });
            }
            $(panel).find('i').text(this.items.length);
            if (this.items.length > 1) {
                $(panel).find('.plural').show();
            } else {
                $(panel).find('.plural').hide();
            }
            if (this.items.length === 0) {
                $(panel).hide();
            } else {
                $(panel).show();
            }
        },
        animate_newly_added_item: function (item_key, num_attempts) {
            var that = this;
            var panel = window.panels.find_el('content', undefined, item_key);
            // if a panel is found, highlight it
            if (panel) {
                panel.effect('bounce', {times: 3}, 100);
            } else if (num_attempts < 10) {
                // otherwise, wait a bit and check for the panel again - up to a max of 10 times.
                num_attempts = num_attempts ? num_attempts + 1 : 0;
                setTimeout(function () {
                    that.animate_newly_added_item(item_key, num_attempts);
                }, 500);
            }
        }
    });

    return UnansweredItems;
});
