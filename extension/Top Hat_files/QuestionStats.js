define([
    'models/tournament/QuestionStat'
], function (TournamentQuestionStat) {
    var TournamentQuestionStatsCollection = Backbone.Collection.extend({
        model: TournamentQuestionStat
    });
    return TournamentQuestionStatsCollection;
});
