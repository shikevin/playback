/* global _ */
define([
    'modules/Module',
    'views/tournament/Control',
    'models/tournament/Tournament',
    'views/tournament/Edit',
    'views/tournament/Instructions',
    'layouts/edumacation/LayoutCollection'
], function (
    Module,
    TournamentControlView,
    TournamentItem,
    TournamentEditView,
    TournamentInstructionsView,
    layouts
) {
    'use strict';
    var Tournament = Module.extend({
        defaults: _.extend({}, Module.prototype.defaults, {
            id: 'tournament',
            name: 'Tournaments',
            color: 'greener',
            order: 5,
            model: TournamentItem,
            control_view: TournamentControlView,

            tree_actions: [{

                group: "Set Status",
                items: [
                {
                    id: "active_visible",
                    title:"<b>Play Tournament</b>",
                    description: "Students play against each other in real-time"
                },
                {
                    id: "active",
                    title:"<b>Practice Mode</b>",
                    description: "Students can do practice questions and view tournament results. Scheduled tournaments begin automatically."
                },
                {
                    id: "inactive",
                    title:"<b>Closed</b> (Inactive)",
                    description: "Students cannot see the tournament"
                }]
            }, {
                group: "Actions",
                items: [
                    { id: 'Duplicate', 'instant': true, title: 'Duplicate Tournament' },
                    { id: "Results", "instant": true, title: "Results" },
                    { id: "Edit", "instant": true, title: "Edit" },
                    { id: "Change Practice Sessions", "instant": true, title: "Change Practice Sessions" },
                    { id: "Schedule Tournament", "instant": true, title: "Schedule Tournament" }
                ]
            }]
        }),
        initialize: function() {
            Module.prototype.initialize.call(this);
            // the 'required attributes' are actually required for the tournament module to work properly
            // we cannot wait for the user to request these manually
            this.get('items').bind('add', function(item) {
                item.fetch();
            });
            this.bind_houdini_events();
        },
        init_callback: function(){
            this.question_previews = {};
        },

        //find a tournament with an unanswered practice session and open it
        open_tournament_practice: function() {
            var unanswered_tournament = _.detect( this.get_active_unopened_tournaments(), function(tournament) {
                return tournament.has_unanswered_practice_session();
            });

            unanswered_tournament.render_lobby();
        },

        get_active_unopened_tournaments: function() {
            return this.items().filter(function(tournament) { return (tournament.get('status') === 'active') && (tournament.get('opened') !== true); });
        },

        request_next_scheduled_tournament: function() {
            publisher.send({
                'module': 'tournament',
                'command': 'get_countdown',
                'success': function(data,args) {
                    var timestamp = args.timestamp ? (new Date((new Date()).getTime() + args.timestamp * 1000)).getTime()/1000 : undefined;
                    this.set({ 'next_tournament_start': timestamp });
                    this.render_tournament_instructions(args.id, timestamp);
                    var tournament = this.get('items').get(args.id);
                    if (tournament !== undefined) {
                        tournament.set({ 'next_tournament_start': timestamp });
                    }
                }.bind(this)
            });
        },
        bind_houdini_events: function() {
            Houdini.on('tournament:next_timestamp', function(args) {
                var id = args.id,
                    timestamp = (new Date((new Date()).getTime() + args.timestamp * 1000)).getTime()/1000;

                var tournament = this.get('items').detect(function(item){ return item.get('id') === id; });
                if (tournament) {
                    this.set({ 'next_tournament_start': timestamp });
                    tournament.set({ 'next_tournament_start': timestamp });
                }
                this.render_tournament_instructions(id, timestamp);
            }.bind(this));

            Houdini.on('tournament:event', function(args) {
                var id = args.id,
                    type = args.type,
                    message = args.message;

                var tournament = this.get('items').detect(function(item){ return item.get('id') === id; });
                if (tournament) {
                    tournament.get('event_collection').add({
                        id: _.uniqueId('event'),
                        type: type,
                        message: message
                    });
                }
            }.bind(this));

            Houdini.on('tournament:put_match', function(args) {
                var id = args.id,
                    data = args.data;

                var tournament = this.get('items').detect(function(item){ return item.get('id') === id; });
                if (tournament) {
                    tournament.response_message_received(data);
                }
            }.bind(this));

            Houdini.on('tournament:current_round', function(args) {
                var id = args.id,
                    current_round = args.current_round;


                var tournament = this.get('items').detect(function(item){ return item.get('id') === id; });
                if (tournament) {
                    if (tournament.get('current_round') === current_round) {
                        tournament.trigger('change:current_round');
                    }
                    tournament.set({current_round:current_round});
                }
            }.bind(this));

            Houdini.on('tournament:update_scores', function(args) {
                var id = args.tournament_id;
                var tournament = this.get('items').detect(function(item){ return item.get('id') === id; });
                if (tournament) {
                    tournament.set({
                        user_data: args.user_data
                    });
                    tournament.update_users();
                }
            }.bind(this));
        },
        render_tournament_instructions: function(tournament_id, timestamp) {
            // Countdown Timer updates the panel if required
            if (this.countdown_timer) {
                clearInterval(this.countdown_timer);
            }
            this.countdown_timer = setInterval(function() {
                // If timestamp is gone, remove panel (if it exists)
                if (timestamp === null || timestamp === undefined) {
                    var panel = panels.find('content', 'tournament', 'tournament_instructions');
                    if (panel) { panel.first().remove(); }
                    clearInterval(this.countdown_timer);
                    return;
                }
                var start_time = new Date(timestamp * 1000);
                var countdown_begins_threshold = 1000 * 60 * 5; // 5 minutes in ms

                // Determine time delta between start time and now
                var now = new Date();
                var delta = start_time - now;

                // Show instructions if tournament starts in less than 5 minutes
                if ((0 < delta) && (delta < countdown_begins_threshold)) {
                    var panel = panels.find('content', 'tournament', 'tournament_instructions');
                    if (panel) { return; }

                    // Drop panel into content column with instructions
                    var tournament = this.get('items').detect(function(item){ return item.get('id') === tournament_id; });
                    if (tournament) {
                        var instructions_view = new TournamentInstructionsView({
                            model: tournament
                        });
                        this.instructions_panel = panels.add({
                            id: 'tournament_instructions',
                            title: 'Tournament Instructions',
                            module: 'tournament',
                            layout: layouts.get('content'),
                            color: 'green',
                            body: instructions_view.el
                        });

                        // TODO: Start timer to see if tournament has been activated
                    } else if (0 <= delta) {
                        // Error?
                    }
                } else {
                    var panel = panels.find('content', 'tournament', 'tournament_instructions');
                    if (panel) { panel.first().remove(); }
                    clearInterval(this.countdown_timer);
                }
            }.bind(this), 1000);
        },

        //returns a string representation of the tournament start time
        //returns false if no upcoming tournament
        //returns time im MM:SS if less than 5 minutes remaining
        //otherwise returns upcoming date represntation
        generate_countdown_string: function(timestamp) {
            var start_time = new Date(timestamp*1000);
            var countdown_begins_threshold = 1000*60*5; // 5 minutes in ms

            //determine time delta between start time and now
            var now = new Date();
            var dt = start_time - now;

            //format coutdowm time depending on how close to countdown_begins_threshold we are
            if( !timestamp ) {
                return false;
            } else if (dt < countdown_begins_threshold && dt > 0) {
                var minutes = Math.floor(dt / 1000 / 60);
                var seconds = Math.floor(dt / 1000 - Math.floor(dt / 1000 / 60) * 60);
                return minutes + ':' + (seconds < 10 ? '0' : '') + seconds + ' seconds';
            } else if (dt > -countdown_begins_threshold && dt < 0) {
                return 'Right now!'; // zomg!
            } else {
                return start_time.strftime('%b %d %Y %I:%M %p');
            }
        },

        add_item: function() {
            var tournament = new TournamentItem();
            var add_view = new TournamentEditView({'model': tournament});
        }
    });
    return Tournament;
});
