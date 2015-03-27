/*global Backbone, _*/
define([
    'backbone.cocktail',
    'mixins/Popover',
    'text!templates/unitree/add_menu.html'
], function (Cocktail, MixinPopover, html) {
    'use strict';
    var CreateMenuView = Backbone.View.extend({
        template: _.template(html),
        events: {
            'click li.create_menu_item': 'create_item'
        },
        render: function () {
            this.$el.html(this.template(this.model));
        },
        remove: function () {
            Backbone.View.prototype.remove.call(this);
            this.trigger('remove');
        },
        create_item: function (e) {
            var $li = $(e.target).closest('li.create_menu_item');
            var module_id = $li.attr('module');
            this.trigger('add_item', module_id);
        }
    });
    Cocktail.mixin(CreateMenuView, MixinPopover);

    return CreateMenuView;
});
