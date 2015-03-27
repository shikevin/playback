/* globals define, Backbone, _ */
define([
    'models/tournament/QuestionHistory'
], function (TournamentQuestionHistory) {
    'use strict';
    var TournamentQuestionsView = Backbone.View.extend({
        /*
         * Shows a list of questions, and their statistics, to Professor.
         *
         */
        initialize: function() {
            this.model.get('controller').get('question_stats').bind('change', this.render, this);
            this.render();
        },
        render: function() {
            var question_history = new TournamentQuestionHistory({ id: this.model.get('id') });
            question_history.fetch().done(function(responses) {
                var mapped_data = _.map(responses.questions, function(response) {
                    return [[Number(response.correct), response.incorrect], response.question];
                });

                $(this.el).html('<div class="barReport"></div>');

                this.$('.barReport').barReporter({
                    data: mapped_data,
                    colors: ['#32A123', '#A12823'],
                    type: 'stacked',
                    show_percent: false,
                    row_limit: mapped_data.length,
                    legends: ['Correct answers', 'Incorrect answers']
                });
            }.bind(this));
        }
    });
    return TournamentQuestionsView;
});
