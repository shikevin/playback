define([
    'mathjax',
    'text!templates/discussion/comment.html'
], function (mathjax, html) {
    var Backbone = window.Backbone,
        templates = window.templates;

    var DiscussionResponseCommentView = Backbone.View.extend({
        show_username: false,
        events: {
            'click a.resend_sms': 'resend_sms',
            'click .hide-show-toggle-comment': 'toggle_username'
        },

        initialize: function (options) {
            this.options = options || {};
            this.model.on('change', this.render, this);
            this.model.on('remove', this.unrender, this);
        },

        render: function () {
            if (this.model.id === undefined) { return this; }
            var data = this.model.toJSON();
            data.hide_usernames = this.options.hide_usernames;
            data.show_username = this.options.show_username;
            var rendered_comment = _.template(html)(data);
            this.$el.html(rendered_comment);
            mathjax.execute_mathjax(this.el);
            this.delegateEvents();
            return this;
        },

        toggle_username: function () {
            this.options.show_username = !this.options.show_username;
            this.render();
        },

        unrender: function (e) {
            e.preventDefault();
            this.$el.remove();
        },

        resend_sms: function (e) {
            e.preventDefault();
            this.$('a.resend_sms').text('sending...');
            this.model.save({
                sms_comment: true
            }, {
                success: function (model, response) {
                    model.set({ sms_comment: false });
                    this.$('a.resend_sms').replaceWith('ok!');
                }.bind(this)
            });
        }
    });

    return DiscussionResponseCommentView;
});
