define([], function () {
    TournamentEvent = Backbone.Model.extend({
        defaults: {
            message: undefined,
            timestamp: undefined,
            type: undefined
        },
        initialize: function() {
            this.set({ timestamp: new Date() });
        }
    });
    return TournamentEvent;
});