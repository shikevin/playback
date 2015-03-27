define([
    'views/tournament/PracticeRoundSummary',
    'views/tournament/PracticeQuestion',
    'text!templates/tournament/tournament_practice_review.html',
    'layouts/edumacation/LayoutCollection'
], function (
    TournamentPracticeRoundSummary,
    TournamentPracticeQuestionView,
    html,
    layouts
) {
    var TournamentPracticeView = Backbone.View.extend({
        initialize: function() {
            //initialize the practice panel
            this.panel = panels.get(this.model.get("tournament").get('id')) || panels.add({
                "id": this.model.get("tournament").id,
                "module": "tournament",
                "title": "Tournament Practice",
                "layout": layouts.get("content"),
                "color": "green"
            });

            this.model.bind("change:round_question", this.render_question, this);
            this.model.bind("change:round_complete", this.render_round_summary, this);

            //remove the practice session panel if the tournament is opened (a.k.a. launched)
            this.model.get("tournament").bind("change:opened", function() {
                if( this.model.get("tournament").get("opened") ) {
                    this.panel.remove();
                }
            }, this);
        },
        render_question: function(question_id, attempts) {
            //if no current question, the practice is over
            if( !this.model.get("round_question") ) {
                this.render_practice_complete();
                return true;
            }

            var view = new TournamentPracticeQuestionView({ "model": this.model });

            this.panel.set({
                "footer_buttons": {
                    "Stop": function() {
                        this.model.get('tournament').trigger('closed');
                        this.model.get('tournament').trigger('opened');
                    }.bind(this),
                    "Skip": function() {
                        this.model.get_next_question();
                    }.bind(this),
                    "Submit": function() {
                        var answer = view.get_answer();
                        this.model.submit_practice_answer(answer);
                    }.bind(this)
                }
            });
            this.panel.$b().html( view.el );
        },
        render_round_summary: function() {
            //only render round complete if we are completed
            if( this.model.get("round_complete") == false ) {
                return false;
            }

            var view = new TournamentPracticeRoundSummary({ "model": this.model });
            this.panel.set({
                footer_buttons: {
                    "Stop": function() {
                        this.model.get('tournament').trigger('closed');
                        this.model.get('tournament').trigger('opened');
                    }.bind(this),
                    "Next": function() {
                        clearInterval(view.practice_countdown);
                        this.model.get_next_question();
                    }.bind(this)
                }

            });
            this.panel.$b().html( view.el );
        },
        render_practice_complete: function() {
            this.panel.loading();
            this.panel.set({
                footer_buttons: { "Close":  function() {
                    this.model.get('tournament').trigger('closed');
                    this.model.get('tournament').trigger('opened');
                }.bind(this) }
            });

            //get practice results and render them
            this.model.get_practice_summary(function(results) {
                var max_attempts = this.model.get("tournament").get("max_attempts");
                var data = {
                    "incorrect": _.filter(results, function(r){ return !r.correct && r.attempts >= max_attempts }),
                    "need_review": _.filter(results, function(r){ return r.correct && r.attempts >= max_attempts })
                };
                this.panel.$b().html(_.template(html)(data));
                this.panel.$b(".reset_button").bind("click", function() { this.render_reset_practice(); }.bind(this));
            }.bind(this));
        },
        render_reset_practice: function() {
            var html = '<p>Are you sure you want to reset this practice session?</p>' +
                       '<p>You will lose all your progress and will have to re-answer these questions.</p>';
            this.panel.$b().html( html );
            this.panel.set({
                "footer_buttons": {
                    "Cancel": function() {
                        this.render_practice_complete();
                    }.bind(this),
                    "Ok": function() {
                        this.model.reset_practice();
                        this.panel.loading();
                    }.bind(this)
                }
            });
        }
    });
    return TournamentPracticeView;
});
