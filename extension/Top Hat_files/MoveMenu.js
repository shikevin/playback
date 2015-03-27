/*global Backbone, _*/
define([
    'backbone.cocktail',
    'mixins/Popover',
    'text!templates/unitree/move_menu.html'
], function (Cocktail, MixinPopover, html) {
    'use strict';
    var MoveMenuView = Backbone.View.extend({
        template: _.template(html),
        events: {
            'click .move_menu_item': 'move',
            'click .move_special': 'move_special'
        },
        render: function () {
            this.$el.html(this.template(this.model));
        },
        move: function (e) {
            var target = $(e.target).closest('.move_menu_item');
            this.trigger('move', target.attr('folder'));
        },
        move_special: function (e) {
            var target = $(e.target).closest('.move_special');
            this.trigger('move_special', target.attr('target'));
        }
    });
    Cocktail.mixin(MoveMenuView, MixinPopover);

    return MoveMenuView;
});
