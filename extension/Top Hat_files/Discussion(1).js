/* global define, _, panels, publisher */

define([
    'models/ModuleItem',
    'views/discussion/content',
    'models/discussion/response',
    'collections/discussion/response',
    'layouts/edumacation/LayoutCollection',
    'lobby/PresentationTool'
], function (
    ModuleItem,
    DiscussionContentView,
    DiscussionResponse,
    DiscussionResponseCollection,
    layouts
) {
    'use strict';

    // Discussion topics represent topic module items
    var Discussion = ModuleItem.extend({
        urlRoot: '/api/v1/discussion/',
        view_type: DiscussionContentView,
        idAttribute: 'resource_uri',

        defaults: _.extend({}, ModuleItem.prototype.defaults, {
            module: 'discussion',
            module_color: 'purple',
            upvote_count: 1,
            is_private: false,
            is_graded: false,
            is_anonymous: false,
            hide_usernames: false,
            created_at: '',
            active: false,
            visible: false,
            available: false,
            key_string: null,
            canvas_data: null,
            creator: '',
            grading_enabled: false,
            title: '',
            sms_code: null,
            sms_phone_number: '',
            profile: {},
            flagged: [],
            voted: []
        }),

        fetch_votes: function () {
            return $.ajax({
                url: '/api/v1/votes/' + this.get_id() + '/'
            }).done(function (data) {
                this.set(_.pick(data, ['flagged', 'voted']));
            }.bind(this));
        },

        fetch: function () {
            var mi_fetch = ModuleItem.prototype.fetch.apply(this, arguments);

            // $.when will trigger `.done` when both requests finish
            return $.when(mi_fetch, this.fetch_votes());
        },

        toJSON: function () {
            // Prune the model attributes before serialization
            return _.omit(this.attributes, [
                'responses',
                'view',
                'module_color',
                'module',
                'grading_enabled',
                'sms_code',
                'sms_phone_number',
                'is_magnified'
            ]);
        },

        module: function () {
            return require('Modules').get_module(this.get('module'));
        },

        is_visible: function () {
            var status = this.get('status');
            if (
                (status === 'visible' || status === 'active_visible') &&
                require('Modules').get_module(this.get('module')).get('active')
            ) {
                return true;
            } else {
                return false;
            }
        },

        button_list: function () {
            var BUTTONS = this.BUTTONS;
            var buttons_dict = {
                teacher: {
                    active_visible: [BUTTONS.CLOSE, BUTTONS.DISABLE_SUBMISSIONS],
                    visible: [BUTTONS.CLOSE, BUTTONS.ENABLE_SUBMISSIONS],
                    active: [BUTTONS.CLOSE],
                    review: [BUTTONS.CLOSE],
                    inactive: [BUTTONS.CLOSE]
                },
                student: {
                    active_visible: [],
                    visible: [],
                    active: [BUTTONS.CLOSE],
                    review: [BUTTONS.CLOSE],
                    inactive: []
                }
            };
            var buttons = buttons_dict[window.user.get('role')][this.get('status')];
            if (_.isUndefined(buttons)) {
                return [];
            }

            if (window.user.is_teacher()) {
                // if user is a professor, add a magnify or demagnify button
                var button_to_push;
                if (this.get('status') === 'visible' || this.get('status') === 'active_visible') {
                    if (this.get('is_magnified')) {
                        button_to_push = BUTTONS.DEMAGNIFY;
                    } else {
                        button_to_push = BUTTONS.MAGNIFY;
                    }

                    var button_position = buttons.length;
                    if(window.user.is_teacher()) {
                        button_position = 0;
                    }
                
                    buttons.splice(button_position, 0, button_to_push);
                }
            }
            return buttons;
        },

        button_callbacks: $.extend({}, ModuleItem.prototype.button_callbacks, {
            "Toggle Grading": function (mi) {
                mi.set({ grading_enabled: !mi.get('grading_enabled') });
            },
            'Close': function(mi) {
                var status = mi.get('status');

                // Discussions are strange in that you can 'view' them as a prof
                // when they are homework, in review, or closed, so we'll need to
                // override what 'Close' does in this case (we don't want it to
                // use default change-state-to-inactive behaviour
                if (window.user.is_student() ||
                    status === 'active' ||
                    status === 'review' ||
                    status === 'inactive') {

                    mi.trigger('closed');
                } else {
                    // Use default 'Close' behaviour otherwise
                    ModuleItem.prototype.button_callbacks.Close.callback(mi);
                }
            }
        }),

        set_panel_buttons: function (panel) {
            // Buttons are nuts -- Anson Dec 7, 2012
            ModuleItem.prototype.set_panel_buttons.call(this, panel);
        },

        set_buttons: function () {
            if (this.get('view') !== undefined) {
                this.set_panel_buttons(this.get('view').panel);
            }
        },

        initialize: function () {
            ModuleItem.prototype.initialize.call(this);
            this.set({
                responses: new DiscussionResponseCollection([], {
                    discussion: this
                })
            });

            //bind for tree action menu events
            this.on("action", function (action) {
                if( action === "Open" ) {
                    this.trigger('opened');
                    if (window.is_presentation_tool) {
                        PresentationTool.set_page('#content_page');
                    }
                }
            });

            this.on('change:is_graded', this.set_buttons, this); // for the 'toggle_grading' button
        },

        edit_dialog: function () {
            // TODO: Fix up this form to have the UX changes recommened by Ryan
            //  amackera, June 14, 2012
            var item = this;
            var panel = panels.add({
                "id": "edit_topic",
                "module": "discussion",
                "layout": layouts.get("dialog"),
                "title": "Edit Discussion",
                "body": $('#loading_template').html(),
                "width": "500",
                "footer_buttons" : {
                    "Close" : function () {
                        panel.remove();
                    },
                    "Save" : function () {
                        // Show loading spinner in panel until response
                        panel.loading();
                        item.save({
                            is_graded: discussion_form.get('graded').value(),
                            hide_usernames: discussion_form.get('hide_usernames').value(),
                            title: discussion_form.get('name').value(),
                            content: discussion_form.get('topic').value(),
                            creator: item.get('creator'),
                            profile: {
                                correctness_score: discussion_form.get('correctness_score').value(),
                                participation_score: discussion_form.get('participation_score').value()
                            }
                        }, {
                            success: function () {
                                panel.remove();
                            },
                            error: function () {
                                panel.remove();
                                publisher.footer_message('Could not edit Discussion Topic!', 'red');
                            }
                        });
                    }
                }
            });

            var el = $("<div></div>");
            var discussion_form;
            // Get the attributes of the module item if we don't have them already
            item.fetch({
                success: function () {
                    // Create discussion form to add topic
                    discussion_form = el.composer([
                        {
                            id: "name",
                            type: "text",
                            label: "Name",
                            validation: ["not_empty"],
                            tooltip: 'A short description of your discussion. E.g. "Why is the circle constant π?"',
                            value: item.get('title'),
                            placeholder: 'Discussion Name'
                        },
                        {
                            id: "topic",
                            type: "textarea",
                            label: "Topic",
                            validation: ["not_empty"],
                            tooltip: 'Elaborate on the details of your discussion. E.g. "π is great, but it seems like τ would make a better circle constant."',
                            value: item.get('content'),
                            placeholder: 'Discussion Topic'
                        },
                        {
                            id: "hide_usernames",
                            type: "checkbox",
                            label: "Hide Usernames",
                            tooltip: "Usernames are hidden in responses. You can view them individually",
                            value: item.get("hide_usernames")
                        },
                        {
                            id: "graded",
                            type: "checkbox",
                            label: "Graded",
                            tooltop: "Discussion counts for grades, and appears in in the Gradebook",
                            value: item.get("is_graded")
                        },
                        {
                            id: "correctness_score",
                            type: "text",
                            numeric: true,
                            label: "Correctness Mark",
                            value: item.get("profile").correctness_score
                        },
                        {
                            id: "participation_score",
                            type: "text",
                            numeric: true,
                            label: "Participation Mark",
                            value: item.get("profile").participation_score
                        }
                    ]);
                    // Check if this is anonymous
                    // If so: remove hide_usernames form element
                    if (item.get("is_anonymous")) {
                        discussion_form.get("hide_usernames").hide();
                        discussion_form.get("correctness_score").hide();
                        discussion_form.get("graded").hide();
                        item.set({"graded":false});
                    }

                    if (!item.get("is_graded")) {
                        discussion_form.get("correctness_score").hide();
                        discussion_form.get("participation_score").hide();
                    }

                    discussion_form.get("graded").bind("change", function () {
                        if (discussion_form.get("graded").value()) {
                            discussion_form.get("participation_score").show();
                            discussion_form.get("correctness_score").show();
                        } else {
                            discussion_form.get("participation_score").hide();
                            discussion_form.get("correctness_score").hide();
                        }
                    });
                    panel.$b().html( el );
                }.bind(this)
            });
        },

        get_required_attributes: function (func) {
            // Skeleton implementation
            func();
        }
    });

    return Discussion;
});
