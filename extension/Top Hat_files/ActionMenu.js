/*global define, Backbone, _*/
define([
    'backbone.cocktail',
    'mixins/Popover',
    'text!templates/action_menu.html'
], function (Cocktail, MixinPopover, html) {
    'use strict';
    var ActionMenuView = Backbone.View.extend({
        template: _.template(html),
        className: 'actionmenu actionmenu_popup',
        events: {
            'click div.option': 'trigger_action',
            'click .close': 'on_close'
        },
        render: function () {
            this.$el.html(this.template({
                action_groups: this.model.get_actions(),
                current_action: this.model.get_current_action()
            }));
            this.render_tooltips();
        },
        on_close: function(e) {
            this.remove();
        },
        render_tooltips: function () {
            this.$('.option[group="Actions"]').qtip({
                content: {
                    text: function(api){
                        return $(this).find('span.title').html();
                    }
                },
                position: {
                    my: 'top center',
                    at: 'bottom center',
                    target: '',
                    adjust: {
                        x: -5,
                        y: -5
                    }
                },
                style: {
                    classes: 'action-tip'
                }
            });
        },
        trigger_action: function (e) {
            e.preventDefault();
            e.stopPropagation();
            var target = $(e.target).closest('div.option');
            this.trigger('action', target.attr('status'));
        },
        remove: function () {
            this.$el.closest('.popover').remove();
            Backbone.View.prototype.remove.apply(this, arguments);
            this.trigger('destroy');
        }
    });
    Cocktail.mixin(ActionMenuView, MixinPopover);

    return ActionMenuView;
});
