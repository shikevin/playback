/* global _, Houdini, panels */
define([
    'models/ModuleItem',
    'modules/Module',
    'models/discussion/discussion',
    'models/discussion/response',
    'views/discussion/control',
    'views/discussion/response',
    'layouts/edumacation/LayoutCollection'
], function (
    ModuleItem,
    Module,
    Discussion,
    DiscussionResponse,
    DiscussionControlView,
    DiscussionResponseView,
    layouts
) {
    'use strict';

    var DiscussionModule = Module.extend({
        defaults: _.extend({}, Module.prototype.defaults, {
            id: 'discussion',
            model: Discussion,
            control_view: DiscussionControlView,
            name: 'Discussions',
            color: 'purple',
            active: false,
            order: 4,
            tree_actions: [{
                'group': 'Set Status',
                'items': [
                    {
                        'id': 'active_visible',
                        'title': '<b>Discuss</b>(Active + Visible)',
                        'description': 'Online students can see and participate in the discussion.'
                    },
                    {
                        'id': 'visible',
                        'title': '<b>Show</b>(Visible)',
                        'description': 'Online students will see the discussion. Students can not participate.'
                    },
                    {
                        'id': 'active',
                        'title': '<b>Homework</b>(Active)',
                        'description': 'Assign this discussion as homework.'
                    },
                    {
                        'id': 'review',
                        'title': '<b>Review</b>',
                        'description': 'Give students study items.'
                    },
                    {
                        'id': 'inactive',
                        'title': '<b>Closed</b>(Inactive)',
                        'description': 'Only professors can access.'
                    }]
            }, {
                'group': 'Actions',
                'items': [
                    {id: 'Duplicate', instant: true, title: 'Duplicate Item'},
                    {id: 'Edit', instant: true, title: 'Edit Item'},
                    {id: 'Open', instant: true, title: 'Preview Item'},
                    {id: 'Schedule', instant: true, title: 'Schedule Item'},
                    {id: 'students', instant: true, title: 'Assign to individuals'}
                ]
            }]
        }),

        initialize: function () {
            Module.prototype.initialize.call(this);
            Houdini.on('discussion:update', function (settings) {
                var allow_new_topics = settings.allow_new_topics;

                if( typeof allow_new_topics !== 'undefined' ) {
                    this.set('allow_new_topics', allow_new_topics);
                }
            }.bind(this));

            Houdini.on('discussion:updated', function (data) {
                if (this.get('items').get(data.uri)) {
                    this.get('items').get(data.uri).fetch();
                }
            }.bind(this));

            this.on('change:active', function () {
                if (this.get('active')) {
                    var settings = course.get('course_data').get('settings');
                    this.set({
                        allow_new_topics: settings.get('discussion_allow_student_topics')
                    });
                }
            });
        },

        add_item: function (item, existing_topic_key) {
            var panel = panels.add({
                id: 'add_topic',
                module: 'discussion',
                layout: layouts.get('dialog'),
                title: 'Add New Discussion',
                body: $('#loading_template').html(),
                width: 500,
                footer_buttons: {
                    'Close' : 'remove',
                    'Save' : function () {
                        var valid = true;
                        _.each(discussion_form.items(), function (item) {
                            if (!item.is_valid()) {
                                valid = false;
                            }
                        });
                        if (!valid) { return false; }

                        var data = discussion_form.values();
                        var canvas_data = canvas_el.find('div.canvas-wrapper').expressionist('get_data');

                        // Get the folder to insert the discussion into
                        data.folder = require('Modules').get_module('discussion').get_folder_id_to_insert_into();

                        // Show loading spinner in panel until response
                        panel.loading();


                        var is_private, is_anonymous, hide_usernames, folder;
                        var is_graded, profile;
                        if (window.user.get('role') === 'teacher') {
                            is_private = discussion_form.get('seen_by_select').get('value') === 'Only by Professor' ? true : false;
                            is_anonymous = (discussion_form.get('anonymous_select').get('value') === 'Everyone (can\'t be graded)') || (discussion_form.get('anonymous_checkbox').get('value')) ? true : false;
                            hide_usernames = discussion_form.get('anonymous_select').get('value') === 'Fellow participants only' ? true : false;
                            folder = this.get_folder_id_to_insert_into();
                            profile = {
                                correctness_score: discussion_form.get('correctness_score').value(),
                                participation_score: discussion_form.get('participation_score').value()
                            };
                            is_graded = discussion_form.get('graded').value();
                            if (is_anonymous) { is_graded = false; }
                        } else {
                            is_private = false;
                            is_anonymous = false;
                            hide_usernames = false;
                            folder = '';
                            is_graded = false;
                        }
                        new Discussion().save({
                            creator: window.user.get('username'),
                            title: discussion_form.get('name').value(),
                            content: discussion_form.get('topic').value(),
                            is_private: is_private,
                            is_anonymous: is_anonymous,
                            hide_usernames: hide_usernames,
                            is_graded: is_graded,
                            active: true, // Discussions are 'active' by default
                            canvas_data: canvas_data,
                            profile: profile,
                            folder: folder
                        }, {
                            success: function (model, response) {
                                panel.remove();
                                model.set({ canvas_data: null });
                                this.get('items').add(model);
                                // track it
                                var d_id = model.id.split("/")[4];
                                var event_name = "discussion created";
                                var properties = {
                                    moduleItemId: d_id,
                                    isGraded: model.get("is_graded"),
                                    isPrivate: model.get("is_private"),
                                    isAnonymous: model.get("is_anonymous")
                                };
                                window.Daedalus.track(event_name, properties);
                                window.Daedalus.set_property("lastDiscussionCreated", new Date());
                            }.bind(this),
                            error: function (model, response) {
                                var message;
                                switch (response.status) {
                                    case 401:
                                        message = "You are not authorized to create a discussion topic.";
                                        break;
                                    default:
                                        message = "Unable to create a discussion at this time.";
                                }
                                panel.set({
                                    body: message,
                                    footer_buttons: {
                                        'Close': 'remove'
                                    }
                                });
                            }
                        });
                    }.bind(this)
                }
            });

            // Create discussion form to add topic
            var el = $('<div></div>');
            if (user.get('role') == 'teacher') {
                var discussion_form = el.composer([
                    {
                        id: 'name',
                        type: 'text',
                        label: 'Name',
                        validation: ['not_empty'],
                        tooltip: 'A short description of your discussion. E.g. "Why is the circle constant π?"',
                        placeholder: 'Discussion Name'
                    },
                    {
                        id: 'topic',
                        type: 'textarea',
                        label: 'Topic',
                        validation: ['not_empty'],
                        tooltip: 'Elaborate on the details of your discussion. E.g. "π is great, but it seems like τ would make a better circle constant."',
                        placeholder: 'Discussion Topic'
                    },
                    {
                        id: 'seen_by_select',
                        type: 'select',
                        options: [
                            'By everyone',
                            'Only by Professor'
                        ],
                        label: 'Responses can be seen:'
                    },
                    {
                        id: 'anonymous_select',
                        type: 'select',
                        label: 'Participants are anonymous to',
                        options: [
                            'No one',
                            'Everyone (can&apos;t be graded)',
                            'Fellow participants only'
                        ]
                    },
                    {
                        id: 'anonymous_select_warning',
                        type: 'html',
                        value: '<div class="discussion-warning"><img src="'+ site_data.settings.MEDIA_URL +'images/discussion/flag.png" alt="warning" /><p>Participants usernames are not stored. This cannot be changed.</p></div>'
                    },
                    {
                        id: 'anonymous_checkbox',
                        type: 'checkbox',
                        label: 'Participants are anonymous to the Professor and can\'t be graded.'
                    },
                    {
                        id: 'anonymous_checkbox_warning',
                        type: 'html',
                        value: '<div class="discussion-warning"><img src="'+ site_data.settings.MEDIA_URL +'images/discussion/flag.png" alt="warning" /><p>Participants usernames are not stored. This cannot be changed.</p></div>'
                    },
                    {
                        id: 'grading_fieldset',
                        type: 'fieldset',
                        label: '',
                        value: [
                            {
                                id: 'graded',
                                type: 'checkbox',
                                label: 'Graded',
                                tooltop: 'Discussion counts for grades, and appears in in the Gradebook'
                            },
                            {
                                id: 'correctness_score',
                                type: 'text',
                                numeric: true,
                                label: 'Correctness Mark',
                                value: '0.5',
                                validation: ['not_empty']
                            },
                            {
                                id: 'participation_score',
                                type: 'text',
                                numeric: true,
                                label: 'Participation Mark',
                                value: '0.5',
                                validation: ['not_empty']
                            }
                        ]
                    }
                ]);

                discussion_form.get('correctness_score').hide();
                discussion_form.get('participation_score').hide();
                discussion_form.get('anonymous_select_warning').hide();
                discussion_form.get('anonymous_checkbox_warning').hide();
                discussion_form.get('anonymous_checkbox').hide();
                discussion_form.get('seen_by_select').value('By everyone');
                discussion_form.get('anonymous_checkbox').value(false);
                discussion_form.get('anonymous_select').value('No one');

                // Bind actions on form. These alter the form in response
                // to user interaction.
                discussion_form.get('seen_by_select').bind('change', function (item) {
                    if (item.value() == 'Only by Professor') {
                        discussion_form.get('anonymous_select').hide();
                        discussion_form.get('anonymous_select_warning').hide();
                        discussion_form.get('anonymous_checkbox').show();
                    } else {
                        discussion_form.get('anonymous_select').show();
                        discussion_form.get('anonymous_checkbox').hide();
                        discussion_form.get('anonymous_checkbox_warning').hide();
                    }
                });
                discussion_form.get('anonymous_checkbox').bind('change', function (item) {
                    if (item.value()) {
                        discussion_form.get('anonymous_checkbox_warning').show();
                        discussion_form.get('grading_fieldset').hide();
                    } else {
                        discussion_form.get('anonymous_checkbox_warning').hide();
                        if (discussion_form.get('anonymous_select').value() !== 'Everyone (can\'t be graded)') {
                            discussion_form.get('grading_fieldset').show();
                        }
                    }
                });
                discussion_form.get('anonymous_select').bind('change', function (item) {
                    if (item.value() === 'Everyone (can\'t be graded)') {
                        discussion_form.get('anonymous_select_warning').show();
                        discussion_form.get('grading_fieldset').hide();
                    } else {
                        discussion_form.get('anonymous_select_warning').hide();
                        discussion_form.get('grading_fieldset').show();
                    }
                });
                discussion_form.get('graded').bind('change', function (item) {
                    if (item.value()) {
                        discussion_form.get('correctness_score').show();
                        discussion_form.get('participation_score').show();
                    } else {
                        discussion_form.get('correctness_score').hide();
                        discussion_form.get('participation_score').hide();
                    }
                });
            } else {
                var discussion_form = el.composer([
                    {
                        'id': 'name',
                        'type': 'text',
                        'label': 'Name',
                        'validation': ['not_empty'],
                        'tooltip': 'A short description of your discussion. E.g. "Why is the circle constant π?"',
                        'placeholder': 'Discussion Name'
                    },
                    {
                        'id': 'topic',
                        'type': 'textarea',
                        'label': 'Discussion Topic',
                        'tooltip': 'Elaborate on the details of your discussion. E.g. "π is great, but it seems like τ would make a better circle constant."',
                        'validation': ['not_empty'],
                        'placeholder': 'Discussion Topic'
                    }
                ])
            }
            var canvas_el = $(
                '<div><input type="submit" value="Attach canvas" ' +
                'name="toggle-canvas" class="canvas-toggle"></input>' +
                '<div class="canvas-wrapper" style="display:none"></div></div>'
            );

            var uploader_el = $('<div></div>');

            var canvas_background_uploader = uploader_el.composer([
                {
                    'id': 'background_image',
                    'type': 'upload',
                    'mime_types': 'image/bmp,image/jpeg,image/png,image/gif,image/tiff',
                    'autoUpload': !window.FileReader,
                    'label': 'Upload background image'
                }
            ]);

            var background_image = canvas_background_uploader.get('background_image');

            // If the client supports FileReader, we receive a change:data
            // event from the upload widget when the user chooses a file.
            // The data property contains a data URL of the image.
            background_image.bind('change:data', function () {
                canvas_el.find('div.canvas-wrapper').
                    expressionist('background_image', this.get('data'));
            });

            // If the client doesn't support FileReader, we receive a
            // change:image_url event from the upload widget when the chosen
            // file has been uploaded. The image_url property contains a URL
            // for the image.
            background_image.bind('change:image_url', function () {
                // We route the request through get_canvas in order to avoid
                // cross-domain issues when drawing the image to the canvas.
                var cleaned_url = /^[^#]*?:\/\/.*?(\/.*)$/.exec(this.value()[2]);
                cleaned_url = '//' + document.location.hostname + ':' +
                    document.location.port + '/get_canvas' + encodeURIComponent(cleaned_url[1]);

                canvas_el.find('div.canvas-wrapper').
                    expressionist('background_image', cleaned_url);
            });

            canvas_el.append(uploader_el.hide());
            canvas_el.find('input.canvas-toggle').toggle(function () {
                canvas_el.find('div.canvas-wrapper').show();
                uploader_el.show();
                $(this).text('Remove canvas').attr('value', 'Remove canvas');
            }, function () {
                canvas_el.find('div.canvas-wrapper').hide();
                uploader_el.hide();
                $(this).text('Attach canvas').attr('value', 'Attach canvas');
            });
            canvas_el.find('div.canvas-wrapper').expressionist({
                hidden: false,
                image_path: site_data.settings.MEDIA_URL + 'images/discussion/'
            });
            canvas_el.expressionist('clear');

            el.append(canvas_el);
            panel.$b().html( el );
        }
    });

    return DiscussionModule;
});
