/*global define, _, Backbone, Daedalus */
define([
    'text!templates/invite/email_preview.html'
], function (html) {
    'use strict';
    var EmailPreview = Backbone.View.extend({
        className: 'email_preview',
        template: _.template(html),
        events: {
            'click .send_email:not(.disabled)': 'send_invites',
            'click .dont_send': 'dont_send'
        },
        initialize: function (options) {
            this.options = options || {};
            this.listenTo(window.course, 'change:available', this.change_available, this);
            this.render();
        },
        render: function () {
            this.$el.html(this.template({
                course_name: window.course.get('course_data').get('course_name'),
                public_code: window.course.get('course_data').get('public_code')
            }));
            this.change_available();
        },
        change_available: function () {
            this.$('.send_email').toggleClass('disabled', !(window.course.get('available')));
        },
        send_invites: function () {
            Daedalus.track('SM - Prof sent invitations', {
                invitesSent: this.options.successful.length
            });
            Daedalus.set_property('hasInvitedStudents', true);
            $.get('/invite/message_bulk/' + this.options.bulk.get('id'), {}, function () {
                this.trigger('email_sent');
            }.bind(this));
        },
        dont_send: function () {
            this.trigger('pending');
        }
    });
    return EmailPreview;
});