define([
    'models/tournament/Event'
], function (TournamentEvent) {
    var TournamentEventCollection = Backbone.Collection.extend({
        model: TournamentEvent
    });
    return TournamentEventCollection;
});
