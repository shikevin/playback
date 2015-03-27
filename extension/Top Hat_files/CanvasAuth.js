/* global define, Houdini, _, Backbone */
define([
    'text!templates/lms/canvas_auth.html'
], function (html) {
    'use strict';
    var CanvasAuth = Backbone.View.extend({
        className: 'auth',
        template: _.template(html),
        initialize: function (options) {
            this.options = options || {};
            Houdini.on('lms:got_response', this.got_response, this);
        },
        render: function () {

            this.$el.html(this.template());
            this.$('.waiting, .authenticating').hide();
            var form = this.$('.canvas_auth_button').composer({
                'id': 'canvas_button',
                type: 'button',
                value: 'Click here to authenticate with Canvas'
            });
            form.get('canvas_button').on('click', this.do_auth.bind(this));
        },
        do_auth: function () {
            var window_url = this.options.auth_url.replace('QUEUE_ID', Houdini.queue);
            this.popup = window.open(window_url, 'Canvas Login', 'resizeable=yes');
            this.$('.prompt, .authenticating').hide();
            this.$('.waiting').show();
        },
        got_response: function () {
            this.popup.close();
            this.$('.prompt, .waiting').hide();
            this.$('.authenticating').show();

        },
        remove: function () {
            Houdini.off('lms:got_response', this.got_response, this);
            Backbone.View.prototype.remove.apply(this, arguments);
        }

    });
    return CanvasAuth;
});