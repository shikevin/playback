/* global _, Backbone */
define([
    'text!templates/invite/email_sent.html'
], function (html) {
    'use strict';
    var EmailSentView = Backbone.View.extend({
        className: 'email_sent',
        template: _.template(html),
        events: {
            'click .done': 'done'
        },
        initialize: function () {
        },
        render: function () {
            this.$el.html(
                this.template()
            );
            this.delegateEvents();
        },
        done: function () {
            this.trigger('pending');
        }
    });

    return EmailSentView;
});
