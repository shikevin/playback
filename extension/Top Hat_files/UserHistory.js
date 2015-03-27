/* globals define, Backbone */

define([
], function () {
    'use strict';

    var TournamentUserHistory = Backbone.Model.extend({
        urlRoot: '/api/v1/tournament_user_history/',
        idAttribute: 'resource_uri'
    });

    return TournamentUserHistory;
});
