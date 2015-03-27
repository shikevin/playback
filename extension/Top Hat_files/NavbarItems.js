/* global _, Backbone */
define([
    'text!templates/header/nav_items.html'
], function (
    nav_items_html
) {
    'use strict';
    var NavbarItemsView = Backbone.Marionette.ItemView.extend({
        template: _.template(nav_items_html),

        className: 'nav navbar-nav',

        defaults: {
            nav_items: []
        },


        ui: {
            nav_item: '.header-nav-item'
        },

        events: {
            'click @ui.nav_item': '_nav_item_click'
        },

        initialize: function (options) {
            this.options = _.defaults(options || {}, this.defaults);
            this.nav_items = this.options.nav_items;
        },

        serializeData: function () {
            return {
                nav_items: this.nav_items
            };
        },

        onBeforeRender: function () {
            var $current_active_item = this.$('.active [data-nav-item-index]');
            if ($current_active_item.length === 0) {
                this.current_active_nav_item_index = null;
                return;
            }
            this.current_active_nav_item_index = $current_active_item.data(
                'nav-item-index');
        },


        onRender: function () {
            this.rendered_nav_items = this.nav_items ? this.nav_items.slice(0) : [];

            if (this.current_active_nav_item_index !== null) {
                this.$('.active').removeClass('active');
                this.$('li:has([data-nav-item-index=' +
                       this.current_active_nav_item_index +
                       '])').addClass('active');
            }
        },

        _nav_item_click: function (event) {
            var $item = $(event.currentTarget);
            this.$('.active').removeClass('active');
            var $item_cont = $item.parent('li');
            if (!$item_cont.hasClass('active')) {
                $item_cont.addClass('active');
            }

            var clicked_item_index = parseInt($item.data('nav-item-index'), 10);
            var onclick = this.rendered_nav_items[clicked_item_index].onclick;
            if (!_.isUndefined(onclick)) {
                onclick(event);
            }
        }
    });

    return NavbarItemsView;
});
