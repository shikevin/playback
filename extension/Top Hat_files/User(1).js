define([], function () {
    var TournamentUser = Backbone.Model.extend({
        defaults: {
            alias: undefined,
            score: 0,
            time: 0,
            rank: 0,
            wins: 0,
            tournament: undefined
        }
    });
    return TournamentUser;
});
