/*global define: false, Backbone, _ */
define([
    'models/NotificationResponse',
    'text!templates/notification/level2.html',
    'text!templates/notification/topbar.html',
    'text!templates/notification/npscomment.html',
    'util/accessibility'
], function (
    NotificationResponse,
    level2NPSTemplate,
    level2TopBarTemplate,
    level2NPSCommentTemplate,
    Accessibility
) {
    'use strict';

    var NotificationView = Backbone.View.extend({

        /**
         * Template function for rendering view.
         * @type {Function}
         */
        templatenps: _.template(level2NPSTemplate),
        templatetop: _.template(level2TopBarTemplate),
        templatenpscomment: _.template(level2NPSCommentTemplate),

        initialize: function (options) {
            this.options = options || {};
            this.template = this['template' + (this.model.get('type') === 1 ? 'nps' : 'top')];
        },

        /**
         * Events that can be triggered by interacting with the view.
         * @type {Object}
         */
        events: {
            'click .close-me': 'close_notif',
            // when the user clicks value button
            'click .nps-node': 'submit_vote',
            'click .content': 'close_if_url',
            'click .nps-submit-comment': 'submit_comment',
            'click .nps-skip-comment': 'remove_notif',
            'keyup .nps-commentbox': 'remove_error'
        },

        /**
         * Renders the view.
         * @return {undefined} undefined
         */
        render: function () {
            var content_string = this.model.get('content');
            var owner_name = this.model.get('owner_full_name');

            this.$el.html(this.template({
                content: content_string,
                comment_content: this.model.get('comment_content'),
                url: this.model.get('url'),
                owner_full_name: owner_name
            }));

            var alert_string = 'New Notification: ' + (owner_name ? owner_name : "") + ": " + content_string;
            Accessibility.SR_alert(alert_string);
            return this;
        },

        /**
         * Submits an empty response to the notification and closes the
         * notification to the user. Activated when the user clicks the X in the
         * corner of the notification. See the events object in this view for
         * the specific trigger for this event.
         *
         * @return {undefined}  undefined
         */
        close_notif: function(e) {
            e.preventDefault(); // prevents # from appearing in url bar
            this.model.respond({
                responded: false
            }, function(res_model) {
                this.destroy_model();
                this.model.set('patch', true);
                this.model.set('response_id', res_model.id);
                this.options.ncentrenotifs.add(this.model);
                this.destroy_view();
            }.bind(this));
        },

        close_if_url: function() {
            var url = this.model.get('url');
            if(url) {
                window.open(url, '_blank');
                this.model.respond({
                    responded: true
                });
                this.destroy_model();
                this.destroy_view();
            }
        },

        /**
         * Submits an valued response to the notification and closes the
         * notification to the user. The value of the response is based on
         * the node clicked in the notification. See the events object in this
         * view for the specific trigger for this event.
         *
         * @param  {Event} e     Event created when submitVote is triggered.
         * @return {undefined}   undefined
         */
        submit_vote: function(e) {
            e.preventDefault(); // prevents # from appearing in url bar
            var resp_int = parseInt($(e.currentTarget).attr('data-value'), 10);
            this.model.respond({
                responded: true,
                response_int: resp_int
            }, function(res_model){
                this.model.fetch({
                    async: false,
                    success: function(model, response, options) {
                        this.show_comment_box(model, res_model);
                    }.bind(this),
                    error: function(model, xhr, options) {
                        // Notification GET failed. Redirect to error page.
                        // TODO: Display error alert.
                        this.redirect(false, 'poll/error');
                    }
                });
            }.bind(this));
        },

        /** Decide whether or not the comment response should be shown after
         *  vote is submitted.
         *
         *  @return {undefined} undefined
         */
        show_comment_box: function(model, response_model) {
            this.model = model;
            this.response_int = response_model.get('response_int');
            this.template = this['templatenpscomment'];
            this.render();
            this.response_ref = response_model;
        },

        /** Removes the css for the validation error upon user input
         *
         *  @return {undefined} undefined
         */
        remove_error: function(e) {
            e.preventDefault();
            this.$('.nps-commentbox').removeAttr('id', 'nps-commenterror');
            this.$('.nps-commentbox').attr('placeholder', 'Please enter your feedback here...');
        },

        /** Remove notification completely if user chooses to skip the comment phase.
         *
         *  @return {undefined} undefined
         */
        remove_notif: function(e) {
            e.preventDefault(); // prevents # from appearing in url bar
            this.destroy_model();
            this.destroy_view();
        },

        /* Submit comment only if it is not blank. Validation is done on the server side.
         *
         * @return {undefined} undefined
         */
        submit_comment: function(e) {
            e.preventDefault();
            // response_comment is the comment textbox
            var response_comment = this.$('.nps-commentbox').val();
            // we use save instead of the respond method because it is better to work with the UserNotification directly
            this.response_ref.save(
                {responded: true,
                 response_comment: response_comment},
                {
                    patch: true,
                    success: function(model, response, options){
                        this.destroy_model();
                        this.destroy_view();
                    }.bind(this),
                    error: function(model, xhr, options){
                        this.$('.nps-commentbox').attr('id', 'nps-commenterror');
                        this.$('.nps-commentbox').attr('placeholder', 'Please submit after typing your feedback.');
                    }.bind(this)
                }
            );
        },

        /**
         * Destroy the view's model, but really just remove the model from the
         * collection. Then update the view accordingly, depending on whether
         * on mobile or not.
         *
         * @return {undefined} undefined
         */
        destroy_model: function() {
            var size_after_delete = this.model.collection.size()-1;
            // we don't destroy the model because we don't want to
            // send a DELETE request for the Notification
            this.model.collection.remove(this.model);
            if(size_after_delete === 0) {
                if(window.is_mobile) {
                    $('.nps-notifs').hide();
                }
                else {
                    $('#region-navbar').removeClass('nps-active');
                    $('#region-content, #wrapper').removeClass('nps-active');
                }
            }
        },

        /**
         * Destroy the view associated with the model.
         *
         * @return {undefined} undefined
         */
        destroy_view: function() {
            this.off();
            this.remove();
        },

        /**
         * Stubbable redirect wrapper function.
         * @param  {Boolean} is_external
         * @param  {String} fragment
         * @param  {Array} options
         * @return {undefined}
         */
        redirect: function(is_external, fragment, options) {
            if (is_external) {
                window.location.href = fragment;
            }
            else {
                options = options || {trigger: true};
                App.router.navigate(fragment, options);
            }
        }
    });

    return NotificationView;
});
