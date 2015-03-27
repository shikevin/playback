/* global define, Marionette, _ */
define([
    'text!templates/placeholder.html'
], function (html) {
    'use strict';
    var PlaceholderView = Backbone.Marionette.ItemView.extend({
        media_url: window.site_data.settings.MEDIA_URL,
        template: _.template(html),
        onRender: function () {
            this.$el.html(this.template(this.model.toJSON()));
            var img = this.$el.find('img.ph_thlogo');
            img.attr('src', this.media_url + 'images/pages/thlogo_white.png');
        }
    });
    return PlaceholderView;
});
