/* globals _, Daedalus, Houdini, publisher, user, panels */
define([
    'models/ModuleItem',
    'models/question/answer',
    'views/question/content',
    'mixins/MultipleChoiceQuestion',
    'mixins/NumericQuestion',
    'mixins/WordQuestion',
    'mixins/SortQuestion',
    'mixins/MatchingQuestion',
    'mixins/ClickQuestion',
    'mixins/DefaultQuestion',
    'text!templates/question/question_form.html',
    'text!templates/question/editor_layout.html',
    'views/ModuleItemReport',
    'util/Dashboard',
    'util/accessibility',
    'layouts/edumacation/LayoutCollection',
    'models/UserSettings'
], function (
    ModuleItem,
    AnswerItem,
    QuestionContentView,
    MultipleChoiceQuestionItem,
    NumericQuestionItem,
    WordQuestionItem,
    SortQuestionItem,
    MatchingQuestionItem,
    ClickQuestionItem,
    DefaultQuestionItem,
    html,
    editor_html,
    ModuleItemReportView,
    Dashboard,
    Accessibility,
    layouts,
    UserSettings
) {
    'use strict';
    var QuestionItem = ModuleItem.extend({
        template: _.template(html),
        urlRoot: '/api/v1/question/',
        view_type: QuestionContentView,
        idAttribute: 'resource_uri',
        defaults: _.extend({}, ModuleItem.prototype.defaults, {
            module: 'question',
            module_color: 'red',
            submission_msg: '',
            //represents state of question model when it is first initialized
            //before it is fetched and it's true statue is set
            //Used to check status in session creation
            status: 'uninitialized',
            correct_answers: [],
            layout_type: 'regular'
        }),
        get_required_attributes: function (cb, proxy) {
            if (_.isUndefined(this.id) && _.isUndefined(this.get('id'))) {
                // we can't call fetch() without an id :(
                return $.Deferred().resolve();
            }
            return this.fetch({
                success: function () {
                    this.set(this.get('custom_data'));
                    if (!_.isUndefined(cb)) {
                        cb.call(proxy);
                    }
                }.bind(this)
            });
        },
        toJSON: function () {
            return _.omit(this.attributes, ['view', 'reports']);
        },
        button_list: function () {
            var BUTTONS = this.BUTTONS;
            var buttons_dict = {
                teacher: {
                    active_visible: [BUTTONS.CLOSE, BUTTONS.DISABLE_SUBMISSIONS],
                    visible: [BUTTONS.CLOSE, BUTTONS.ENABLE_SUBMISSIONS],
                    active: [BUTTONS.CLOSE, BUTTONS.DISABLE_SUBMISSIONS],
                    review: [BUTTONS.CLOSE, BUTTONS.ENABLE_SUBMISSIONS],
                    inactive: []
                },
                student: {
                    active_visible: [BUTTONS.SUBMIT],
                    visible: [],
                    active: [BUTTONS.CLOSE, BUTTONS.SUBMIT],
                    review: [BUTTONS.CLOSE],
                    inactive: []
                }
            };

            this._set_close_and_ask_next_button(buttons_dict);

            var buttons = buttons_dict[window.user.get('role')][this.get('status')];
            if (_.isUndefined(buttons)) {
                return [];
            }
            var button_to_push;

            // if user is a professor, add a magnify or demagnify button
            if (window.user.is_teacher() && this.get('status') !== 'inactive') {
                if (this.get('has_correct_answer')) {
                    if (this.get('show_answer')) {
                        button_to_push = BUTTONS.HIDE_ANSWER;
                    } else {
                        button_to_push = BUTTONS.SHOW_ANSWER;
                    }
                    buttons.push(button_to_push);
                }

                if (this.get('is_magnified')) {
                    button_to_push = BUTTONS.DEMAGNIFY;
                } else {
                    button_to_push = BUTTONS.MAGNIFY;
                }

                var button_position = buttons.length;
                if (window.user.is_teacher()) {
                    button_position = 0;
                }
                buttons.splice(button_position, 0, button_to_push);
            }

            if (window.user.is_student() && this.get('status') === 'review') {
                if (this.get('has_correct_answer')) {
                    if (this.get('show_answer')) {
                        button_to_push = BUTTONS.HIDE_ANSWER;
                    } else {
                        button_to_push = BUTTONS.SHOW_ANSWER;
                    }
                    buttons.push(button_to_push);
                }
            }

            return buttons;
        },

        _set_close_and_ask_next_button: function (buttons_dict) {
            var BUTTONS = this.BUTTONS;
            if(window.user.is_teacher()) {
                var question_module_items = require('Modules').get_module_unitree('question').items();
                var num_active_or_visible_questions = question_module_items.reduce(
                    function (total, mi) {
                        if (mi.get('module') !== 'question') {
                            return total;
                        }
                        var mi_status = mi.get('status');
                        if (mi_status === 'active_visible' || mi_status === 'visible') {
                            return total + 1;
                        }
                        return total;
                    }, 0
                );
                if (num_active_or_visible_questions !== 1) {
                    return;
                }
                //can always see module item button placement
                var button_position = 0;
                buttons_dict.teacher.active_visible.splice(
                    button_position, 0, BUTTONS.CLOSE_AND_ASK_NEXT);
                buttons_dict.teacher.visible.splice(
                    button_position, 0, BUTTONS.CLOSE_AND_ASK_NEXT);
            }
        },

        broadcast_active_content: function (show_answer) {
            var event_name;
            if (show_answer) {
                event_name = 'active_content_show_answer';
            }
            else {
                event_name = 'active_content_hide_answer';
            }
            Houdini.broadcast(
                this.user_channel,
                event_name,
                {
                    module_item_id: this.get('id'),
                    module_id: this.get('module')
                }
            );
        },
        button_callbacks: $.extend({}, ModuleItem.prototype.button_callbacks, {
            'Submit': function (mi) {
                var validate_answer = mi.get_subclass_fn('validate_answer');
                // this function isn't defined for all classes
                if (_.isFunction(validate_answer) && !validate_answer(mi)) {
                    return;
                }

                var answer_text = mi.get_student_answer( mi.get('view').panel.$b('.question_content') );

                //check that an answer has been provided
                if( !answer_text ) {
                    Accessibility.SR_alert('Please provide an answer.');
                    mi.set({ submission_msg: 'Please provide an answer.'});
                    return false;
                }
                //put a submitting animation so that user knows something is happening
                Accessibility.SR_alert('Submitting');
                mi.set({ submission_msg: 'Submitting...'});
                var answer = mi.get('answer');

                var is_anonymous = mi.get('is_anonymous');

                answer.save({response: answer_text}, {
                    wait: true,
                    success: function () {
                        answer.trigger('change:response');
                        // OK get ready for hacks
                        if (mi.get('type') === 'mc' && !mi.get('all_correct')) {
                            var index = answer_text.charCodeAt(0) - 97;
                            answer_text = mi.get('choices')[index];
                        } else if (mi.get('type') === 'mc' && mi.get('all_correct')) {
                            answer_text = answer_text.join('|,,| ');
                        }

                        mi.set({submission_msg: ''});
                        mi.trigger('answered');

                        if (is_anonymous) {
                            mi.clear_answer(mi.get('view').panel.$b('.question_content'));
                        }

                        answer.trigger('button:refocus');
                    },
                    error: function (model, response) {
                        var msg;
                        switch(response.status) {
                            case 401:
                                if (response.responseText === 'EnrollmentType' && user.get('is_anonymous_account')) {
                                    msg = 'Anonymous access is currently not allowed.';
                                } else if (response.responseText.search('clicker')) {
                                    msg = response.responseText;
                                } else {
                                    msg = 'You are not authorized to submit an answer.';
                                }
                                break;
                            default:
                                msg = 'Unable to submit answer! Please retry.';
                                break;
                        }

                        Accessibility.SR_alert(msg);
                        mi.set({ submission_msg: msg });
                    }
                }).always(function (a, textStatus, b) {
                    // Because the jQuery .always promise is retarded
                    var status;
                    if (b.status !== undefined) {
                        status = b.status;
                    } else {
                        status = a.status;
                    }
                    Dashboard.event('submission_attempt', {
                        'item_id': mi.get('id'),
                        'response_code': status
                    });
                });
                return true;
            },
            'Show Answer': {
                icon: 'show',
                bt_class: 'affirmative',
                callback: function (mi) {
                    // TODO: replace buttons with ACTUAL BUTTON OBJECTS!
                    var properties = {
                        moduleItemId: mi.get('id'),
                        questionType: mi.get('type')
                    };
                    Daedalus.track('showed answer',properties);
                    Daedalus.increment('numShowedAnswer');
                    mi.set({ show_answer: true });
                    mi.broadcast_active_content(true);
                    mi.set_buttons();
                }
            },
            'Hide Answer': {
                icon: 'hide',
                bt_class: 'affirmative',
                callback: function (mi) {
                    // TODO: replace buttons with ACTUAL BUTTON OBJECTS!
                    var properties = {
                        moduleItemId: mi.get('id'),
                        questionType: mi.get('type')
                    };
                    Daedalus.track('hide answer',properties);
                    mi.set({ show_answer: false });
                    mi.broadcast_active_content(false);
                    mi.set_buttons();
                }
            },
            'Next': function () {
                //TODO: Get this to work! Check the history.
                return false;
            }
        }),
        set_submission_msg: function (state) {
            var el = this.get('panel').$b();
            $(el).find('.submission_msg').remove();
            $(el).find('.ui-effects-wrapper').remove(); //the toxic waste of the jquery effect
            if( state === 'show' ) {
                $(el).append('<div class="submission_msg">Submitting...</div>');
                if( jQuery().effect ) {
                    $(el).find('.submission_msg').effect( 'bounce', { 'times' : 10 }, 1000 );
                }

            } else if( state === 'empty' ) {
                $(el).append('<div class="submission_msg">Please provide an answer.</div>');
            }

        },
        initialize: function () {
            ModuleItem.prototype.initialize.call(this);
            this.on('change:image_url', function () {
                // TODO: find out why this is happening
                if (this.get('image_url') === null && _.isString(this.previous('image_url'))) {
                    this.set({image_url: this.previous('image_url')});
                }
            });

            if (window.user.is_student()) {
                this.set({
                    answer: new AnswerItem({id: this.get('id')})
                });
                var item_status = this.get('status');
                if (this.get('id') && item_status !== 'inactive' && item_status !== 'uninitialized') {
                    this.get('answer').fetch();
                }
            } else if (window.user.is_teacher()) {
                this.get('timer').bind('change:running', this.setup_timer, this);
            }

            if (this.is_visible()) {
                this.trigger('opened');
            }

            /**
            * Channel for broadcasting events to this user.
            */
            this.user_channel = 'user.' + window.user.get('id');

            this.on('action', function (action) {
                var panel;
                var that = this;
                if (action === 'Answers') {
                    var report_view = new ModuleItemReportView({ model:  this });
                    panel = panels.add({
                        id: 'answers_panel',
                        layout: layouts.get('dialog'),
                        title: 'Answers',
                        color: this.module().get('color'),
                        body: $('#loading_template').html(),
                        width: 640,
                        footer_buttons: {
                            'Close': function () {
                                report_view.remove();
                                panel.remove();
                            }
                        }
                    });
                    this.get_required_attributes(function () {
                        panel.$b().empty().append(report_view.el);
                        report_view.render();
                    }.bind(this));
                } else if (action === 'Preview') {
                    panel = panels.add({
                        id: 'preview_panel',
                        layout: layouts.get('dialog'),
                        title: 'Preview',
                        color: this.module().get('color'),
                        body: $('#loading_template').html(),
                        width: 520,
                        footer_buttons: { 'Close': 'remove' }
                    });
                    this.get_required_attributes(function () {
                        panel.set({ title: this.get('title') });
                        var QuestionDetailsView = require('views/question/details');
                        var details_view = new QuestionDetailsView({ model: this });

                        panel.$b().html(details_view.render().el);
                        this.get_subclass_fn('show_answers_in_preview_form').apply(this, [details_view]);
                    }.bind(this));

                    panel.bind('remove', function () {
                        that.unset('view');
                    });

                }
            });

            this.on('change:status', function () {
                var new_status = this.get('status');

                // No need to hide answer if we disable submissions
                // and answer is visible
                if (new_status !== 'visible') {
                    this.set({show_answer: false});
                    this.broadcast_active_content(false);
                }

                if (new_status !== 'inactive' && window.user.get('role') === 'student') {
                    this.get('answer').fetch();
                }
            }, this);

            this.set(this.get('custom_data'));
            this.on('change:custom_data', function () {
                this.set(this.get('custom_data'));
            }.bind(this));

            if (!require('util/Browser').is_sandbox_app) {
                var question_items = require('Modules').get_module('question').items();
                this.listenTo(question_items, 'change', function () {
                    this.set_buttons();
                }, this);
                this.listenTo(require('Modules').get_module('unitree'), 'change:active', function (unitree, active) {
                    if (!active) {
                        return;
                    }
                    this.stopListening(question_items, 'change');
                    this.listenTo(unitree.items(), 'change', function () {
                        this.set_buttons();
                    }, this);
                }, this);
            }
        },

        setup_timer: function () {
            if (this.get('view') === undefined) {
                return;
            }
            var panel_el;
            var panel = this.get('view').panel;
            if(!panel) { return; }

            if (window.user.is_teacher()) {
                panel_el = panel.get_tab_el(this.get('id') + '_details');
            } else {
                panel_el = panel.$el();
            }

            if(this.get('profile') && this.get('profile').is_timed) {
                $('#question_timer', panel_el).toggle(true);
                $(panel_el).addClass('has_timer');
            } else {
                $('#question_timer', panel_el).toggle(false);
                $(panel_el).removeClass('has_timer');
            }

            if(this.get('timer').get('running')) {
                //bind a new view onto the module item timer
                var el = this.get('timer').initialize_view();
                $(panel_el).addClass('has_timer');
                $('#question_timer', panel_el).html(el);
                if(this.get('status') === 'active_visible') {
                    this.get('timer').play();
                } else {
                    this.get('timer').set({ running: false });
                }
            } else {
                if (this.get('timer')._timer._secondsRemaining === 0) {
                    // why does the timer model have a _timer model?
                    // TODO: rewrite timers
                    $(panel_el).removeClass('has_timer');
                    $('#question_timer', panel_el).empty();
                }
            }
        },
        preview_dialog: function () {
            var panel = panels.add({
                id: 'preview_dialog',
                layout: layouts.get('dialog'),
                module: this.module().id,
                color: this.module().get('color'),
                title: 'Preview',
                body: [['loading','','']],
                width: 520,
                footer_buttons: { 'Close': 'remove' }
            });

            // Set dialog title to the question title
            this.get_required_attributes_if_not_present(['title'], function () {
                panel.set({'title': this.get('title')});
            }.bind(this));

            // Render question into panel
            var QuestionDetailsView = require('views/question/details');
            var question_details_view = new QuestionDetailsView({
                model: this,
                el: panel.$b()
            });

            panel.bind('remove', function () {
                question_details_view.remove();
                question_details_view.unbind();
            });

        },

        edit_dialog: function () {
            ModuleItem.prototype.edit_dialog.call(this);

            var save_callback = $.proxy(function () {
                this.get_required_attributes();
            }, this);

            //get user's 'advanced' settings
            var panel = panels.add({
                id: 'add_question',
                module: 'question',
                layout: layouts.get('dialog'),
                width: 420,
                title: 'Edit Question',
                body: $('#loading_template').html(),
                footer_buttons: {
                    'Cancel': 'remove',
                    'Save': function () {
                        require('Modules').get_module('question').save_question(question_forms, save_callback);
                    }
                }
            });

            var question_forms;
            this.get_required_attributes(function () {
                var el = $('<div></div>');
                question_forms = this.bind_editor_el( el );
                panel.$b().html( el );
            }.bind(this));
            window.question_forms = question_forms;

            UserSettings.get(['question_advanced_settings'], $.proxy(function(settings) {
                //add an 'advanced' class to the panel if the user has toggled advanced settings - this will
                //resize the panel and show/hide elements
                if( settings.question_advanced_settings ) {
                    panel.$().addClass('advanced');
                }
            }, this), [false]);
        },

        //attempts to get type from `type` property; if that fails, attempts to get it from id
        get_type: function () {
            return this.get('type');
        },
        /* designed to be extended */
        get_subclass_fn: function (fn_name) {
            var obj;
            switch( this.get_type() ) {
                case 'mc':
                    obj = MultipleChoiceQuestionItem;
                    break;
                case 'wa':
                    obj = WordQuestionItem;
                    break;
                case 'na':
                    obj = NumericQuestionItem;
                    break;
                case 'sort':
                    obj = SortQuestionItem;
                    break;
                case 'match':
                    obj = MatchingQuestionItem;
                    break;
                case 'target':
                    obj = ClickQuestionItem;
                    break;
                default:
                    obj = DefaultQuestionItem;
                    break;
            }
            if( obj[fn_name] ) {
                return obj[fn_name];
            } else {
                return DefaultQuestionItem[fn_name];
            }

        },
        get_subclass_readable_strings: function () {
            switch(this.get_type()) {
                case 'mc':
                    return {
                        type: 'Multiple Choice',
                        description: '<p>Students may pick from a list of answers.</p><p>Multiple correct answers may be specified.</p>'
                    };
                case 'wa':
                    return {
                        type: 'Word Answer',
                        description: '<p>Answers are composed of alphanumeric characters.</p><p>Multiple correct answers may be specified.</p>'
                    };
                case 'na':
                    return {
                        type: 'Numeric Answer',
                        description: 'Answers are only allowed to be numeric characters.'
                    };
                case 'sort':
                    return {
                        type: 'Sorting',
                        description: 'Students sort options in a list into the correct order.'
                    };
                case 'match':
                    return {
                        type: 'Matching',
                        description: 'Students match items in a list with their counterparts in another list.'
                    };
                case 'target':
                    return {
                        type: 'Click',
                        description: 'Students click on parts of an image.'
                    };

                default:
                    return {};
            }
        },
        bind_editor_el: function (el, save_callback_fn) {
            var grading_form_content = $('<div id="grading_form"></div>');
            var grading_form = grading_form_content.composer([
                {
                    'id': 'correctness_score',
                    'type': 'text',
                    'numeric': true,
                    'label': 'Correctness mark',
                    'validation': ['not_empty', 'num_greater_than_equal' ],
                    'num_greater_than_equal': 0
                },
                {
                    'id': 'participation_score',
                    'type': 'text',
                    'numeric': true,
                    'label': 'Participation mark',
                    'validation': ['not_empty', 'num_greater_than_equal' ],
                    'num_greater_than_equal': 0
                }
            ]);
            var timer_form_content = $('<div id="timer_form"></div>');
            var timer_form = timer_form_content.composer([
                {
                    'id': 'is_timed',
                    'type': 'checkbox',
                    'label': 'Timer enabled'
                },
                {
                    'id': 'time_limit',
                    'type': 'text',
                    'numeric': true,
                    'label': 'Time limit (seconds)',
                    'validation': ['not_empty', 'num_greater_than' ],
                    'num_greater_than': 0
                }
            ]);

            // Guess a question title
            var title_placeholder;
            var tree = require('Modules').get_module_unitree('question').get('tree');
            var num_questions = tree.flatten(true).reduce(function (count, item) {
                if (item.get('item_type') === 'module_item' &&
                        item.get('module_id') === 'question') {
                    count += 1;
                }
                return count;
            }, 0);
            title_placeholder = 'Question ' + (num_questions + 1);

            var question_model = this;

            var q_form = [
                {
                    'id': 'id',
                    'type': 'hidden'
                },
                {
                    'id': 'type',
                    'type': 'hidden',
                    'value': this.get('type')
                },
                {
                    'id': 'validation_error',
                    'type': 'html',
                    'value': 'Some of the settings you provided aren\'t allowed. Click on the red exclamation (!) icons for details.',
                    'class': 'validation'
                },
                {
                    'id': 'validation_error_dupl',
                    'type': 'html',
                    'value': 'Some of the settings you provided aren\'t allowed. Please remove duplicate answer entries.',
                    'class': 'validation'
                },
                {
                    'id' : 'validation_error_timer',
                    'type': 'html',
                    'value': 'Some of the settings you provided aren\'t allowed. Please set time limit to be greater than 0.',
                    'class': 'validation'
                },
                {
                    'id': 'title',
                    'type': 'text',
                    'label': 'Title',
                    'placeholder': title_placeholder,
                    'change': function () {
                        /*
                        We don't have validation for this function, because if the user does not enter a value we will get the value
                        of the placeholder automatically, thanks to the .values_or_placeholders() method we call on the form. However,
                        if the user just enters spaces, we'll be in trouble. Therefore we do a check against a blank input every time
                        the value is changed
                        */
                        if( this.value().match(/^\s+$/) ) {
                            this.value('');
                        }
                    }
                },
                {
                    'id': 'question',
                    'type': 'textarea',
                    'label': 'Question',
                    'placeholder': this.get_subclass_fn('placeholders').description,
                    'change': function () {
                        /*
                        We don't have validation for this function, because if the user does not enter a value we will get the value
                        of the placeholder automatically, thanks to the .values_or_placeholders() method we call on the form. However,
                        if the user just enters spaces, we'll be in trouble. Therefore we do a check against a blank input every time
                        the value is changed
                        */
                        if( this.value().match(/^\s+$/) ) {
                            this.value('');
                        }
                    }

                },
                {
                    'id': 'question_fields',
                    'type': 'fieldset',
                    'collapsible': false,
                    'collapsed': false,
                    'label': ''
                },
                {
                    'id': 'active_immediately',
                    'type': 'checkbox',
                    'label': 'Activate question immediately after creation',
                    'value': false,
                    'change': function () {
                        UserSettings.set({'question_active_immediately': this.value()}); //update global settings
                    }
                },
                {
                    'id': 'advanced',
                    'type': 'checkbox',
                    'label': 'Show advanced settings',
                    'set': function () {
                        var panel = panels.get('add_question');
                        var img_data = this.collection.get('image_data');
                        var has_correct_answer = this.collection.get('has_correct_answer');
                        var is_anonymous = this.collection.get('is_anonymous');
                        var all_correct = this.collection.get('all_correct');
                        if( this.value() ) {
                            if( img_data ) { img_data.show(); }
                            if ( !is_anonymous.get('value') && has_correct_answer ) {
                                has_correct_answer.show();
                            }
                            if (panel) {
                                panel.$().addClass('advanced');
                                panel.set({width: 596});
                            }
                            if (all_correct) {
                                all_correct.show();
                            }
                        } else {
                            if( img_data ) { img_data.hide(); }
                            if( has_correct_answer ) { has_correct_answer.hide(true); }
                            if (panel) {
                                panel.$().removeClass('advanced');
                                panel.set({width: 500});
                            }
                            if (all_correct) {
                                all_correct.hide();
                            }
                        }
                    },
                    'change': function () {
                        UserSettings.set({'question_advanced_settings': this.value()}); //update global settings
                    }
                },
                {
                    'id': 'is_anonymous',
                    'type': 'checkbox',
                    'label': 'Anonymous Question',
                    'set': function () {
                        // Only display option if this is a new question, and disable setting after.
                        if (question_model.id) {
                            this.get('el').hide();
                        }

                        var has_correct_answer = this.collection.get('has_correct_answer');
                        var advanced_settings = this.collection.get('advanced');
                        if ( this.value() ) {
                            if ( has_correct_answer ) {
                                has_correct_answer.hide(true);
                                has_correct_answer.set('value', false);
                            }

                            // Hackish - hide grading form and title
                            $(el).find('#grading_form').hide();
                            $(el).find('#accordion').find('h3:contains(Grading)').hide();
                        } else {
                            if ( has_correct_answer ) {
                                has_correct_answer.set('value', true);
                            }
                            if ( has_correct_answer && advanced_settings && advanced_settings.get('value') ) {
                                has_correct_answer.show(true);
                            }
                            // Hackish - unhide grading form and title
                            $(el).find('#grading_form').show();
                            $(el).find('#accordion').find('h3:contains(Grading)').show();
                        }
                    },
                    'value': false
                },
                {
                    'id': 'has_correct_answer',
                    'type': 'checkbox',
                    'label': 'Question has a correct answer',
                    'value': true,
                    'hidden': true,
                    'change': function() {
                        question_form.is_valid();
                    }
                },
                {
                    'id': 'image_data',
                    'type': 'fieldset',
                    'collapsible': false,
                    'collapsed': false,
                    'hidden': true,
                    'label': '',
                    'value': [
                        {
                            'id': 'image_key',
                            'type': 'upload',
                            'validation': ['upload_completed', 'image_if_not_empty'],
                            'mime_types': 'image/bmp,image/jpeg,image/png,image/gif,image/tiff',
                            size_warning: true,
                            'label': 'Upload description image'
                        },
                        {
                            'id': 'layout_type',
                            'type': 'radio',
                            'options': {
                                'regular': '<img src="https://s3.amazonaws.com/thm-media/media/production_3-04-06/images/question/question_layout_regular.png" title="Regular layout" style="margin-top:3px;">',
                                'large': '<img src="https://s3.amazonaws.com/thm-media/media/production_3-04-06/images/question/question_layout_large.png" title="Large image layout" style="margin-top:3px;">'
                            },
                            'value': 'regular',
                            'inline': true,
                            'hidden': true,
                            'label': 'Image layout'
                        }
                    ]
                }
            ];

            var question_form_content = $('<div id="question_form"></div>');
            var question_form = question_form_content.composer(q_form);

            if (this.get('image_url')) {
                // Show the layout options if there's an image attached
                question_form.get('layout_type').show();
            }

            // Show the layout options if the user uploads and image
            question_form.get('image_key').bind('change', function () {
                if (this.get('value')) {
                    question_form.get('layout_type').show();
                }
            });

            timer_form.values({
                'is_timed': (
                    this.get('id') ?
                    this.get('profile').is_timed :
                    publisher.profiles.question.is_timed
                ),
                'time_limit': (
                    this.get('id') ?
                    this.get('profile').time_limit :
                    publisher.profiles.question.time_limit
                )
            });
            grading_form.values({
                'correctness_score': (
                    this.get('id') ?
                    this.get('profile').correctness_score :
                    publisher.profiles.question.correctness_score
                ),
                'participation_score': (
                    this.get('id') ?
                    this.get('profile').participation_score :
                    publisher.profiles.question.participation_score
                )
            });

            question_form =  this.get_subclass_fn(
                'bind_editor_el'
            ).apply(
                this,
                [
                    null,
                    question_form,
                    save_callback_fn
                ]
            );

            question_form.get('has_correct_answer').bind('change', function () {
                if(!this.value()) {
                    grading_form.get('correctness_score').hide();
                } else {
                    grading_form.get('correctness_score').show();
                }
            });
            if (!question_form.get('has_correct_answer').value()) {
                grading_form.get('correctness_score').hide();
            }

            //some of the form's values are based on global settings - we get those now
            UserSettings.get(['question_advanced_settings', 'question_active_immediately'], function(settings) {
                // values doesn't call any 'set' callbacks
                question_form.get('advanced').set(settings.question_advanced_settings);
                question_form.values({
                    'advanced': settings.question_advanced_settings,
                    'active_immediately': settings.question_active_immediately
                });
            }, [false, true]);

            //hide the validation form - for some reason, setting 'hidden': true does not seem to work for html type form elements
            //remove this when the issue is fixed in composer
            question_form.get('validation_error').hide();
            question_form.get('validation_error_dupl').hide();
            question_form.get('validation_error_timer').hide();

            el.html(_.template(editor_html)(this.get_subclass_readable_strings()));
            $('#question_form_target', el).replaceWith(question_form_content);
            $('#grading_form_target', el).replaceWith(grading_form_content);
            $('#timer_form_target', el).replaceWith(timer_form_content);
            $(el).find('#accordion').accordion();
            require('Modules').get_module('question').add_question_text_help(el);

            if (question_form.get('is_anonymous').value()) {
                // Total hack to hide grading form when editing anonymous questions
                // Hackish - hide grading form and title
                $(el).find('#grading_form').hide();
                $(el).find('#accordion').find('h3:contains(Grading)').hide();
            }

            return {
                'question': question_form,
                'grading': grading_form,
                'timer': timer_form
            };
        },
        bind_student_answer_form: function(el, preview_panel) {
            this.get_subclass_fn('bind_student_answer_form').apply(this, [el]);

            //show the correct answer, if it has been toggled
            if (this.get('show_answer') && _.isUndefined(preview_panel)) {
                this.get_subclass_fn('show_answer_in_answer_form').apply(this);
            }
        },
        get_student_answer: function(el) {
            return this.get_subclass_fn('get_student_answer').apply(this, [el]);
        },
        clear_answer: function(el) {
            return this.get_subclass_fn('clear_answer').apply(this, [el]);
        }
    });
    return QuestionItem;
});
