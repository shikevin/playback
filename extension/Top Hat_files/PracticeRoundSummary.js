define([
    'text!templates/tournament/between_practice_questions.html'
], function (html) {
    var TournamentPracticeRoundSummary = Backbone.View.extend({
        initialize: function() {
            this.render();
        },
        render: function() {
            var data = {
                "correct": this.model.get("round_correct"),
                "points": this.model.get("round_scores").points,
                "practice_countdown": this.model.get("tournament").get("round_summary_countdown_length")
            };
            $(this.el).html(_.template(html)(data));

            var $countdown = $(this.el).find(".practice_countdown");
            this.practice_countdown = setInterval(function() {
                var sec = parseInt($countdown.text());
                $countdown.text( sec - 1 );
                if(sec == 1) {
                    this.model.get_next_question();
                }
            }.bind(this), 1000);
        }
    });
    return TournamentPracticeRoundSummary;
});