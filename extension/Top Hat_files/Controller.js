define([
    'collections/tournament/Responses',
    'collections/tournament/QuestionStats'
], function (TournamentResponseCollection, TournamentQuestionStatsCollection) {
    var TournamentController = Backbone.Model.extend({
        defaults: {
            tournament: undefined,
            current_response: undefined,
            round_countdown: undefined,
            responses: undefined,
            round_number: undefined, //the round that we are on locally
            question_stats: undefined,
            clock: null,

            // when the tournament is first loaded, this stores the current round time on the server; it can be thought of as
            // the initial target for the first round's timer
            target_round_countdown: undefined
        },
        initialize: function() {
            // must initialize collections here to avoid a global default collection
            this.set({ responses: new TournamentResponseCollection() });
            this.set({ question_stats: new TournamentQuestionStatsCollection() });

            //quick hack: the teacher should not react to any of the events, as it will break
            if( (window.user.get('role') == 'teacher') ) {
                return false;
            }

            //start a new round countdown every time we increase the round number
            this.bind("change:round_number", this.set_current_response, this);
            this.get("responses").bind("add", this.set_current_response, this);
        },
        set_current_response: function() {
            //check to make sure we don't already have a current response for the current round number; if we do, our work is done!
            if( this.get("current_response") && (this.get("current_response").get("round_number") == this.get("round_number")) ) {
                return false;
            }

            //if the current round timer is still running from a previous round, stop it
            //and mark the response as unanswerable
            if (this.previous("current_response") != this.get('current_response')) {
                this.previous("current_response").set({"answerable": false});
                // this.clear_timer("round_countdown");
            }


            //get the response for the user and new round number, and set it
            var round_number = this.get("round_number");
            var response = this.get("responses").get_response_for_user_and_round(window.user.get('id'), round_number);
            if( response ) {
                this.set({"current_response": response});
            }

            this.get("tournament").set({submitting_answer:false});

            this.set_round_countdown();
        },
        set_round_countdown: function() {
            /*
            every time we change (increase) a round number, we start a new round countdown timer; at the end of it,
            the timer will set the current response to be unanswerable

            this timer may be prematurely removed if the response becomes unanswerable and we are set to launch a new round
            */
            var round_length = this.get("tournament").get("round_length");

            // checks to see if we have been given a targeted round countdown time by the server; if we have that, we
            // use the server's round countdown time instead of starting from scratch
            if( this.get("target_round_countdown") ) {
                round_length = this.get("target_round_countdown");
                this.set({ "target_round_countdown": undefined });
            }

            var current_response = this.get("current_response");
            // only set the countdown if the user is playing a round
            // load the quesiton data first
            // then start the countdown
            if( current_response ) {
                this.set_timer("round_countdown", round_length, function() {
                    current_response.set({"answerable": false});
                }.bind(this));
            }
        },
        pauseCountdown: function() {
            this.set({"paused": true});
        },
        resumeCountdown: function() {
            this.unset("paused");
        },
        set_timer: function(property_name, time, callback) {
            /*
             * Sets a backbone model property defined by `property_name` to the `time` numeric value,
             * and decrements that value by 1 each second until it hits zero. When 0 is hit, will
             * call the optional `callback` method
             */


            //start a countdown clock
            clearInterval(this.get('clock'));
            var clock = setInterval(function() {
                if(this.get("paused")) return;
                var time = this.get(property_name);
                if( time > 0 ) {
                    var dict = {}; dict[property_name] = time - 1;
                    this.set(dict);
                } else {
                    var dict = {}; dict[property_name] = undefined;
                    this.set(dict);
                    window.clearInterval(clock);
                    if( callback ) { callback(); }
                }
            }.bind(this), 1000);
            this.set({clock: clock});

            //set the dynamic property name to the time value
            //dynamic property names cannot be set directly - they must be set on a dictionary that is then passed in
            var dict = {};
            dict[property_name] = time;
            dict["clock_timer_" + property_name] = clock;
            this.set(dict);
        },
        clear_timer: function(property_name) {
            var clock_timer = this.get("clock_timer_" + property_name);
            clearInterval( clock_timer );

            //clear the property name
            this.unset(property_name);
        }
    });
    return TournamentController;
});