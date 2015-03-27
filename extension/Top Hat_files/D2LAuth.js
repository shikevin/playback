/* global define, Backbone, _, Houdini */
define([
    'underscore',
    'text!templates/lms/d2l_auth.html'
], function (_, html) {
    'use strict';

    var D2LAuth = Backbone.View.extend({
        className: 'auth',
        template: _.template(html),
        initialize: function (options) { this.options = options || {}; },
        render: function () {
            this.$el.html(this.template());
            this.$('.waiting, .authenticating').hide();
            var d2l_form = this.$('.d2l_auth_form').composer({
                id: 'd2l_button',
                type: 'button',
                value: 'Click here to authenticate with Desire2Learn'
            });
            d2l_form.get('d2l_button').on('click', this.do_auth.bind(this));

            return this.$el;
        },
        do_auth: function () {
            var window_url = this.options.auth_url.replace('QUEUE_ID', Houdini.queue);
            this.popup = window.open(window_url, 'Desire2Learn Login', 'resizeable=yes');
            this.$('.prompt, .authenticating').hide();
            this.$('.waiting').show();
        },
        remove: function () {
            if (!_.isUndefined(this.popup)) {
                this.popup.close();
            }
            this.$('.prompt, .waiting').hide();
            this.$('.authenticating').show();

            Backbone.View.prototype.remove.apply(this, arguments);
        }
    });

    return D2LAuth;
});
