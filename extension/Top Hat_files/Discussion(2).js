/* global Backbone, publisher, _, Modernizr */
define([
    'mathjax',
    'views/discussion/response_list',
    'views/discussion/response',
    'models/discussion/response',
    'util/accessibility',
    'text!templates/discussion/discussion.html',
    'text!templates/discussion/sms_template.html',
    'util/Browser'
], function (
    mathjax,
    DiscussionResponseListView,
    DiscussionResponseView,
    DiscussionResponse,
    Accessibility,
    html,
    sms_html,
    Browser
) {
    'use strict';

    var DiscussionView = Backbone.View.extend({
        events: {
            'click input.edit-grades': 'edit_grades',
            'click input.response-submit': 'submit_response',
            'click img.discussion-canvas': 'view_canvas',
            'touchend img.discussion-canvas': 'view_canvas',
            'click input.canvas-toggle': 'toggle_canvas',
            'click input.use-topic-canvas': 'use_topic_canvas',
            'click div.discussion-notification': 'scroll_to_top'
        },

        defaults: {
            canvas_showing: false,
            paging: false
        },

        initialize: function (options) {
            this.options = _.defaults(options || {}, this.defaults);
            this.model.on('change:grading_enabled', this.render, this);
            this.listenTo(window.course, 'change:sms_enabled', this.render_sms, this);
            this.list_view = new DiscussionResponseListView({
                model: this.model,
                collection: this.model.get('responses'),
                view: DiscussionResponseView,
                grading_enabled: this.model.get('grading_enabled')
            });
            this.listenTo(this.list_view, 'new_response', this.response_notifier, this);
            this.listenTo(this.model.get('responses'), 'remagnify', function () {
                this.trigger('remagnify');
            }, this);
            this.listenTo(window.course, 'change:enrolled', this.render, this);
            this.listenTo(this.model, 'change:status', function () {
                this.render_response_form();
                this.render_sms();
                this.redo_magnification();
            }, this);

            // fetch the discussion every 10 sec when it is open
            if (!this.pollingInterval) {
                this.pollingInterval = setInterval(function () {
                    if (publisher.get('connection_status') !== 'connected_streaming') {
                        this.model.get('responses').fetch();
                    }
                }.bind(this), 10000);
            }
        },

        remove: function () {
            Backbone.View.prototype.remove.apply(this);
            clearInterval(this.pollingInterval);
        },

        render: function () {
            this.model.fetch({
                success: function () {
                    // Get the template for this view
                    var rendered_discussion = _.template(html)(this.model.attributes);
                    this.$el.html(rendered_discussion);

                    var discussion_responses = this.$('.discussion-responses');
                    discussion_responses.html($('#loading_template').html());
                    if (Modernizr.canvas && Browser.is_web()) {
                        this.$('div.canvas-wrapper').expressionist({
                            hidden: false,
                            image_path: window.site_data.settings.MEDIA_URL + 'images/discussion/'
                        });
                    }
                    this.model.get('responses').fetch({
                        success: function() {
                            discussion_responses.empty().append(
                                this.list_view.render().$el);
                            this.redo_magnification();
                        }.bind(this)
                    });
                    this.delegateEvents();

                    // Bind to scroll events. This must be done here, since scroll events don't bubble up: http://www.quirksmode.org/dom/events/scroll.html
                    discussion_responses.on('scroll', function (e) { this.autoscroll_check(e); }.bind(this));
                    mathjax.execute_mathjax(this.el);

                    this.render_response_form();
                    this.render_sms();
                }.bind(this)
            });
            return this;
        },
        render_response_form: function () {
            var status = this.model.get('status');
            if (!status) { return; }
            var active = status.search('active') !== -1,
                anon_participation = window.course.get('course_data').get('settings').get('anonymous_participation'),
                is_anon = window.user.get('is_anonymous_account');

            // Remove submission buttons for non-enrolled users, as well as anonymous users IF the course does not allow
            // anonymous participation.
            var discussion_response_form_container = this.$(
                '.discussion-response-form-container');
            if (!active || (is_anon && !anon_participation)) {
                discussion_response_form_container.hide();
            } else {
                discussion_response_form_container.show();
            }
        },

        redo_magnification: function () {
            $(window).trigger('resize');
        },

        render_sms: function (block_retries) {
            var sms_enabled = window.course.get('sms_enabled'),
                active_visible = this.model.get('status') === 'active_visible';

            if (window.user.is_teacher() &&
                    this.model.get('status') === 'active_visible' &&
                    !this.model.get('sms_code') &&
                    block_retries !== true) {
                this.model.fetch()
                    .then(function () {
                        this.render_sms(true);
                    }.bind(this));
                return;
            }

            if (sms_enabled && active_visible && this.$('.sms_code_instruc').length > 0) {
                return;
            } else if(sms_enabled && active_visible && window.user.is_teacher()) {
                var data = {
                    sms_code: this.model.get('sms_code'),
                    sms_phone_number: this.model.get('sms_phone_number')
                };
                var discussion_topic = this.$('.discussion-topic');
                if (discussion_topic.length > 0){
                    discussion_topic.after(_.template(sms_html)(data));
                }
            } else {
                $('.sms_code_instruc').remove();
            }

        },

        edit_grades: function(e) {
            e.preventDefault();
            this.model.set('grading_enabled', !this.model.get('grading_enabled'));
            this.render();
        },

        submit_response: function (e) {
            e.preventDefault();
            var discussion_submitting_message = this.$(
                '.discussion-submitting-message');
            this.$('.response-submit').prop('disabled', true);
            discussion_submitting_message.show();
            this.$('.discussion-error-message').hide();

            var canvas_data = null;
            if (this.options.canvas_showing && Modernizr.canvas) {
                canvas_data = this.$('div.canvas-wrapper').expressionist('get_data');
            }
            var response_text = this.$('.discussion-response-textarea').val();

            // Don't let people submit empty responses without an attached canvas
            var non_whitespace_text = response_text.trim();
            if (non_whitespace_text.length === 0 && canvas_data === null) {
                window.alert('You can\'t submit empty responses!', function () {
                    window.panels.remove('alert');
                    this.$('.discussion-response-textarea').focus();
                }.bind(this));
                Accessibility.SR_alert('You can\'t submit empty responses! Press enter to continue.');
                discussion_submitting_message.hide();

                this.$('.response-submit').prop('disabled', false);
                return;
            }

            // If our discussion is tagged as being anonymous, we won't ever submit the username
            // to the server.
            var response_owner = window.user.get('username');
            if (this.model.get('is_anonymous')){
                response_owner = 'Anonymous';
            }

            var response = new DiscussionResponse({
                response: response_text,
                owner: response_owner,
                created_at: new Date(),
                upvote_count: 1,
                discussion: this.model,
                canvas_data: canvas_data
            });

            Accessibility.SR_alert('Submitting.');

            Backbone.Relational.eventQueue.block();
            var response_submit = this.$('.response-submit');
            response.save({}, {
                wait: true,
                success: function (model) {
                    this.model.set({answered: true});
                    Backbone.Relational.eventQueue.unblock();
                    var voted = this.model.get('voted'); // array of ids that we voted on
                    voted.push(Number(response.get('id'))); // add the id of the response we just created
                    this.model.set({voted: voted}); // put the voted list back on the discussion model
                    this.model.get('responses').add(response); // add the response to the discussion's collection
                    this.$('.discussion-response-textarea').val('');
                    this.$('.discussion-submitting-message').hide();
                    if (Modernizr.canvas) {
                        this.$('div.canvas-wrapper').expressionist('clear');
                        this.model.set({ canvas_data: null });
                        this.hide_canvas();
                    }

                    // If we are streaming, we expect a Houdini message and we
                    // subsequently fetch. If not, we manually fetch all
                    // resources here.
                    if (publisher.get('connection_status') !==
                        'connected_streaming') {
                        this.model.get('responses').fetch();
                    }

                    response_submit.prop('disabled', false);
                    this.$('.response-submit').focus();
                    Accessibility.SR_alert('Submitted.');

                }.bind(this),
                error: function (model) {
                    Backbone.Relational.eventQueue.unblock();
                    this.$('.discussion-submitting-message').hide();
                    this.$('.discussion-error-message').show();
                    Accessibility.SR_alert('There was an issue submitting your response. Please try again.');
                    this.$('.response-submit').focus();
                    response_submit.prop('disabled', false);
                }.bind(this)
            });
        },

        view_canvas: function (e) {
            e.preventDefault();
            // Show Canvas in a fancybox
            $.fancybox({ href: this.$('.discussion-canvas').attr('src')});
        },

        hide_canvas: function () {
            this.options.canvas_showing = false;
            this.$('div.canvas-wrapper').hide();
            this.$('input.canvas-toggle').attr('value', 'Attach canvas');
            this.$('input.use-topic-canvas').hide();
        },

        show_canvas: function () {
            this.options.canvas_showing = true;
            this.$('div.canvas-wrapper').show();
            this.$('input.canvas-toggle').attr('value', 'Remove canvas');
            this.$('input.use-topic-canvas').show();
        },

        toggle_canvas: function (e) {
            e.preventDefault();
            if (this.options.canvas_showing) {
                this.hide_canvas();
            } else {
                this.show_canvas();
            }
        },

        use_topic_canvas: function (e) {
            e.preventDefault();
            var url = this.model.get('key_string');
            if (Modernizr.canvas) {
                $(this.el).find('div.canvas-wrapper').expressionist('background_image', url);
            }
        },

        autoscroll_check: function () {
            var container = this.$('.discussion-responses');

            if (container.scrollTop() + container.height() < container.prop('scrollHeight')) {
                return;
            } else {
                var loader = this.$('.discussion-response-loader');
                if (this.model.get('responses').page_info().next) {
                    // If there's a next page to fetch, show a loading animation
                    loader.show();
                    this.options.paging = true;

                    // Temporarily append new discussion responses instead of prepending
                    // since we're lazy loading old items
                    this.list_view.options.prepend = false;
                }
                this.model.get('responses').next_page({
                    success: function() {
                        // Revert back to prepending discussion responses
                        this.list_view.options.prepend = true;

                        loader.fadeOut();
                        this.options.paging = false;
                        if (this.model.get('is_magnified')) {
                            _.defer(function () {
                                this.model.get('view').panel.trigger('redo_magnify');
                            }.bind(this));
                        }
                    }.bind(this)
                });
            }
        },

        response_notifier: function () {
            var container = this.$('.discussion-responses');
            if (container.scrollTop() !== 0 && !this.options.paging) {
                this.$('.discussion-topic').addClass(
                    'notification-visible');
            }
            this.trigger('remagnify');
        },

        scroll_to_top: function (e) {
            e.preventDefault();
            var container = this.$('.discussion-responses');
            container.animate({
                scrollTop: 0
            }, 500);
            this.$('.discussion-topic').removeClass(
                'notification-visible');
        }
    });

    return DiscussionView;
});
