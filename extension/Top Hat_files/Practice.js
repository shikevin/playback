define([], function () {
    var TournamentPractice = Backbone.Model.extend({
        defaults: {
            //server properties
            "name": undefined,
            "tournament_id": undefined,
            "question_ids": undefined,

            "round_question": undefined,
            "round_correct": undefined,
            "round_complete": undefined,
            "round_attempts": 0,
            "tournament": undefined
        },
        save: function(attrs, options) {
            // wtf are we doing, why is this not just a resource?
            if (attrs) {
                this.set(attrs);
            }
            var filtered_keys = ["id", "name", "tournament_id", "question_ids"];
            var data = _.pick(this.toJSON(), filtered_keys);

            publisher.send({
                "module": "tournament",
                "command": "save_practice_session",
                "args": data,
                "success": function(data,args) {
                    this.set({"id": args["id"] });
                    options.success(this);
                }.bind(this)
            });
        },
        get_next_question: function() {
            // get an unanswered question from the db
            var that = this;
            publisher.send({
                "module": "tournament",
                "command": "get_incomplete_practice_match",
                "args": {
                    "practice_id": this.id,
                    "prev_match": this.get("match_id")
                },
                "success": function(data, args) {
                    if(data["completed"]) {
                        that.set({"round_question": false});
                    } else {
                        // get a new question
                        var attempts = data["attempts"];
                        var match_id = data["match_id"];
                        var question_id = data["question_id"];

                        that.set({
                            "round_scores": {},
                            "round_correct": false,
                            "round_complete": false
                        });

                        publisher.send({
                            "module": "tournament",
                            "command": "get_question_mi",
                            "args": { "id": question_id },
                            "success": function(data,args) {
                                // Set the ID manually
                                args.data.id = question_id;
                                var QuestionItem = require('models/question/question');
                                var question = new QuestionItem(args.data);
                                that.set({
                                    "match_id": match_id,
                                    "round_question": question,
                                    "round_attempts": attempts,
                                    "round_start_time": new Date()
                                });
                            }
                        });
                    }
                }
            });
        },
        submit_practice_answer: function(answer) {
            var time = ((new Date()).getTime() - this.get("round_start_time").getTime())/1000;

            publisher.send({
                "module": "tournament",
                "command": "grade_practice_answer",
                "args": {
                    "practice_id": this.id,
                    "match_id": this.get("match_id"),
                    "answer": answer,
                    "time": time
                },
                "success": function(data,args) {
                    this.set({
                        "round_scores": data.scores,
                        "round_correct": data.correct,
                        "round_complete": data.completed,
                        "round_attempts": data.attempts
                    });
                }.bind(this)
            });
        },

        //displayed when user has answered practice question and is waiting for next practice question
        between_practice_match: function(data) {
            if(data.scores.delta > 0) {
                $("#tournament_status_"+this.get("tournament_id")).effect("bounce", {times: 1, distance: 20}, 200);
            }

        },
        get_practice_summary: function(callback) {
            publisher.send({
                "module": "tournament",
                "command": "get_review",
                "args": {
                    "practice_id": this.id
                },
                "success": function(data, args) {
                    var results = data.results;
                    callback( results );
                }
            });
        },
        reset_practice: function() {
            publisher.send({
                module: 'tournament',
                command: 'reset_practice',
                args: { "practice_id": this.id },
                success: function(data, args) {
                    this.get_next_question();
                }.bind(this)
            });
        }
    });
    return TournamentPractice;
});

