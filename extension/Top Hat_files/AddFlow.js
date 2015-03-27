/*global define*/
define([
    // 'backbone',
    'views/invite/EnterEmails',
    'views/invite/Saved',
    'views/invite/EmailPreview',
    'views/invite/EmailSent',
    'collections/Invites'
], function (InviteAddView, SavedView, InviteEmailPreviewView, EmailSentView, InviteCollection) {
    'use strict';
    var InviteAddFlowView = Backbone.View.extend({
        className: "invite_add_flow",

        initialize: function () {
            this.can_reset = false;
            var saved_data = {
                to_save: 0,
                successful: new InviteCollection(),
                errored: new InviteCollection(),
                duplicates: new InviteCollection(),
                emails_sent: new InviteCollection(),
                emails_failed: new InviteCollection(),
                accepted: new InviteCollection()
            };
            this.addview = new InviteAddView(saved_data);
            this.savedview = new SavedView(saved_data);
            this.emailpreview = new InviteEmailPreviewView(saved_data);
            this.emailsent = new EmailSentView(saved_data);

            this.listenTo(this.addview, "saved", this.saved, this);
            this.listenTo(this.savedview, "email_preview", this.email_preview, this);
            this.listenTo(this.emailpreview, "email_sent", this.email_sent, this);
            this.listenTo(this.emailsent, "pending", this.pending, this);
            this.listenTo(this.addview, "pending", this.pending, this);
            this.listenTo(this.savedview, "pending", this.pending, this);
            this.listenTo(this.emailpreview, "pending", this.pending, this);
            this.render();
        },
        render: function () {
            this.$el.append(this.addview.$el);
        },
        saved: function () {
            this.addview.remove();
            this.$el.append(this.savedview.$el);
            this.savedview.re_init();
            this.savedview.render();
        },
        email_preview: function () {
            this.can_reset = true;
            this.savedview.remove();
            this.$el.append(this.emailpreview.$el);

        },
        pending: function () {
            this.can_reset = true;
            this.trigger("pending");
        },
        email_sent: function () {
            this.emailpreview.remove();
            this.emailsent.render();
            this.$el.append(this.emailsent.$el);
        },
        remove: function () {
            this.addview.remove();
            this.savedview.remove();
            this.emailpreview.remove();
            this.emailsent.remove();
            Backbone.View.prototype.remove.apply(this, arguments);
        }
    });
    return InviteAddFlowView;
});