/* global user, Houdini, Clicker, get_active_page, _ */
define([
    'views/ModuleItemContent',
    'views/question/details',
    'views/ModuleItemReport',
    'views/ModuleItemStatus',
    'util/retry',
    'text!templates/question/content_teacher.html',
    'text!templates/question/content_student.html',
    'util/Browser'
], function (
    ModuleItemContentView,
    QuestionDetailsView,
    ModuleItemReportView,
    ModuleItemStatusView,
    retry,
    teacher_body_str,
    student_body_str,
    Browser
) {
    'use strict';
    var QuestionContentView = ModuleItemContentView.extend({
        LOADING_RETRY_INTERVAL_SECONDS: 3,
        LOADING_RETRY_INTERVAL_FUZZ_SECONDS: 2,
        LOADING_RETRY_INTERVAL_BACKOFF_FACTOR: 0.333,
        LOADING_RETRY_INTERVAL_BACKOFF_MAX_SECONDS: 10,
        initialize: function() {
            ModuleItemContentView.prototype.initialize.apply(this);

            // Initialize sub-views
            if (user.get('role') === 'teacher') {
                this.reports_view = new ModuleItemReportView({model: this.model});
            }
            this.details_view = new QuestionDetailsView({model: this.model});

            // TODO: This channel is constructed in multiple places across
            // the frontend code. Perhaps it should be part of the User model.
            // The Houdini channel used to broadcast updates about the state
            // of the question view.
            this.user_channel = 'user.' + window.user.get('id');

            this.listenTo(this.model, 'change:has_correct_answer', function () {
                if (!_.isUndefined(this.panel)) {
                    this.model.set_panel_buttons(this.panel);
                }
            }, this);
        },
        remove: function () {
            if (this.reports_view) {
                this.reports_view.remove();
            }
            if (this.status_view) {
                this.status_view.remove();
            }
            this.details_view.remove();
            this.stopListening();
            ModuleItemContentView.prototype.remove.call(this);
        },
        broadcast_active_tab: function (index) {
            var event_name;
            if (index === 0) {
                event_name = 'active_content_details';
            } else {
                event_name = 'active_content_reports';
            }
            Houdini.broadcast(
                this.user_channel,
                event_name,
                {
                    module_item_id: this.model.get('id'),
                    module_id: this.model.get('module_id')
                }
            );
        },
        render: function () {
            if (_.isUndefined(this.panel)) {
                return;
            }

            if (user.get('role') === 'teacher') {
                // Teachers see a details tab and a reports tab.
                this.reports_view.options.panel = this.panel;
                this.panel.set({
                    body: [
                        [this.model.get('id') + '_details', 'Details', teacher_body_str],
                        [this.model.get('id') + '_reports', 'Reports', '']
                    ]
                });
                this.panel.on(
                    'tabsselect', this.broadcast_active_tab.bind(this));
            } else {
                // Students get basic details view
                this.panel.set({
                    body: student_body_str
                });
            }

            var $panel_el, report_el;
            if (user.get('role') === 'teacher') {
                $panel_el = this.panel.get_tab_el(this.model.get('id') + '_details');
                report_el = this.panel.get_tab_el(this.model.get('id') + '_reports');
            } else {
                $panel_el = this.panel.$el();
            }

            var spinner = $panel_el.find('.spinner-container').hide();
            var loading_error = $panel_el.find('.loading-error').hide();

            var retries_attempted = 0;

            var render_content = function () {
                if (_.isUndefined(this.panel)) {
                    return;
                }

                var focus_handler = function () {
                    if (_.isUndefined(window.get_active_page)) {
                        return;
                    }

                    if (Clicker && get_active_page() === 'content_page') {
                        Clicker.startPolling(this.model.get('id'), this.model.get('type'));
                    }
                }.bind(this);

                // Clicker integration
                this.panel.bind('focus', focus_handler);
                this.panel.$el().bind('focus_panel', focus_handler);

                if (user.get('role') === 'teacher') {
                    // Show status bars
                    if (_.isUndefined(this.status_view)) {
                        this.status_view = new ModuleItemStatusView({
                            report_id: this.model.get_id()
                        });
                    }
                    $panel_el.find('#status_bar').append(this.status_view.el);
                    this.status_view.render();

                    // Add reports tab
                    this.reports_view.render();
                    report_el.append(this.reports_view.el);
                }
                this.details_view.render();
                $panel_el.find('#question_body').append(this.details_view.el);
                this.details_view.render_sms();
                if (this.model.get('is_magnified') === true && this.model.get('view')) {
                    var panel = this.model.get('view').panel;
                    if (panel) {
                        panel.trigger('redo_magnify');
                    }
                }
                // Hack to get jquery mobile to render form elements properly
                if (Browser.is_mobile()) {
                    try {
                        this.details_view.$el.parents('div[data-role=page]').page('destroy').page();
                    } catch (e) {
                        // Raises exception if mobile page has not been initialized
                    }
                }

                if (window.user.get('role') === 'teacher') {
                    this.model.start_timer_if_required();
                    this.model.setup_timer();
                }
                $(window).trigger('resize');
            }.bind(this);

            var get_deferred = function () {
                return this.model.get_required_attributes(function () {
                    render_content();
                });
            }.bind(this);
            retries_attempted = retry.retry_on_fail(spinner, loading_error, get_deferred);

            return this;
        }
    });

    return QuestionContentView;
});
