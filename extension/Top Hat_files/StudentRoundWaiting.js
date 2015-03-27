define([
    'views/tournament/Summary',
    'views/tournament/Results',
    'views/tournament/Events'
], function (TournamentSummaryView, TournamentResultsView, TournamentEventsView) {
    'use strict';
    var TournamentStudentRoundWaitingView = Backbone.View.extend({
        /*
         * shows students information on the tournament's progress while in-between rounds
         * shows a summary of the last round, the rankings table, and an event log
         */
        className: "tournament_student_round_waiting",
        render: function() {
            var html = "<div id='accordion'>" +
                "<h3 id='tournament_summary_header'><a href='#tournament_summary'>Round Summary</a><div class='preview'></div></h3>" +
                "<div id='tournament_summary'></div>" +
                "<h3 id='tournament_rankings_header'><a href='#tournament_rankings'>Rankings</a><div class='preview'></div></h3>" +
                "<div id='tournament_rankings'></div>" +
                "<h3 id='tournament_updates_header'><a href='#tournament_updates'>Updates</a><div class='preview'></div></h3>" +
                "<div id='tournament_updates'></div>" +
                "</div>";
            $(this.el).html(html);
            this.$("h3").addClass('mobile_round_waiting_header');
            var summary = new TournamentSummaryView({"model": this.model});
            var results = new TournamentResultsView({"model": this.model});
            var updates = new TournamentEventsView({"model": this.model.get("event_collection")});

            //set up view elements into their corresponding accordion pages
            this.$("#tournament_summary").html(summary.el);
            this.$("#tournament_updates").html(updates.el);
            this.$("#tournament_rankings").html(results.el);
        }
    });
    return TournamentStudentRoundWaitingView;
});