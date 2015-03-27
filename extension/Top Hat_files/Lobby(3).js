/*global window, Backbone, $, define, doU, _*/
define([
    'models/tournament/Practice',
    'views/tournament/Practice',
    'views/tournament/Report',
    'text!templates/tournament/practice_open.html'
], function (TournamentPractice, TournamentPracticeView, TournamentReportView, html) {
    "use strict";
    var TournamentLobbyView = Backbone.View.extend({
        /*
         * Shown before a Tournament starts, if the student opnes the active
         * Tournament from the control panel. Shows practice sessions and results
         * from previously run Tournaments.
         *
         */
        events: {
            "click .practice_start_link": "start_practice",
            "click .tourn_details_link": "tournament_details"
        },
        start_practice: function(e) {
            e.preventDefault();
            var practice_id = $(e.currentTarget).attr("practice_id");
            var practice_model = new TournamentPractice({ id: practice_id, tournament: this.model });
            var practice_view = new TournamentPracticeView({ model: practice_model });
            practice_model.get_next_question();
        },
        tournament_details: function(e) {
            e.preventDefault();
            this.report_view = this.report_view || new TournamentReportView({"model": this.model});
            $(this.el).html(this.report_view.el);
            this.report_view.render();
        },
        render: function() {
            var total_responses = 0;
            var total_questions = 0;

            var practice_sessions = _.map(this.model.get("practice_sessions"), function(p) {
                var ratio, percent;
                if (p.questions === 0) {
                    ratio = 0;
                } else {
                    ratio = p.responses / p.questions;
                }
                percent = Math.round(ratio * 100);
                total_responses += p.responses;
                total_questions += p.questions;
                return {
                    id: p.id,
                    responses: p.responses,
                    questions: p.questions,
                    display_name: p.display_name,
                    ratio: ratio,
                    percent: percent,
                    color: this.get_color_string(ratio)
                };
            }.bind(this));
            var total_ratio;

            if (total_questions > 0) {
                total_ratio = total_responses / total_questions;
            } else {
                total_ratio = 0;
            }
            var total_percent = Math.round(total_ratio * 100);


            var grade_ratio;
            var grade = this.model.get("grade") || 0;
            var max_grade = this.model.get("max_grade");
            if (max_grade.tournament > 0) {
                grade_ratio = grade.tournament / max_grade.tournament;
            } else {
                grade_ratio = 0;
            }
            var grade_percent = Math.round(grade_ratio * 100);

            var it = {
                practice_sessions: practice_sessions,
                grade: grade,
                max_grade: max_grade,
                total_ratio: total_ratio,
                total_percent: total_percent,
                total_color: this.get_color_string(total_ratio),
                grade_ratio: grade_ratio,
                grade_percent: grade_percent,
                grade_color: this.get_color_string(grade_ratio)
            };

            $(this.el).html(_.template(html)(it));
            return this;
        },
        get_color_string: function(ratio) {
            /* parabolic for half the domain(for green only) */
            var red = Math.round(Math.min(1, -2 * (ratio - 1)) * 201) + 54; /* p.ratio < 0.5 ? 255 : Math.round((-Math.pow(2*(p.ratio-0.5), 2)+1)*255);*/
            var green = ratio > 0.5 ? 198 : Math.round(Math.pow(2 * ratio, 2) * 198);
            var blue = 88;
            return 'rgb(' + red + ',' + green + ',' + blue + ')';
        }
    });
    return TournamentLobbyView;
});