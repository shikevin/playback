define([
    'models/tournament/User'
], function (TournamentUser) {
    var TournamentUserCollection = Backbone.Collection.extend({
        model: TournamentUser,
        comparator: function(item) {
            return item.get('rank');
        }

    });
    return TournamentUserCollection;
});
