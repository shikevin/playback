/* global _, Backbone, publisher */
define([
    'text!templates/header/connection_status.html'
], function (
    connection_status_html
) {
    'use strict';
    var status_image_prefix = window.site_data.settings.MEDIA_URL + 'images/lobby-mockups/';
    var status_images = {
        connecting: status_image_prefix + 'connecting.png',
        connected: status_image_prefix + 'connecting.png',
        disconnected: status_image_prefix + 'disconnected.png',
        connected_streaming: status_image_prefix + 'connected.png'
    };

    var ConnectionStatusView = Backbone.Marionette.ItemView.extend({
        ui: {
            connection_status_icon: '.connection_status_icon',
            sending_icon: '.sending_icon'
        },

        template: _.template(connection_status_html),

        initialize: function () {
            this.listenTo(publisher,
                          'change:connection_status change:sending',
                          this._render_status, this);
            this._preload_status_images();
        },

        onRender: function () {
            this._render_status();
        },

        serializeData: function () {
            return {
                MEDIA_URL: window.site_data.settings.MEDIA_URL
            };
        },

        _render_status: function () {
            var conn_status = publisher.get('connection_status');
            this.ui.connection_status_icon.prop(
                'src',
                status_images[conn_status]
            );
            this.$el.find('#connection_status').html('connection status: ' + conn_status);
            this.ui.sending_icon.toggle(publisher.get('sending'));
        },

        _preload_status_images: function () {
            var img = new Image();
            _.each(status_images, function (src) {
                img.src = src;
            });
        }
    });

    return ConnectionStatusView;
});
