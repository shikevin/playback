/* global _, Backbone */
define([
    'quickadd/CorrectAnswerView',
    'text!templates/quickadd/quickadd.html',
    'views/ModuleItemReport',
    'views/ModuleItemStatus'
], function (
    CorrectAnswerView,
    html,
    ModuleItemReportView,
    ModuleItemStatusView
) {
    'use strict';
    var QuickAddView = Backbone.View.extend({
        tagName: 'div',
        id: 'content',
        events: {
            'click #bt_close': 'close',
            'click #bt_report': 'toggle_report_open',
            'click #bt_togglesubmissions': 'toggle_submissions',
            'click #bt_pause': 'toggle_pause_timer',
            'click .toggle_sms_instructions': 'toggle_sms_instructions',
            'click #submitted': 'toggle_submissions_metric'    // "click #qa_title_cont" : "toggle_quick_edit",
                                           // "click #qa_edit_save"  : "save_quick_edit",
        },
        initialize: function () {
            this.show_sms_instructions = false;
            this.show_submission_pct = true;
            this.show_pct_enrolled = false;
            this.report_open = false;
            this.on('redo_magnify', this.maximize_text, this);
            var mi = this.mi();
            /*we want to add a correct answer, so we do, and the model changes*/
            /*however, the report will not change until we call get_required_attributes, because somehow that returns report data*/
            /*however, we cant get required attributes until the attribs have actually been set on the server*/
            /*so we want to redraw the report only when the new results are in*/
            /*which is when the save command has successfully send the new answers and gotten the required attribs*/
            this.listenTo(this.model, 'onsave', function () {
                this.model.item.get_required_attributes();
            }, this);
            //when submissions come in, re-render the status indicator individually; saves on
            //having to do a full re-rendering of everything
            this.listenTo(mi, 'change:status', this.render, this);
            //when the timer finishes, re-render view without
            //timer and sms panels
            this.listenTo(mi.get('timer'), 'finish', this.render, this);
            //bind and trigger resize event
            // $(window) is not a backbone object, don't treat it like one
            $(window).bind('resize_delayed', this.maximize_text.bind(this));
            this.status_view = new ModuleItemStatusView({ report_id: mi.get_id() });
            this.listenTo(this.status_view.reports[mi.get_id()], 'change', this.render_status, this);
            var mi_id = this.model.item.get_id();
            this.status_view = new ModuleItemStatusView({ report_id: mi_id });
            this.listenTo(this.mi(), 'change:status', function () {
                if (!this.mi().is_visible()) {
                    this.remove();
                } else {
                    this.render();
                }
            }, this);
            this.render();
        },
        toggle_submissions_metric: function (e) {
            var A = this.show_submission_pct;
            var B = this.show_pct_enrolled;
            this.show_submission_pct = !A && !B;
            this.show_pct_enrolled = A;
            this.render_status();
        },
        toggle_sms_instructions: function (e) {
            this.show_sms_instructions = !this.show_sms_instructions;
            this.render();
        },
        toggle_submissions: function (e) {
            e.preventDefault();
            this.mi().toggle_active();
        },
        toggle_report_open: function (e) {
            e.preventDefault();
            this.report_open = !this.report_open;
            this.render();
        },
        toggle_pause_timer: function (e) {
            e.preventDefault();
            this.mi().get('timer').pause_play();
            this.render();
        },
        // toggle_quick_edit: function(e){
        //   e.preventDefault();
        //   originalContent = $(e.target).html();
        //   out = "<input id='qa_edit_save' type='text'/> <a href='#' id='qa_edit_save'>Save</a>";
        //   $(e.target).html(out);
        //   $("#qa_edit_save").val(originalContent);
        // },
        // save_quick_edit: function(e){
        //   e.preventDefault();
        //   this.model.set({"title": false});
        // },
        close: function (e) {
            if (e) {
                e.preventDefault();
            }
            this.mi().save_status('inactive');
            this.mi().set({ status: 'inactive' });
        },
        remove: function () {
            $('#quickadd').removeClass('paused');
            this.model.set({ 'module_item': false });
            this.stopListening();
            if (this.report_view) {
                this.report_view.remove();
            }
            if (this.correct_answer_view) {
                this.correct_answer_view.remove();
            }
            this.status_view.remove();
            this.status_view = undefined;
            Backbone.View.prototype.remove.call(this);
        },
        mi: function () {
            return this.model.get('module_item');
        },
        render_status: function () {
            if (this.mi()) {
                if (this.show_pct_enrolled) {
                    this.status_view.graph_type = 'enrolled';
                } else {
                    this.status_view.graph_type = 'online';
                }
                var data = this.status_view.get_data();
                var label = this.show_submission_pct || this.show_pct_enrolled ? data[0]["value"] : data[0]["num_submissions"];
                var desc = this.show_submission_pct ? "% online" : this.show_pct_enrolled ? "% enrolled" : "submitted";

                if (label === 100) {
                    // Decrease font size if we hit 100%
                    this.$('.quickadd_val#submitted .val').css('font-size', '2.5em');
                }

                //prepend the label with nbsp; chars until it is at least 3 chars long
                label += '';
                //turn into string
                var label_length = label.length;
                for (var i = 0; i < 3 - label_length; i++) {
                    label = '&nbsp;' + label;
                }
                //add a percent value if the label is a percent representation
                if (this.show_submission_pct || this.show_pct_enrolled) {
                    label += '%';
                }
                this.$('.quickadd_val#submitted .val').html(label);
                this.$('.quickadd_val#submitted .desc').html(desc);
            }
        },
        render: function () {
            var item = this.mi();
            if (!item) {
                return;
            }
            var timer_enabled = item.get('profile').is_timed && item.get('timer').get('seconds_remaining') > 0;
            var timer_running = item.get('profile').is_timed && item.get('timer').get('running');
            var data = {
                'sms_code': window.course.get('sms_enabled') && item.get('sms_code'),
                'sms_phone_number': item.get('sms_phone_number'),
                'show_sms_instructions': this.show_sms_instructions,
                'timer_enabled': timer_enabled,
                'timer_running': timer_running,
                'report_open': this.report_open,
                'active': item.is_active()
            };
            $(this.el).html(_.template(html)(data));
            this.render_status();
            //set up the timer view if it is running for the module item
            if (timer_enabled) {
                var el = item.get('timer').initialize_view('quickadd');
                this.$('#timer').html(el);
            }
            //bind the report to the report element if the report is active
            if (this.report_open) {
                // i hate myself for this
                if (this.report_view) {
                    this.report_view.remove();
                }
                if (this.correct_answer_view) {
                    this.correct_answer_view.remove();
                }
                this.report_view = new ModuleItemReportView({
                    model: this.model.item,
                    panel: this
                });
                this.correct_answer_view = new CorrectAnswerView({ model: this.model.item });
                //when module item's report is redrawn in quickadd, magnification will be reset
                //this re-does magnification
                this.listenTo(this.report_view.options.report, 'report_redrawn', function () {
                    this.maximize_text();
                }, this);
                this.report_view.render();
                this.correct_answer_view.render();
                this.$('#quickadd_report').append(this.report_view.$el);
                this.$('#quickadd_answers').append(this.correct_answer_view.$el);
            }
            //resize the presentation tool window; if report is open, make it tall
            //otherwise, size it according to what it should be
            if (this.report_open) {
                var heights = this.$('#quickadd_elements').add(this.$('#quickadd_report')).add(this.$('#quickadd_answers')).map(function () {
                    return $(this).outerHeight();
                });
                var height = _.reduce(heights, function (i, n) {
                    return i + n;
                });
                require('lobby/PresentationTool').resize_pt(460, height, true, true);
            } else {
                this.resize_window();
            }
            this.maximize_text();
        },
        resize_window: function () {
            var sizes = this.$('.controls').add(this.$('.quickadd_val:visible')).map(function () {
                return $(this).outerWidth();
            });
            if (sizes.length) {
                var size = _.reduce(sizes, function (i, n) {
                    return i + n;
                });
                /*size += 25; // The +25 here is a total hack to get around windows scroll bar bugs*/
                require('lobby/PresentationTool').resize_pt(size, 102, false, true);
            }
        },
        maximize_text: function () {
            //magnify quickadd elements
            var el = this.$('#quickadd_container');
            Magnify.reset(el);
            Magnify.magnify(el, el.height(), el.width());
        }
    });
    return QuickAddView;
});
