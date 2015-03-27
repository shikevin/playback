define([
    'views/ModuleItemContent',
    'views/demo/details',
    'views/ModuleItemReport',
    'views/ModuleItemStatus'
], function (ModuleItemContentView, DemoDetailsView, ModuleItemReportView, ModuleItemStatusView) {
    'use strict';

    var DemoContentView = ModuleItemContentView.extend({
        initialize: function() {
            ModuleItemContentView.prototype.initialize.apply(this);
            this.details_view = new DemoDetailsView({ model: this.model });
            if (window.user.get('role') == 'teacher') {
                this.listenTo(this.model, 'change:questions', this.update_reports, this);
                this.update_reports();
            }
            this.report_views = [];
        },
        update_reports: function () {
            var reports = _.keys(this.model.get('questions'));
            if (reports.length && this.panel) {
                this.status_view = new ModuleItemStatusView({report_id: reports});
                _.each(reports, function (question_id) {
                    var question_name = this.model.get('questions')[question_id];
                    this.panel.add_tab(question_id + "demo_report", question_name, "");
                    var report_el = this.panel.get_tab_el(question_id + "demo_report");
                    var report_view = new ModuleItemReportView({
                        model: this.model,
                        report_id: question_id
                    });
                    report_view.render();
                    this.report_views.push(report_view);
                    report_el.html(report_view.el);
                }.bind(this));
            }
        },
        remove: function () {
            _.each(this.report_views, function (report_view) {
                report_view.remove();
            });
            if (this.status_view) { this.status_view.remove() }
            this.stopListening(this.model);
            ModuleItemContentView.prototype.remove.call(this);
        },
        render: function() {
            this.model.get_required_attributes(function () {
                if (this.panel === undefined) { return; }

                var body_tabs;
                if (this.model.get("type") == "html5" && window.user.get('role') == "teacher") {
                    body_tabs = [[this.model.id + "_details", "Details", "<div id='demo_timer'></div><div id='status_bar'></div><div id='demo_body'></div><div id='question_list'></div>"], [this.id + "_statistics", "Statistics", ""]]
                } else {
                    body_tabs = [[this.model.id + "_details", "Details", "<div id='demo_timer'></div><div id='status_bar'></div><div id='demo_body'></div><div id='question_list'></div>"]]
                }

                // Quick hack to prevent _.isEmpty underscore bug in Firefox; should remove 'body' set commands in the future
                this.panel.set({ body: ''});
                this.panel.set({ body: body_tabs });

                this.update_reports();


                // Render details view and append to the DOM
                var panel_el = this.panel.get_tab_el(this.model.id + "_details");
                panel_el.find('#demo_body').empty().append(this.details_view.render().el)

                if( (window.user.get('role') == 'teacher' && this.status_view)) {
                    var status_el = panel_el.find('#status_bar');
                    status_el.empty();
                    status_el.append(this.status_view.el);
                    this.status_view.render();
                    // this.model.bind_status_el(panel_el.find("#status_bar"));
                } else if(!(window.user.get('role') == 'teacher')) {
                    this.model.bind_student_answer_list(panel_el.find("#question_list"));
                }

                //bind a new view onto the module item timer
                if(window.user.get('role') === 'teacher' && this.model.get("timer").get("running")) {
                    var el = this.model.get("timer").initialize_view();
                    panel_el.find("#demo_timer").html(el);
                }
                $(window).trigger('resize');
                setTimeout(function () {
                    // todo hughes lighthouse unhack this
                    $(window).trigger('resize');
                }, 400);
            }.bind(this));
        }
    });

    return DemoContentView;
});
