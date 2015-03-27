/* globals _, Backbone, publisher, user */
define([
    'mathjax',
    'util/accessibility',
    'views/discussion/response_comment_list',
    'models/discussion/response_comment',
    'text!templates/discussion/response.html'
], function (mathjax, Accessibility, DiscussionResponseCommentListView, DiscussionResponseComment, html) {
    'use strict';
    var MAX_LENGTH_SMS = 120;
    var MAX_LENGTH_NON_SMS = 12000;

    var DiscussionResponseView = Backbone.View.extend({
        events: {
            'click input.comment-submit': 'submit_comment',
            'click button.comment-toggle': 'toggle_comments',
            'click button.remove-button': 'remove_response',
            'click button.flag-button': 'flag_response',
            'click button.upvote-button': 'upvote_response',
            'click a.max': 'grade_max',
            'blur input.discussion-grading': 'grade_value',
            'click a.hide-show-toggle': 'toggle_username',
            'click img.discussion-reply-canvas': 'view_canvas',
            'keyup .comment_text': 'update_comment_text_length',
            'blur .comment_text': 'update_comment_text_length',
            'click .send_sms': 'update_comment_text_length'
        },

        defaults: {
            show_comments: false,
            show_username: false
        },

        initialize: function (options) {
            this.options = _.defaults(options || {}, this.defaults);
            this.model.on('destroy', this.unrender, this);
            this.model.on('change:deleted', this.render, this);
            this.listenTo(this.model.get('comments'), 'add', this.update_comment_count, this);
            this.model.on('change:grade', this.render_grade, this);
            this.listenTo(this.model, 'change:comment_count', function () {
                if (this.options.show_comments) {
                    this.model.get('comments').fetch();
                }
            }, this);
            this.model.on('change:key_string', this.rerender, this);
        },

        render: function () {
            if (this.model.get('deleted')) {
                this.unrender();
                return;
            }
            // sooooo ghetto
            if (this.model.get('discussion').get('is_private') &&
                (this.model.get('owner') !== user.get('username')) &&
                user.get('role') !== 'teacher') { return this; }
            // Render response and comments, if necessary
            var data = $.extend(this.model.attributes, {
                hide_usernames: this.model.get('discussion').get('hide_usernames'),
                show_username: this.options.show_username,
                grading_enabled: this.model.get('discussion').get('grading_enabled'),
                correctness_score: this.model.get('discussion').get('profile').correctness_score,
                comment_count: this.model.get('comment_count'),
                MEDIA_URL: window.site_data.settings.MEDIA_URL
            });

            var rendered_response = _.template(html)(data);

            var focus = this.$(':focus');
            var comments = this.$('.comments').detach();
            this.$el.html(rendered_response);
            if (comments.length > 0) {
                this.$('.comments').replaceWith(comments);
                this.$('.comments').toggle(this.options.show_comments);
            } else {
                this.render_comments();
            }
            if (focus.length) {
                _.defer(function () {
                    this.$('textarea').focus();
                }.bind(this));
            }
            _.defer(function () {
                this.model.get('discussion').trigger('scroll');
            }.bind(this));
            this.delegateEvents();
            mathjax.execute_mathjax(this.el);

            this.listenTo(this.model, 'change:flagged', function () {
                var old_focus = document.activeElement;
                this.render();
                if (old_focus && old_focus.className === 'flag-button') {
                    this.$('.flag-button').focus();
                }
            }, this);
            this.listenTo(this.model, 'change:voted', function () {
                this.$('.upvote-button').addClass('voted');
            }, this);
            this.listenTo(this.model, 'change:upvote_count', function () {
                this.$('.discussion_upvote_count').text(this.model.get('upvote_count'));
                this.$('.discussion_upvote_count').parent().attr('aria-label', 'Upvotes: ' + this.model.get('upvote_count'));
            }, this);
            return this;
        },

        rerender: function () {
            this.render();
            this.model.collection.trigger('remagnify');
        },

        unrender: function () {
            this.$el.html('<div class="qanda_discussion_response discussion_response_deleted">This reply has been removed.</div>');
        },

        render_comments: function () {
            if (this.options.show_comments) {
                var comment_list_view = new DiscussionResponseCommentListView({
                    model: this.model,
                    collection: this.model.get('comments'),
                    hide_usernames: this.model.get('hide_usernames')
                });
                this.model.get('comments').fetch();
                this.$el.find('.comment-list').html(comment_list_view.render().$el);
                this.$el.find('.comments').show();
                $('.comment-toggle').attr('aria-expanded', 'true');
            } else {
                this.$el.find('.comments').hide();
                $('.comment-toggle').attr('aria-expanded', 'false');
                this.$el.find('.comment-toggle').focus();
            }
        },

        submit_comment: function (e) {
            // Prevent event from bubbling
            e.preventDefault();

            var comment_text = this.$el.find('.comment_text').val(),
                sms_comment = this.$el.find('.send_sms').is(':checked');

            if (comment_text.length > 0) {
                var comment = new DiscussionResponseComment({
                    body: comment_text,
                    author: user.get('username'),
                    created_at: new Date(),
                    response: this.model,
                    sms_comment: sms_comment
                });
                Backbone.Relational.eventQueue.block();
                comment.save({}, {
                    wait: true,
                    success: function (model, response) {
                        Backbone.Relational.eventQueue.unblock();
                        // Show the "Submitted!" message, and then fade it out after 4 seconds
                        var $message = this.$el.find('.comment-submitted-message');
                        $message.show();
                        setTimeout(function () {
                            $message.fadeOut('slow');
                        }, 3000);

                        this.$el.find('.comment_text').val('');
                        Accessibility.SR_alert('Comment saved. ');
                        this.update_comment_text_length(e);
                    }.bind(this),
                    error: function (model, response) {
                        Backbone.Relational.eventQueue.unblock();
                    }
                });
            }
        },

        toggle_comments: function (e) {
            e.preventDefault();
            this.model.get('comments').fetch();
            this.options.show_comments = !this.options.show_comments;
            this.rerender();
            this.update_comment_count();
            this.render_comments();
            this.redo_magnification();
        },

        // This method gets called on each keypress of the comment input field, to show
        // the user how many characters they are allowed to enter.
        update_comment_text_length: function (e) {
            var $remaining = this.$el.find('.remaining-chars');
            var current_comment_length = this.$el.find('.comment_text').val().length;
            var is_sms_enabled = this.$el.find('.send_sms').is(':checked');
            var max_count = is_sms_enabled? MAX_LENGTH_SMS: MAX_LENGTH_NON_SMS;
            var comment_exceeding_maximum = current_comment_length > max_count;
            var discussion_status = this.model.get('discussion').get('status');
            var remaining_chars = Math.abs(max_count - current_comment_length);

            if (discussion_status === 'active_visible' && is_sms_enabled) { // sms
                if(comment_exceeding_maximum) {
                    e.preventDefault();
                     $remaining.html('Remaining Characters: Message too long for SMS by: ' + remaining_chars);
                    $remaining.addClass('text-danger');
                } else {
                    $remaining.html('Remaining Characters: '+ remaining_chars);
                    $remaining.removeClass('text-danger');
                }
            } else if (discussion_status === 'visible') { // discussion disabled
                $remaining.html('Submissions for this discussion have been disabled');
                $remaining.addClass('text-danger');
            } else {
                if (comment_exceeding_maximum) { // non sms
                    $remaining.html('Remaining Characters: Message too long by: ' + remaining_chars);
                    $remaining.addClass('text-danger');
                } else {
                    $remaining.html('Remaining Characters: ' + remaining_chars);
                    $remaining.removeClass('text-danger');
                }
            }
        },

        update_comment_count: function () {
            this.$el.find('span.comment-count').text(this.model.get('comments').length);
            if (this.options.show_comments && window.is_fullscreen) {
                this.redo_magnification();
            }
        },

        remove_response: function (e) {
            e.preventDefault();
            this.model.destroy({
                success: function () {
                    $('.discussion-response-textarea').focus();
                    Accessibility.SR_alert('Response deleted.');
                },
                error: function (model, response) {
                    publisher.footer_message('You can\'t delete this content.', 'red');
                }
            });
        },

        flag_response: function (e) {
            e.preventDefault();
            this.model.flag();
        },

        upvote_response: function (e) {
            e.preventDefault();
            if ($(e.target).hasClass('voted')) { return; }
            this.model.upvote();
            $(e.target).addClass('voted');
            this.$el.find('.upvote-button').focus();
            Accessibility.SR_alert('You upvoted this response.');
        },

        render_grade: function () {
            this.$('input.discussion-grading').val(this.model.get('grade'));
        },

        grade_max: function (e) {
            e.preventDefault();
            this.grade(this.model.get('correctness_score'));
            this.render_grade();
        },

        grade_value: function (e) {
            e.preventDefault();
            var value = this.$el.find('.discussion-grading').val();
            this.grade(value);
        },

        grade: function (score) {
            this.model.save({ grade: score });
        },

        toggle_username: function (e) {
            e.preventDefault();
            this.options.show_username = !this.options.show_username;
            this.rerender();
            this.redo_magnification();
        },

        view_canvas: function (e) {
            e.preventDefault();
            $.fancybox({ href: this.$el.find('.discussion-reply-canvas').attr('src')});
        },

        redo_magnification: function () {
        }
    });

    return DiscussionResponseView;
});
