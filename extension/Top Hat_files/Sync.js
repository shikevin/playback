/* globals define, Backbone */

define([
], function () {
    'use strict';

    var TournamentSync = Backbone.Model.extend({
        urlRoot: '/api/v1/tournament_sync/',
        idAttribute: 'resource_uri'
    });

    return TournamentSync;
});
