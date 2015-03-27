define([], function () {
    var TournamentQuestionStat = Backbone.Model.extend({
        defaults: {
            question_name: '',
            total: 0,
            correct: 0,
            incorrect: 0
        },
        initialize: function() {}
    });
    return TournamentQuestionStat;
});