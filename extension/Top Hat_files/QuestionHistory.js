/* globals define, Backbone */

define([
], function () {
    'use strict';

    var TournamentQuestionHistory = Backbone.Model.extend({
        urlRoot: '/api/v1/tournament_question_history/',
        idAttribute: 'resource_uri'
    });

    return TournamentQuestionHistory;
});

