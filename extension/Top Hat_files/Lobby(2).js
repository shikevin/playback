/*global define:false, _: false, Marionette: false */
define([
    'text!templates/layouts/lobby.html'
], function (html) {
    'use strict';

    var LobbyLayout = Backbone.Marionette.Layout.extend({
        template: function (serialized_model) {
            return _.template(html)(serialized_model);
        },
        id: 'layout',  // Identifier for this layout and CSS id for parent el.
        className: 'l-lobby',
        events: {
            'click #logo': 'navigate'
        },
        regions: {
            header: '#region-navbar',
            content: '#wrapper',  // TODO stevo: Rename as '#region-content'
            footer: '#footer'  // TODO stevo: Rename as '#region-footer'
        },
        navigate: function navigate(e) {
            e.preventDefault();
            window.contentRouter.navigate('', {trigger: true});
        }
    });

    return LobbyLayout;
});
