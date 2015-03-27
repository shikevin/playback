/* global _ */
define([
    'tree/models/TreeItem'
], function (
    TreeItem
) {
    'use strict';
    var TreeActionItem = TreeItem.extend({
        defaults: _.extend({}, TreeItem.prototype.defaults, {
            actions: [],
            current_action: undefined,
            item_type: 'action_item'
        }),
        trigger_action: function (action) {
            this.set({'current_action': action});
            this.trigger('click:current_action');
        },
        get_actions: function () {
            return this.get('actions');
        },
        get_current_action: function () {
            return this.get('current_action');
        }
    });
    window.tree_constructors.models.action_item = TreeActionItem;
    return TreeActionItem;
});
