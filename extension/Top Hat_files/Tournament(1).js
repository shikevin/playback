/*global window, publisher, $, _, define*/
define([
    'models/ModuleItem',
    'models/tournament/Controller',
    'models/tournament/Response',
    'models/tournament/Sync',
    'models/tournament/User',
    'models/tournament/QuestionStat',
    'views/tournament/Content',
    'views/tournament/Report',
    'collections/tournament/Events',
    'collections/tournament/Users',
    'views/tournament/Edit',
    'layouts/edumacation/LayoutCollection'
], function (
    ModuleItem,
    TournamentController,
    TournamentResponse,
    TournamentSync,
    TournamentUser,
    TournamentQuestionStat,
    TournamentContentView,
    TournamentReportView,
    TournamentEventCollection,
    TournamentUserCollection,
    TournamentEditView,
    layouts
) {
    "use strict";
    var TournamentItem = ModuleItem.extend({
        view_type: TournamentContentView,
        urlRoot: '/api/v1/tournament/',
        idAttribute: 'resource_uri',
        save: function(attrs, options) {
            this.set(attrs);
            var filtered_keys = [
                'active_immediately',
                'correct_answer_score',
                'correctness_score',
                'first_answer_score',
                'id',
                'incorrect_answer_penalty',
                'max_attempts',
                'max_rounds',
                'name',
                'participation_score',
                'question_ids',
                'research_mode',
                'resource_uri',
                'round_length',
                'survey_url'
            ];
            var data = _.pick(this.toJSON(), filtered_keys);
            data.folder = this.get_folder_id_to_insert_into();

            publisher.send({
                "module": "tournament",
                "command": "save_tournament",
                "args": data,
                "success": function (data, args) {
                    this.set({"id": args.id});
                    options.success(this);
                }.bind(this)
            });
        },
        defaults: _.extend({}, ModuleItem.prototype.defaults, {
            module: "tournament",
            module_color: "greener",
            function_queue: [],

            //server data; these properties are what are stored on the server-side
            //for the tournament
            name: undefined,
            active_immediately: undefined,
            max_rounds: undefined,
            max_attempts: 3,
            round_length: 60,
            correctness_score: 1,
            participation_score: 1,
            question_ids: undefined,

            //the amount of time to wait before switching to a new practice question
            round_summary_countdown_length: 3,

            //timestamp of when tournament is set to be run
            next_tournament_start: undefined,

            // event_log: undefined,
            current_round: undefined,
            round_time_remaining: undefined,

            //boolean property that is updated by `submit_tournament_answer` method; indicates if we are in the middle of submitting an answer
            submitting_answer: false,

            //scoring
            correct_answer_score: 1,
            first_answer_score: 1,
            incorrect_answer_penalty: 0,
            research_mode: false,
            has_been_run: false
        }),
        initialize: function() {
            //apply the parent initialize function
            ModuleItem.prototype.initialize.call(this);
            this.set({
                users: new TournamentUserCollection(),
                // event_log: new TournamentEventLog(),
                controller: new TournamentController({ tournament: this }),
                view: new TournamentContentView({ model: this })
            });

            this.bind("action", function(action) {
                if (action === "Results") {
                    this.show_results_panel();
                } else if (action === "Change Practice Sessions") {
                    var view = new TournamentEditView({"model": this});
                    view.render_practice_sessions();
                } else if (action === "Schedule Tournament") {
                    var view = new TournamentEditView({"model": this});
                    view.render_schedule();
                }
            }, this);

            //when the user_data property is updated (through the SO), update the collection of TournamentUsers
            this.bind("change:user_data", this.update_users, this);
            this.update_users();

            //when the responses property is changed (through SO or a get_mi statement), create related TournamentResponses
            //and update the controller
            this.bind("change:responses", this.update_responses, this);
            this.update_responses();

            // When question stats are changed (SO update, get_mi, or message), inform the
            // TournamentController
            this.bind('change:question_stats', this.update_question_stats, this);
            this.update_question_stats();

            //every time the events property is changed, we update the list of events
            this.set({"event_collection": new TournamentEventCollection() });
            this.bind("change:events", this.update_events, this);
            this.update_events();

            //set controller properties when relevant properties are changed locally
            //this is probably a sign that we should merge the tournament and tournament controller
            this.bind("change:current_round", this.set_controller_round, this);
            this.bind("change:current_round", function() {
                setTimeout(this.do_sync.bind(this), 2000); // offset to reduce unnecessary polling
            }, this);
            this.bind("change:round_time_remaining", this.set_controller_countdown, this);
            this.set_controller_round();
            this.set_controller_countdown();

            this.bind("change:status", this.check_if_tournament_finished, this);
            this.bind("change:status", this.set_sync_polling, this);
            this.check_if_tournament_finished();

            this.bind("change:research_mode", function() {
                this.set({
                    survey_url: undefined
                });
            }, this);

            this.bind('change:status', function () {
                if (this.get('status') === "active_visible") {
                    this.set({current_round: 1});
                } else {
                    this.set({current_round: 0});
                }
                if (window.user.get('role') === 'student') {
                    this.get('controller').get('responses').reset();
                }
            });

            if (this.is_visible()) {
                this.trigger('opened');
            }
            this.trigger('change:status');
        },
        set_sync_polling: function() {
            // clear the old interval
            if (this.get('sync_interval')) {
                clearInterval(this.get('sync_interval'));
            }
            if (this.get('status') === 'active_visible') {
                // enable sync polling
                var interval = setInterval(this.do_sync.bind(this), 8000);
                this.set({
                    sync_interval: interval
                });
                this.do_sync();
            }
        },
        do_sync: function() {
            // students-only
            if (window.user.get('role') !== 'student') {
                return;
            }

            // if the current tournament is not active & visible, don't do anything
            if (this.get('status') !== 'active_visible') {
                return;
            }

            // if the current response is answerable, don't do anything
            var current_response = this.get('controller').get('current_response');
            if (current_response && current_response.get('answerable')) {
                return;
            }

            // we don't have an answerable question! what's going on?
            var that = this;
            var sync = new TournamentSync();
            sync.id = sync.urlRoot + this.get('id') + '/';

            sync.fetch().done(function() {
                that.set({
                    current_round: sync.get('round')
                });
                var sync_response = sync.get('response');
                if (sync_response) {
                    that.get('controller').get('responses').add(sync_response);
                }
                that.get('controller').set({
                    round_countdown: sync.get('round_time_remaining')
                });
            });
        },
        check_if_tournament_finished: function() {
            if (this.get("status") === "active_visible") {
                this.set({ "is_running": true });
            } else if ( this.get("is_running") && (this.get("status") === "active")) {
                this.set({ "is_running": false });

                var panel = panels.add({
                    "id": _.uniqueId('tournament_report'),
                    "module": "tournament",
                    "color": "green",
                    "layout": layouts.get("content"),
                    "title": "Tournament Results",
                    "footer_buttons": {
                        "Close": "remove"
                    }
                });

                var view = new TournamentReportView({ "model": this });
                panel.$b().html(view.el);
                view.render();
            }
        },
        set_controller_round: function() {
            this.get("controller").set({ "round_number": this.get("current_round") });
        },
        set_controller_countdown: function() {
            this.get("controller").set({ "round_countdown": this.get("round_time_remaining") });
        },
        update_events: function() {
            //add new events to the collection, skipping the pre-exisiting ones
            _.each(this.get("events"), function(event_data) {
                var event = this.get("event_collection").get(event_data.id);
                if (!event) {
                    this.get("event_collection").add(event_data);
                }
            }, this);
        },
        update_responses: function() {
            //loop through all responses in the SO and add them to the controller, or update their properties
            var controller = this.get("controller");
            var responses = this.get("responses");

            _.each(responses, function (response_data) {
                //get the matching response, if it exists already...
                var response = controller.get("responses").get( response_data.id );

                //if it does not exist, create it and add it to the list of responses
                if (!response) {
                    response = new TournamentResponse( response_data );
                    controller.get("responses").add( response );
                } else {
                    //update response data
                    response.set( response_data );
                }
            });
        },
        update_question_stats: function() {
            // loop through all the question stats in the SO and add them to the
            // TournamentController, or update their properties
            var controller = this.get('controller');
            var question_stats = this.get('question_stats');

            _.each(question_stats, function (question_stat_data) {
                var existing_stat = controller.get('question_stats').get(question_stat_data.question_name);

                if (!existing_stat) {
                    // Add new question stat to collection
                    var question_stat = new TournamentQuestionStat(question_stat_data);
                    controller.get('question_stats').add(question_stat);
                } else {
                    // Update existing question stat in collection
                    existing_tat.set(question_stat_data);
                }
            });
        },
        update_users: function() {
            //update the tournament's users collection with data from the 'user_data' scores; add new ones, and update time/scores for existing ones
            var users_collection = this.get("users");
            var users_list = this.get('user_data');

            _.each(users_list, function (score) {
                var user_obj = users_collection.detect(function(user) {
                    return score.id == user.id;
                });
                if (!user_obj) {
                    user_obj = new TournamentUser({id: score.id});
                    users_collection.add(user_obj);
                }
                user_obj.set({
                    rank: score.rank,
                    score: score.score,
                    wins: score.wins,
                    time: score.time,
                    alias: score.alias
                });
            });
        },

        set_buttons: function() {},

        response_message_received: function(data) {
            var controller = this.get("controller");
            var response_data = data;

            //get the matching response, if it exists already...
            var response = controller.get("responses").get( response_data.id );
            //if it does not exist, create it and add it to the list of responses
            if (!response) {
                response = new TournamentResponse(response_data);
                controller.get("responses").add( response );
            } else {
                //set the response data
                response.set( response_data );
            }
        },
        question_stat_message_recieved: function(msg) {
            // TODO: Parse message body and stick into controller model
        },
        show_results_panel: function() {
            var panel = panels.add({
                id: "tournament_results_panel",
                module: "tournament",
                layout: layouts.get("dialog"),
                color: "green",
                title: "Results for tournament",
                body: $('#loading_template').html(),
                width: 484
            });
            var view = new TournamentReportView({"model": this});
            panel.$b().html(view.el);
            view.render();
            panel.set({
                "footer_buttons": { "Close":"remove" }
            })
        },

        //returns true if the tournament has a practice session that has not been fully answered
        has_unanswered_practice_session:  function() {
            var unanswered_session = _.detect(this.get("practice_sessions"), function(session) {
                return session.responses < session.questions;
            });
            return unanswered_session ? true : false;
        },

        set_timer: function(property_name, time, callback) {
            /*
             * Sets a backbone model property defined by `property_name` to the `time` numeric value,
             * and decrements that value by 1 each second until it hits zero. When 0 is hit, will
             * call the optional `callback` method
             */

            //dynamic property names cannot be set directly - they must be set on a dictionary that is then passed in
            var dict = {}; dict[property_name] = time;

            //set the dynamic property name to the time value
            this.set(dict);

            //start a countdown clock
            var clock = setInterval(function() {
                var time = this.get(property_name);
                if (time > 0) {
                    var dict = {}; dict[property_name] = time - 1;
                    this.set(dict);
                } else {
                    window.clearInterval(clock);
                    if (callback) { callback(); }
                }
            }.bind(this), 1000);
        },

        submit_tournament_answer: function(answer) {
            var time = this.get("round_length") - this.get("controller").get("round_countdown");
            var response = this.get("controller").get("current_response");

            //check to make sure we are not already submitting an answer
            if (!answer || this.get("submitting_answer")) {
                return false;
            } else {
                this.set({"submitting_answer": true});
            }
            response.save({answer: answer}, {
                success: function () {
                    this.set({"submitting_answer": false});
                    if (this.get('cross_campus')) {
                        this.get('org_scores').get_scores();
                    }
                }.bind(this),
                error: function () {
                    this.set({"submitting_answer": false});
                }.bind(this)
            });
        },
        edit_dialog: function() {
            this.fetch().done(function() {
                var editor_view = new TournamentEditView({"model": this});
            }.bind(this));
        },
        new_practice_view: function(practice_id) {
            var model = new TournamentPractice({"id": practice_id, "tournament": this});

            //start a new round
            var view = new TournamentPracticeView({"model": model});
            model.get_next_question();
        },
        delete_practice_session: function(id, callback, callback_proxy) {
            var tournament = this;
            publisher.send({
                module: 'tournament',
                command: 'delete_practice_session',
                args: {
                    id: this.get("id"),
                    session_id: id
                },
                success: function() {
                    if (callback) { callback.call(callback_proxy); }
                    //easy way to update practice_sessions
                    tournament.fetch();
                }
            });
        },
        get_session_questions: function(practice_id, callback, callback_proxy) {
            /*
             * Gets a list of question ids in the tournament. If a practice_id is passed
             * will get the list of question ids in the related practice session
             */
            publisher.send({
                "module": "tournament",
                "command": "get_questions",
                "args": {
                    "id": this.get("id"),
                    "practice_id": practice_id
                },
                success: function(data, args) {
                    var selected_questions = args["result"];
                    if (callback) { callback.call(callback_proxy, selected_questions); }

                     //easy way to update practice_sessions
                     this.fetch();
               }.bind(this)
            });
        },
        set_schedules: function(timestamps, callback) {
            publisher.send({
                "module": 'tournament',
                "command": 'set_schedules',
                "args": {
                    "id": this.get("id"),
                    "timestamps": timestamps
                },
                success: function(data, args) {
                    this.set({"schedules": timestamps});
                    if (callback) { callback(data,args); }
                }.bind(this)
            });
        },
        save_status: function (status, override, bulk_update) {
            return this.fetch().done(function () {
                if (status === "active_visible") {
                    if (this.get('has_been_played')) {
                        alert("This tournament has already been run. " +
                              "Please create a new tournament.");
                        return true;
                    } else if (
                        this.get('scheduled') > 0 &&
                        !(this.get('next_tournament_start') > 0)
                    ) {
                        alert("This tournament is already scheduled to run.");
                        return true;
                    }
                }
                require('Modules').get_module('course').save_item_statuses(
                    [this], status, override, bulk_update);
                return false;
            }.bind(this));
        }
    });
    return TournamentItem;
});
