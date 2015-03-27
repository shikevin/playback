/* globals define, Backbone */

define([
    'models/tournament/Response'
], function (TournamentResponse) {
    'use strict';
    var TournamentResponseCollection = Backbone.Collection.extend({
        model: TournamentResponse,
        initialize: function() {
            //when a response is added to the collection, we attempt to find a matching TournamentResponse
            //with matching opponent_response_id; if we finds one, it sets it in this property
            this.bind('add', function(response) {
                this.map_response_opponent(response);
                response.bind('change:opponent_response_id', this.map_response_opponent, this);
            }, this);
            this.bind('remove', function(response) {
                response.unbind('change:opponent_response_id', this.map_response_opponent, this);
            }, this);
        },
        map_response_opponent: function(response) {
            // finds the oppenent defined in opponent_response_id; if it exists, link the two opponents together by
            // setting a reference in the 'opponent' property of the TournamentResponse
            if( response.get('opponent_response_id') ) {
                if (!response.get('opponent')) {
                    var opponent = this.get( response.get('opponent_response_id') );
                    if( opponent ) {
                        response.set({ 'opponent': opponent });
                        opponent.set({ 'opponent': response });
                    } else {
                        var dummy_response = new TournamentResponse({
                            id: response.get('opponent_response_id'),
                            alias: response.get('opponent_alias'),
                            opponent_response_id: response.get('id'),
                            user_id: response.get('opponent_user_id')
                        });
                        this.add(dummy_response);
                    }
                }
            }
        },
        get_user_responses: function(user_id) {
            if (typeof user_id === 'string') { user_id = Number(user_id); }
            return this.filter(function(response) { return response.get('user_id') === user_id; });
        },
        get_round_responses: function(round_number) {
            if (typeof round_number === 'string') { round_number = Number(round_number); }
            return this.filter(function(response) { return response.get('round_number') === round_number; });
        },
        get_response_for_user_and_round: function( user_id, round_number ) {
            if (typeof user_id === 'string') { user_id = Number(user_id); }
            if (typeof round_number === 'string') { round_number = Number(round_number); }
            return this.detect(function(response) {
                return (response.get('user_id') === user_id) && (response.get('round_number') === round_number);
            });
        }
    });
    return TournamentResponseCollection;
});
