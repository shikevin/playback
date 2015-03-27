/*global define, Backbone, _ */
define([
    //'backbone',
    'text!templates/alert/item.html',
    'util/accessibility'
], function (
    alertItemHtml,
    Accessibility
) {
    'use strict';

    var AlertItemView = Backbone.View.extend({
        template: _.template(alertItemHtml),

        // Delegated events specific to an item.
        events: {
            'click .alert':    'destroyModel'
        },

        /**
         * Initialize this view.
        */
        initialize: function() {
            // Removes this view from the DOM and removes any bound events that
            // the view has listenTo'd.
            this.model.on('destroy', function() {
                this.destroyView();
            }, this);
        },

        /**
         * Renders this view.
        */
        render: function () {
            this.$el.html(this.template({
                msg: this.model.get('msg'),
                level: this.model.get('level')
            }));
            Accessibility.SR_alert(this.model.get('msg'));
            return this;
        },

        /**
         * Destroys this view's model.
         * @param {Event} e
        */
        destroyModel: function(e) {
            this.model.destroy();
        },

        /**
         * Callback that destroys this view.
        */
        destroyView: function() {

            // Removes all callbacks on `AlertItemView`.
            this.off();

            // Remove view from DOM (delegates to jQuery, which removes it from DOM)
            this.remove();
        }
    });

    return AlertItemView;
});
