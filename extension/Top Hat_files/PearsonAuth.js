/* global define, Backbone, _ */
define([
    'text!templates/lms/pearson_auth.html'
], function (html) {
    'use strict';
    var PearsonAuth = Backbone.View.extend({
        className: 'pearson_auth',
        template: _.template(html),
        initialize: function (options) {
            this.options = options || {};
        },
        render: function () {
            this.$el.html(this.template());
            this.login_form = this.$('.login_form').composer([
                {
                    id: 'username',
                    type: 'text',
                    label: 'eCollege Username',
                    validation: ['not_empty']
                },
                {
                    id: 'password',
                    type: 'password',
                    label: 'eCollege Password',
                    validation: ['not_empty']
                },
                {
                    id: 'login',
                    type: 'button',
                    value: 'Login'
                }
            ]);
            this.login_form.get('login').on('click', this.do_login.bind(this));
        },
        do_login: function () {
            if (this.login_form.is_valid()) {
                var login_req = $.ajax({
                    url: this.options.auth_url,
                    type: 'POST',
                    data: this.login_form.values()
                });

                login_req.done(this.logged_in.bind(this));
                login_req.fail(this.invalid.bind(this));
            } else {
                this.invalid();
            }
        },
        logged_in: function () {
            this.trigger('authenticated');
        },
        invalid: function () {

        }
    });
    return PearsonAuth;
});