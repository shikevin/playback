/*global window, $, Backbone*/
define([
    'views/tournament/Results',
    'views/tournament/Events',
    'views/tournament/History',
    'views/tournament/Questions'
], function (TournamentResultsView, TournamentEventsView, TournamentHistoryView, TournamentQuestionsView) {
    "use strict";
    var TournamentReportView = Backbone.View.extend({
        /*
         * Shown to Professor during tournament. Sort of a HUD of what's
         * going on in the Tournament, and the standings.
         *
         */
        render: function() {
            // this is seriously bad
            // it sucks so hard because you can't add tabs with the current panels code
            var html = "<ul>";

            if (this.model.get('status') !== 'active_visible' && this.model.get('cross_campus')) {
                html += "<li><a href='#cross_campus_result'>Results</a></li>";
            }

            html += "<li><a href='#tournament_rankings' class='rankings_link'>Rankings</a></li>";

            if (this.model.get('status') === 'active_visible') {
                html += "<li><a href='#tournament_updates'>Updates</a></li>";
            }

            if (this.model.get('status') !== 'active_visible') {
                html += "<li><a href='#tournament_history'>History</a></li>";
            }

            if (window.user.get('role') === "teacher" && this.model.get('status') !== "active_visible") {
                html += "<li><a href='#tournament_questions'>Questions</a></li>";
            }

            html += "</ul>";

            if (this.model.get('status') !== 'active_visible' && this.model.get('cross_campus')) {
                html += "<div id='cross_campus_result'>Tab 0</div>";
            }

            html += "<div id='tournament_rankings'>Tab 1</div>";

            if (this.model.get('status') === 'active_visible') {
                html += "<div id='tournament_updates'>Tab 2</div>";
            }

            if (this.model.get('status') !== 'active_visible') {
                html += "<div id='tournament_history'>Tab 3</div>";
            }

            if (window.user.get('role') === "teacher" && this.model.get('status') !== 'active_visible') {
                html += "<div id='tournament_questions'>Tab 4</div>";
            }

            $(this.el).html(html);
            var $el = $(this.el);

            var $report_divs = $('div', this.el);

            if (window.is_mobile && !window.is_presentation_tool) {
                // hide the divs
                $('ul', $el).addClass('mobile_report');
                $report_divs.not('#tournament_rankings').hide();
                $('a.rankings_link').addClass('ui-btn-active');

                $('a', $el).each(function() {
                    $(this).addClass("mobile_report_link");
                    $(this).click(function(e) {
                        e.preventDefault();
                        $report_divs.hide();
                        $('.ui-btn-active').removeClass('ui-btn-active');
                        $($(this).attr("href"), $el).show();
                        $(this).addClass('ui-btn-active');
                        return false;
                    });
                });
                $('ul', $el).attr({"data-role": "navbar"});
                $('ul', $el).navbar();
            } else {
                $(this.el).tabs();
            }

            var rankings = new TournamentResultsView({"model": this.model});
            $(this.el).find("#tournament_rankings").html(rankings.el);

            if (this.model.get('status') === 'active_visible') {
                var updates = new TournamentEventsView({"model": this.model.get("event_collection")});
                $(this.el).find("#tournament_updates").html(updates.el);
            }

            if (this.model.get('status') !== 'active_visible') {
                var history = new TournamentHistoryView({"model": this.model});
                $(this.el).find("#tournament_history").html(history.el);
            }

            if (window.user.get('role') === 'teacher') {
                var questions = new TournamentQuestionsView({model: this.model});
                $(this.el).find('#tournament_questions').html(questions.el);
            }

            return this;
        }
    });
    return TournamentReportView;
});
