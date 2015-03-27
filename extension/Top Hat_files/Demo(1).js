/* globals _, publisher, course, panels, flash_preloader */
define([
    'models/ModuleItem',
    'views/demo/content',
    'views/ModuleItemReport',
    'layouts/edumacation/LayoutCollection',
    'text!templates/demo/embed_demo_flash.html',
    'text!templates/demo/embed_demo_js.html',
    'text!templates/demo/demo_unavailable.html',
    'text!templates/demo/demo_sms.html',
    'util/Browser'
], function (
    ModuleItem,
    DemoContentView,
    ModuleItemReportView,
    layouts,
    flash_html,
    js_html,
    unavailable_html,
    demo_sms,
    Browser
) {
    'use strict';

    var DemoItem = ModuleItem.extend({
        view_type: DemoContentView,
        defaults: $.extend({}, ModuleItem.prototype.defaults, {
            'module': 'demo',
            'module_color': 'orange',
            'questions': [],
            'correct_answers': ['Correct']
        }),
        initialize: function() {
            ModuleItem.prototype.initialize.call(this);
            //if user is a prof, submit discovered questions to server every time they are discovered
            if (window.user.is_teacher()) {
                this.on('demo_questions_discovered', function(questions) {
                    publisher.send({
                        module: 'demo',
                        command: 'add_demo_questions',
                        args: {
                            'demo_target_id' : this.get('id'),
                            'array_of_demo_question_names' : questions
                        }
                    });
                }.bind(this));
            }

            if (this.is_visible()) {
                this.trigger('opened');
            }
            if (window.user.is_teacher()) {
                this.get('timer').bind('change:running', this.setup_timer, this);
            }

            this.on('action', function(action) {
                var panel;
                if (action === 'Answers') {
                    var report_views = [];
                    panel = panels.add({
                        id: 'answers_panel',
                        layout: layouts.get('dialog'),
                        title: 'Answers',
                        color: this.module().get('color'),
                        body: [['loading...', '', '']],
                        width: 520,
                        footer_buttons: { 'Close': function () {
                                _.each(report_views, function (report_view) {
                                    report_view.remove();
                                });
                                panel.remove();
                            }
                        }
                    });
                    panel.remove_tab(0);
                    this.get_required_attributes(function() {
                        var questions = this.get('questions');
                        _.each(questions, function(question_name, question_id) {
                            panel.add_tab(question_id + 'report_preview', question_name, '');
                            var report_el = panel.get_tab_el(question_id + 'report_preview');
                            var report_view = new ModuleItemReportView({
                                model: this,
                                report_id: question_id
                            });
                            report_view.render();
                            report_views.push(report_view);
                            report_el.html(report_view.el);
                        }.bind(this));
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
                    if (this.is_visible()) {
                        panel.$b().html('This demo is already visible. Visible demos cannot be previewed.');
                    } else {
                        this.get_required_attributes(function() {
                            var DemoDetailsView = require('views/demo/details');
                            panel.set({ title: this.get('title') });
                            var details_view = new DemoDetailsView({ model:  this });
                            panel.$b().html(details_view.render().el);
                        }.bind(this));
                    }
                }
            });
        },
        setup_timer: function() {
            var panel_el;
            if (!this.get('view')) { return; }
            var panel = this.get('view').panel;
            if(!panel) { return; }
            if (window.user.is_teacher()) {
                panel_el = panel.get_tab_el(this.id + '_details');
            } else {
                panel_el = panel.$el();
            }
            if(this.get('timer').get('running')) {
                //bind a new view onto the module item timer
                var el = this.get('timer').initialize_view();
                $('#demo_timer', panel_el).html(el);
                if(this.get('status') === 'active_visible') {
                    this.get('timer').play();
                } else {
                    this.get('timer').set({ running: false });
                }
            } else {
                this.get('timer').pause();
                if (this.get('timer')._timer._secondsRemaining === 0) {
                    $('#demo_timer', panel_el).empty();
                }
            }
        },
        button_list: function() {
            var BUTTONS = this.BUTTONS;
            var buttons_dict = {
                teacher: {
                    active_visible: [BUTTONS.CLOSE],
                    visible: [BUTTONS.CLOSE],
                    active: [BUTTONS.CLOSE, BUTTONS.CLOSE],
                    review: [BUTTONS.CLOSE, BUTTONS.CLOSE],
                    inactive: []
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

            // if user is a professor, add a magnify or demagnify button
            var button_to_push;
            if (window.user.is_teacher() && this.get('status') !== 'inactive') {
                if (this.get('is_magnified')) {
                    button_to_push = BUTTONS.DEMAGNIFY;
                } else {
                    button_to_push = BUTTONS.MAGNIFY;
                }
                buttons.push(button_to_push);
            }

            return buttons;
        },
        thm_demo_watchdog : undefined,
        thm_demo_min_framerate : undefined,
        thm_demo_max_framerate : undefined,
        thm_demo_avg_framerate : undefined,
        thm_demo_framerate_warning : false,

        bind_student_answer_list: function(el) {
            this.bind_set('student_answers', function() {
                if (
                    this.get('type') === 'thm_demo' ||
                    this.get('type') === 'html5' ||
                    Browser.is_mobile()
                ) {
                    return false; //THM Demos do not currently update the student answers list, so we've disabled this for them
                }

                var question_list_struct_el = $('<div><span>Questions:</span><ul></ul><div style="clear:both;"></div></div>');
                var question_list_el = question_list_struct_el.find('ul');

                var student_answers = this.get('student_answers');
                _.each(student_answers, function (answer) {
                    question_list_el.append('<li class="' + answer.status + '">' + answer.name + '</li>');
                });

                $(el).html(question_list_struct_el);
            });
        },
        render_body: function(callback) {
            //determine the template to render
            var template;
            if( (this.get('type') === 'flash_file') && (Browser.is_web() || Browser.is_presentation_tool()) ) {
                template = flash_html;
            } else if (this.get('type') === 'thm_demo' && !Browser.is_mobile()) {
                template = js_html;
            } else  {
                template = unavailable_html;
            }

            this.render_sms(function(sms_html) {
                var data = {
                    'number_of_questions': this.get('number_of_questions'),
                    'demo_name': this.get('demo_name'),
                    'js_object_id': this.get('id'),
                    'key': this.get('key'),
                    'sms_html': sms_html,
                    'moduleitemid': this.id,
                    'MEDIA_URL': window.site_data.settings.MEDIA_URL
                };

                var html = _.template(template)(data);
                callback(undefined, $(html));
                if(this.get('type') === 'flash_file') {
                    flash_preloader.embed(this.get('demo_name'), this.get('flash_src'));
                }
            }.bind(this));
        },

        render_sms: function(cb) {
            var data = {
                enabled: (course.get('sms_enabled') && this.get('sms_code') && (this.get('status') === 'active_visible')) ? true : false,
                code: this.get('sms_code'),
                phone_number: this.get('sms_phone_number'),
                type: this.get('type')
            };
            cb(_.template(demo_sms)(data));
        },

        get_demo_function: function(function_name) {
            if (this.get('type') === 'flash_file') {
                return document.getElementById(this.get('demo_name'))[function_name];
            } else {
                // Demo is JS demo
                var iframe_el = this.get('panel').get('view').$('iframe');
                if( iframe_el.length ) {
                    iframe_el = iframe_el[0];
                    if (iframe_el.contentWindow && iframe_el.contentWindow[function_name]) {
                        return iframe_el.contentWindow[function_name];
                    } else {
                        return iframe_el.contentWindow.$('object')[0][function_name];
                    }
                } else {
                    return undefined;
                }
            }
        },

        edit_dialog: function() {
            ModuleItem.prototype.edit_dialog.call(this);

            var form;

            var demo_mi = this;

            var panel = panels.add({
                id: 'demo_editor',
                layout: layouts.get('dialog'),
                module: 'question',
                color: 'orange',
                title: 'Demo Editor',
                body: '',
                width: 480,
                footer_buttons: { 'Close': 'remove', 'Save': 'save_settings' }
            });

            // Quick hack to prevent _.isEmpty underscore bug in Firefox;
            // should remove 'body' set commands in the future.
            panel.set({body: ''});
            panel.set({body: [
                ['demo_editor_settings','Settings',''],
                ['demo_editor_current', 'Demo Preview', '']
            ]});

            panel.bind('save_settings', function() {
                if (!form.is_valid()) { return false; }

                var demo_settings = form.values();

                panel.set({
                    body: $('#loading_template').html(),
                    footer_buttons: {'Close': 'remove'}
                });
                publisher.post(
                    'demo', 'save_demo_settings', '',
                    { demo_settings: demo_settings, demo_name: demo_mi.id },
                    function() {
                        panel.$b().html( 'Settings saved' );

                        // This is a bit of a hackish way of forcing the
                        // question to re-get data from the server the next
                        // time it is opened in the future, we should
                        // integrate add/edit question code more into the
                        // moduleitem so that changed values are instantly
                        // saved in the question.
                        demo_mi.set({'type': undefined}, {silent: true});
                        demo_mi.get_required_attributes();
                    }
                );
            });

            // Retrieve demo settings and display the form.
            publisher.post(
                'demo', 'get_demo_settings', '',
                {'demo_name': this.id},
                function(data, args) {

                    var settings_el = panel.get_tab_el('demo_editor_settings');

                    var form_elements = [
                        {
                            id: 'display_name',
                            type: 'text',
                            label: 'Display name',
                            tooltip: 'Name to be displayed in the demo panel',
                            value: args.demo_display_name,
                            validation: ['not_empty']
                        },
                        {
                            id: 'description',
                            type: 'textarea',
                            label: 'Description',
                            tooltip: 'Description of the demo, that will appear as a tooltip',
                            value: args.demo_description
                        },
                        {
                            id: 'subject',
                            type: 'select',
                            label: 'Subject (optional)',
                            tooltip: 'Select the subject matter of this demo so that it can be categorized appropriately.',
                            value: args.subject_val,
                            options: args.subjects
                        }
                    ];
                    if (args.superuser) {
                        form_elements.splice(3, 0, {
                            id: 'supports_magnify',
                            type: 'checkbox',
                            label: 'Supports magnification',
                            value: args.supports_magnify
                        });
                        if (args.type ==='flash_file') {
                            form_elements.splice(3, 0, {
                                id: 'flash_file_key',
                                type: 'upload',
                                validation: ['upload_completed'],
                                label: 'Flash file',
                                tooltip: 'Upload flash file',
                                mime_types: 'application/x-shockwave-flash'
                            });
                        }
                    }
                    if (args.type !== 'html5') {
                        form_elements.push({
                            type: 'fieldset',
                            label: 'Timers',
                            collapsible: true,
                            collapsed: true,
                            value: [
                                {
                                    id: 'is_timed',
                                    type: 'checkbox',
                                    label: 'Time enabled',
                                    value: args.profile_is_timed
                                },
                                {
                                    id: 'time_limit',
                                    type: 'text',
                                    label: 'Timer in seconds',
                                    tooltip: 'Time before demo is deactivated',
                                    number: true,
                                    value: args.profile_time_limit,
                                    validation: ['not_empty', 'integer']
                                }
                            ]
                        });
                        form_elements.push({
                            type: 'fieldset',
                            label: 'Grading',
                            collapsible: true,
                            collapsed: true,
                            value: [
                                {
                                    id: 'correctness_score',
                                    type: 'text',
                                    label: 'Correctness score',
                                    positive_decimal: true,
                                    value: args.profile_correctness_score,
                                    validation: ['not_empty', 'number']
                                },
                                {
                                    id: 'participation_score',
                                    type: 'text',
                                    label: 'Participation score',
                                    positive_decimal: true,
                                    value: args.profile_participation_score,
                                    validation: ['not_empty', 'number']
                                }
                            ]
                        });
                    }
                    if (args.type === 'thm_demo') {
                        form_elements.splice(3, 0, {
                            id: 'js_source',
                            type: 'textarea',
                            label: 'JavaScript source',
                            value: args.js_source,
                            validation: ['not_empty']
                        });
                    }
                    if (args.type !== 'flash_file') {
                        form_elements.splice(3, 0, {
                            id: 'object_id',
                            type: 'text',
                            label: 'Object id',
                            value: args.object_id,
                            validation: ['not_empty']
                        });
                    }
                    form = settings_el.composer(form_elements);
                }
            );

            var DemoDetailsView = require('views/demo/details');
            var el = panel.get_tab_el('demo_editor_current');
            var details_view = new DemoDetailsView({ model: demo_mi });
            el.html(details_view.render().el);
        }
    });

    return DemoItem;
});
