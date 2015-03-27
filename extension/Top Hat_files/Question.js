/* global Houdini, panels, _ */
define([
    'modules/Module',
    'views/ModuleControl',
    'models/question/question',
    'util/daedalus',
    'text!templates/quickadd_image.html',
    'layouts/edumacation/LayoutCollection',
    'util/Browser',
    'models/UserSettings'
], function (
    Module,
    QuestionControlView,
    QuestionItem,
    Daedalus,
    quickadd_image_template,
    layouts,
    Browser,
    UserSettings
) {
    'use strict';
    var Question = Module.extend({
        current_form: undefined,
        defaults: _.extend({}, Module.prototype.defaults, {
            id: 'question',
            name: 'Questions',
            color: 'red',
            order: 2,
            model: QuestionItem,
            control_view: QuestionControlView,
            tree_actions: [{
                'group': 'Set Status',
                'items': [
                    {
                        'id': 'active_visible',
                        'title':'<b>Ask</b>(Active + Visible)',
                        'description': 'Online students will see the item. Students can submit answers.'
                    },
                    {
                        'id': 'visible',
                        'title':'<b>Show</b>(Visible)',
                        'description': 'Online students will see the item. Students can not submit answers.'
                    },
                    {
                        'id': 'active',
                        'title':'<b>Homework</b>(Active)',
                        'description': 'Assign item as homework to students.'
                    },
                    {
                        'id': 'review',
                        'title':'<b>Review</b>',
                        'description': 'Give students study items. Students can view answers.'
                    },
                    {
                        'id': 'inactive',
                        'title':'<b>Closed</b>(Inactive)',
                        'description': 'Only professors can access'
                    }
                ]
            }, {
                'group': 'Actions',
                'items': [
                    {id: 'Duplicate', instant: true, title: 'Duplicate Item'},
                    {id: 'Edit', instant: true, title: 'Edit Item'},
                    {id: 'Preview', instant: true, title: 'Preview Item'},
                    {id: 'Answers', instant: true, title: 'Show Answers'},
                    {id: 'Schedule', instant: true, title: 'Schedule Item'},
                    {id: 'students', instant: true, title: 'Assign to individuals'}
                ]
            }]
        }),

        initialize: function() {
            Module.prototype.initialize.call(this);
            Houdini.on('quickadd:add_screenshot', function(args) {
                var question_key = args.question_key;
                var image_url = args.image_url;
                var image_thumbnail_url = args.image_thumbnail_url;
                var question = require('Modules').get_module('question').items().findWhere({id: question_key});
                if (!question) { return; }
                var data = {
                    image_url: image_url,
                    image_thumbnail_url: image_thumbnail_url
                };
                question.set(data);
                var view = question.get('view');
                if(view && view.panel) {
                    var existing_image = view.panel.$b().find('.question_description_image');
                    if(existing_image.length === 0) {
                        var image = _.template(quickadd_image_template, data);
                        view.panel.$b().find('.question_description_content').after(image);
                    }
                }
            });


            Houdini.on('question:update_report', function(args) {
                var item_id = parseInt(args.module_item_key.match('[0-9].*'), 10);
                var item = this.get('items').get(item_id);
                if (item) {
                    // report data has weird requirements
                    // TODO: plz refactor update_report_data
                    //var data = {};
                    //data['All Data'] = args.data['All Data']
                    var result = {};
                    result[item.id] = {
                        name: 'Report',
                        data: args.data
                    };
                    item.update_report_data(result);
                }
            }.bind(this));
        },

        launch_question: function (tree,item)
        {
            //get dialog data from server
            var id = $(item).attr('id');
            require('Modules').get_module('question').get('items').get(id).set({ opened: true });
        },

        preview_dialog: function(tree, item) {
            var panel = panels.add({
                id: 'question_editor',
                layout: layouts.get('dialog'),
                module: 'question',
                color: 'red',
                title: 'Preview',
                body: $('#loading_template').html(),
                width: 520,
                footer_buttons: { 'Close': 'remove' }
            });

            var question_key = $(item).attr('id');
            var question = require('Modules').get_module('question').get('items').get(question_key);
            question.bind_body_el(panel.$b());

            // Set dialog title to the question title
            question.get_required_attributes_if_not_present(['title'], function() {
                panel.set({'title': question.get('title')});
            });
        },

        save_question: function(question_forms, callback, question, keep_adding) {
            // Perform client side validation
            var valid = true;
            _.each(question_forms, function (form) {
                if (!form.is_valid()) {
                    question_forms.question.get('validation_error').show();
                    question_forms.question.get('validation_error_dupl').hide();
                    question_forms.question.get('validation_error_timer').hide();
                    valid = false;
                }
            });

            // Validation for <= 0 time limit value
            // Show in top error container for greater visibility
            var time_limit = question_forms.timer.values().time_limit;
            if (parseInt(time_limit, 10) <= 0) {
                question_forms.question.get('validation_error').hide();
                question_forms.question.get('validation_error_dupl').hide();
                question_forms.question.get('validation_error_timer').show();
                return false;
            }

            // Validation for duplicate answers
            var answer_list = question_forms.question.values().choices;
            var case_sensitive = question_forms.question.values().case_sensitive;

            if (!case_sensitive) {
                answer_list = _.map(answer_list, function(answer) {
                    return answer.toLowerCase();
                });
            }

            if (answer_list.length !== _.uniq(answer_list).length) {
                question_forms.question.get('validation_error').hide();
                question_forms.question.get('validation_error_dupl').show();
                question_forms.question.get('validation_error_timer').hide();
                return false;
            }

            if (!valid) {
                return false;
            }

            var panel = panels.get('add_question');
            panel.loading();

            var data = question_forms.question.values_or_placeholders();
            data.profile = {};
            $.extend(data.profile, question_forms.timer.values());
            $.extend(data.profile, question_forms.grading.values());

            data.folder = this.get_folder_id_to_insert_into();

            var items = this.items();
            if (!question) {
                // wasn't given a question item, find or create it
                var items;
                var unitree_module = require('Modules').get_module('unitree');
                if (unitree_module.get('active')) {
                    items = unitree_module.get('items');
                } else {
                    items = this.items();
                }

                question = items.findWhere({
                    id: data.id
                }) || new QuestionItem();
            }

            question.save(data, {
                success: function() {

                    // there is a race condition with houdini here
                    // we might have already received the item from the tree update
                    // if not, we need to prevent the update from overriding this one
                    // var items = require('Modules').get_module('question').items();
                    var existing_item = items.get(question.id);
                    if (existing_item && existing_item !== question) {
                        question.off();
                        question = existing_item;
                    } else {
                        items.add(question);
                    }

                    panel.remove();
                    if (_.isFunction(callback)) {
                        callback();
                    }
                    // track it
                    var properties = {
                        moduleItemId: question.get('id'),
                        questionType: data.type
                    };
                    Daedalus.track('question created', properties);
                    Daedalus.increment('numQuestionsCreated');
                    Daedalus.set_property('lastQuestionCreated', new Date());

                    if (keep_adding) {
                        this.add_item();
                    }
                }.bind(this)
            });

            return true;
        },

        add_item: function() {
            //remove an exisitng dialog box, if there is one present
            if( panels.get('add_question') ) {
                panels.get('add_question').remove();
            }

            var question_module = this;
            var panel = panels.add({
                id: 'add_question',
                module: 'question',
                layout: layouts.get('dialog'),
                title: 'Create Question',
                width: 320,
                footer_buttons: {
                    'Cancel': 'remove',
                    'Next': function() {
                        //set loading screen
                        panel.loading();

                        //get user's 'advanced' settings
                        UserSettings.get(['question_advanced_settings'], function(settings) {
                            //add an 'advanced' class to the panel if the user has toggled advanced settings - this will
                            //resize the panel and show/hide elements
                            if(settings.question_advanced_settings) {
                                panel.$().addClass('advanced');
                            }

                            var type = form.get('type').value();
                            var question_item = new QuestionItem({ type: type });

                            var el = $('<div></div>');
                            var question_form = question_item.bind_editor_el( el );
                            var advanced_presentation_tool = (
                                settings.question_advanced_settings &&
                                Browser.is_presentation_tool());
                            panel.set({
                                'width': advanced_presentation_tool ? 596 : 500,
                                'footer_buttons': {
                                    'Cancel': {
                                        bt_class: 'danger',
                                        callback: 'remove'
                                    },
                                    'Back': {
                                        bt_class: 'danger',
                                        callback: function() { question_module.add_item(); }
                                    },
                                    'Save and create another': {
                                        bt_class: 'affirmative',
                                        callback: function() {
                                            question_module.save_question(question_form, null, question_item, true);
                                        }
                                    },
                                    'Save': {
                                        bt_class: 'affirmative highlight',
                                        callback: function() {
                                            question_module.save_question(question_form, null, question_item, false);
                                        }
                                    }
                                }
                            });
                            panel.$b().html( el );
                            if (advanced_presentation_tool) {
                                require('lobby/PresentationTool').resize_pt(600, 800);
                            }
                        }, [false]);
                    }
                }
            });
            var form = panel.$b().composer({
                'id': 'type',
                'type': 'radio',
                'options': {
                    'mc': 'Multiple Choice',
                    'wa': 'Word Answer',
                    'na': 'Numeric Answer',
                    'sort': 'Sorting Problem',
                    'match': 'Matching Problem',
                    'target': 'Click on Target'
                },
                'value': 'mc'
            });
        },

        add_question_text_help: function(el) {
            //add description for how to use math equations or code; there's no real way to do this with the form library
            var question_text_description = $('<a id="question_text_description" href="#">Click here for instructions on how to embed equations and code</a></span>');
            el.find('#cId_question').append(question_text_description);
            el.find('a#question_text_description').click(function(e) {
                e.preventDefault();
                panels.add({
                    id: 'question_text_description_details',
                    module: 'question',
                    layout: layouts.get('dialog'),
                    title: 'Adding mathematical equations',
                    body: '<p>Questions can contain mathematical formulas and computer code.</p><p>You may add mathematical equations by wrapping them around [math] and [/math] blocks. For example, `Mass-energy equivalence is defined as [math]e=mc^2[/math]`.</p><p>You may also add code by wrapping it around [code]void main()[/code] blocks.</p>',
                    footer_buttons: { 'Close': 'remove' }
                });
            });
        },

        question_ok_action: function question_ok_action()  {
            if(require('Modules').get_module('question').current_form.validate_form()) {
                return require('Modules').get_module('question').current_form.serialize_form();
            }
            return;
        }
    });

    return Question;
});
