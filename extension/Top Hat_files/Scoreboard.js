define([], function () {
    var TournamentScoreboardModel = Backbone.Model.extend({
        defaults: {
            home: {
                "attempts": 0,
                "alias": undefined,
                "correct": false,
                "status_str": "",
                "rank": undefined
            },
            away: {
                "attempts": 0,
                "alias": undefined,
                "correct": false,
                "status_str": "",
                "rank": undefined,
                "user_id": undefined
            },

            countdown_time: undefined,
            countdown_message: "Waiting on round",
            coutdown_intense_background: false,

            round: 0,
            num_rounds: 0,

            tournament: undefined
        },
        get_max_attempts: function() {
            return this.get("tournament").get("max_attempts");
        },
        initialize: function() {
            var controller = this.get("tournament").get("controller");

            //bind timing events
            controller.bind("change:round_countdown", this.update_countdown_time, this);

            controller.bind("change:current_response", this.response_changed, this);
            this.response_changed();

            //setup round and num_rounds
            this.set({ "num_rounds": this.get("tournament").get("max_rounds") });
            controller.bind("change:round_number", this.update_round, this);
            this.update_round();
        },
        update_round: function() {
            var round = this.get("tournament").get("controller").get("round_number");
            if( round ) {
                this.set({"round": round });
            }
        },
        update_countdown_time: function() {
            /* update the countdown time and the countdown message based on if we are in
             * a current response, if we are waiting for the next response to begin, or if we dont have a current response
             * or a next response */
            var controller = this.get("tournament").get("controller");
            if( _.isNumber(controller.get("round_countdown")) ) {
                this.set({
                    "countdown_time": controller.get("round_countdown"),
                    "countdown_message": "Round ends in",
                    "countdown_intense_background": true
                });
            } else {
                this.set({
                    "countdown_time": undefined,
                    "countdown_message": "Waiting on round",
                    "countdown_intense_background": false
                });
            }
        },
        response_changed: function() {
            /* when responses are changed, pick the relevant properties from it */
            var controller = this.get("tournament").get("controller");
            var old_response = controller.previous("current_response");
            if( controller.changedAttributes() && old_response ) {
                old_response.unbind("change", this.home_response_updated, this);

                //also unbind the event bindings on the old opponent response, if there was one
                var old_opponent = old_response.get("opponent");

            }
            var new_response = this.get_response();
            if( new_response ) {
                new_response.bind("change", this.home_response_updated, this);
                this.home_response_updated();

                //if the user has an opponent this round, get her response and bind events to it
                var opponent = new_response.get("opponent");
                if( opponent ) {
                    opponent.bind("change", this.opponent_response_updated, this);
                }
                this.opponent_response_updated();
            }
        },
        get_response: function() {
            return this.get("tournament").get("controller").get("current_response");
        },
        home_response_updated: function() {
            var data = this.calculate_response_data( this.get_response() );
            this.set({ "home": data });
        },
        opponent_response_updated: function() {
            var response = this.get_response().get("opponent");
            var data = this.calculate_response_data( response );
            this.set({ "away": data });
        },
        calculate_response_data: function( response ) {
            if( response ) {
                var home_status_str = this.calculate_status_str( response.get("correct"), response.get("attempts"), this.get("tournament").get("max_attempts") );
                return {
                    "attempts": response.get("attempts"),
                    "correct": response.get("correct"),
                    "alias": response.get("alias"),
                    "status_str": home_status_str,
                    "user_id": response.get("user_id")
                };
            } else {
                return {
                    "attemtps": 0,
                    "correct": false,
                    "alias": "(no player)",
                    "status_str": false
                }
            }
        },
        calculate_status_str: function(is_correct, attempts, max_attempts) {
            //returns 'correct', 'incorrect', or false depending on the user's
            //status in the response
            if( is_correct ) {
                return "correct";
            } else if( attempts >= max_attempts ) {
                return "incorrect";
            } else {
                return false;
            }
        }
    });
    return TournamentScoreboardModel;
});