define([
    'models/tournament/Scoreboard',
    'views/tournament/Scoreboard',
    'views/tournament/Question',
    'views/tournament/StudentRoundWaiting',
    'views/tournament/Report'
], function (TournamentScoreboardModel, TournamentScoreboardView, TournamentQuestionView, TournamentStudentRoundWaitingView, TournamentReportView) {
    "use strict";
    var TournamentPanelView = Backbone.View.extend({
        initialize: function (options) {
            this.options = options || {};
            //set up scoreboard
            this.scoreboard_model = new TournamentScoreboardModel({"tournament": this.model});
            this.scoreboard_view = new TournamentScoreboardView({"model": this.scoreboard_model});

            this.model.bind("change:submitting_answer", this.render_submitting_answer_indicator, this);
            this.model.get("controller").bind("change:current_response", this.render_content, this);
            this.model.get("controller").bind("change:current_response", this.bind_redraw_on_response_unanswerable, this);
            this.bind_redraw_on_response_unanswerable();

            this.render();
        },
        bind_redraw_on_response_unanswerable: function() {
            var controller = this.model.get("controller");
            if (controller.get("current_response")) {
                controller.get("current_response").bind("change:answerable", this.render_content, this);
            }

            if (controller.changedAttributes() && controller.previous("current_response")) {
                controller.previous("current_response").unbind("change:answerable", this.render_content, this);
            }
        },
        render: function() {
            if (!this.options.panel) {
                return;
            }
            this.options.panel.$b().html("<div class='scoreboard'></div><div class='content'></div>");
            this.render_content();

            //set up scoreboard
            this.scoreboard_view = this.scoreboard_view || new TournamentScoreboardView({"model": this.model});
            // this.event_log_view = this.event_log_view || new TournamentEventLogView({model: this.model.get("event_log")});
            this.options.panel.$b(".scoreboard").html(this.scoreboard_view.el);
        },
        render_content: function () {
            //show the response or the response summary, depending on the current_response
            if ((window.user.get('role') === 'teacher')) {
                this.render_report();
                this.options.panel.set({
                    "footer_buttons": {
                        "Deactivate": function() {
                            this.save_status("inactive");
                        }.bind(this.model)
                    }
                });
            } else if (this.model.get("controller").get("current_response") && this.model.get("controller").get("current_response").get("answerable")) {
                this.render_round();
            } else {
                this.render_round_summary();
            }
        },
        render_round: function () {
            if (!this.options.panel) {
                return;
            }
            var view = new TournamentQuestionView({"model": this.model});
            this.options.panel.$b(".content").html(view.el);
            view.render();
            this.options.panel.set({
                "footer_buttons": {
                    "Submit": function() {
                        var answer = view.get_answer();
                        this.model.submit_tournament_answer(answer);
                    }.bind(this)
                }
            });
        },
        render_submitting_answer_indicator: function () {
            if (!this.options.panel) {
                return;
            }
            var submitting_answer = this.model.get("submitting_answer");

            //copied from set_submission_msg; sry, had no time!
            var el = this.options.panel.$b();
            $(el).find(".submission_msg").remove();
            $(el).find('.not_enabled_instruc').remove();
            $(el).find(".ui-effects-wrapper").remove(); //the toxic waste of the jquery effect
            if (submitting_answer) {
                $(el).append("<div class='submission_msg'>Submitting...</div>");
                if (jQuery().effect) {
                    $(el).find(".submission_msg").effect("bounce", { 'times' : 10 }, 1000);
                }
            }
        },
        render_round_summary: function () {
            if (!this.options.panel) {
                return;
            }
            var view = new TournamentStudentRoundWaitingView({"model": this.model });
            this.options.panel.$b(".content").html(view.el);
            this.options.panel.set({"footer_buttons": {}});
            view.render();
        },
        render_report: function () {
            if (!this.options.panel) {
                return;
            }
            var view = new TournamentReportView({ "model": this.model });
            this.options.panel.$b().html(view.el);
            view.render();

            this.options.panel.set({
                "footer_buttons": {
                    "Close": "remove"
                }
            });
        }
    });
    return TournamentPanelView;
});