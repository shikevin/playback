/* global Backbone */
define([
    'models/question/question',
    'views/question/details',
    'layouts/edumacation/LayoutCollection'
], function (
    QuestionItem,
    QuestionDetailsView,
    layouts
) {
    "use strict";
    var TournamentHistoryResponseView = Backbone.View.extend({
        /*
         * Shows results of individual students and their matchups.
         * Prof can select student from selection list.
         *
         */
        tagName: "tr",
        initialize: function() {
            this.model.bind("change:answerable", this.render, this);
            this.model.bind("change:attempts", this.render, this);
            this.model.bind("change:correct", this.render, this);

            this.model.bind("change:opponent", this.bind_opponent, this);
            this.bind_opponent();

            this.render();
        },
        events: {
            "click .preview": "preview_question"
        },
        preview_question: function(e) {
            e.preventDefault();

            var panel = panels.add({
                "id": "tournament_question_preview",
                "title": "Preview Question",
                "layout": layouts.get("dialog"),
                "width": 500,
                "footer_buttons": {
                    "Close": "remove"
                }
            });
            panel.loading();

            var id = this.model.get("question_id");
            var question = new QuestionItem({"id": id});
            publisher.send({
                module: 'tournament',
                command: 'get_question_mi',
                args: {id: question.get('id')},
                success: function(data, args) {
                    question.set(args.data);
                    var question_details_view = new QuestionDetailsView({ model: question });
                    panel.$b().html(question_details_view.render().el);
                    $('.sms_code_instruc', panel.$b()).remove(); // get rid of the sms code
                }.bind(this)
            });
        },
        bind_opponent: function() {
            var opponent = this.model.get("opponent");
            if (opponent) {
                opponent.bind("change:answerable", this.render, this);
            }
            this.render();
        },
        generate_response_str: function() {
            var opponent = this.model.get("opponent");

            //Cover every scenario in which you do not have an opponent
            if (!opponent && this.model.get("correct")) {
                return "You won";
            } else if (!opponent && !this.model.get("correct")) {
                return "You lost";

            //You beat/lost/tied with opponent
            } else if (this.model.get("correct") && !opponent.get("correct")) {
                return "You beat " + opponent.get("alias");
            } else if (!this.model.get("correct") && opponent.get("correct")) {
                return "You lost to " + opponent.get("alias");
            } else if (!this.model.get("correct") && !opponent.get("correct")) {
                return "You tied with " + opponent.get("alias");

            //Cover every scernario in which you and your opponent got it correct
            } else if (this.model.get("correct") && opponent.get("correct")) {
                if (this.model.get("time") < opponent.get("time")) {
                    return "You beat " + opponent.get("alias");
                } else if (this.model.get("time") > opponent.get("time")) {
                    return "You lost to " + opponent.get("alias");
                } else {
                    return "You tied with " + opponent.get("alias");
                }
            }
        },
        render: function() {
            var template = "<td class='round'><%= round %></td><td class='msg'><%= message %></td><td class='attempts'><%= attempts %></td><td class='score'><%= score %></td><td><a href='#' class='preview fancy_button'>View Question</a>";
            var html = _.template(template, {
                "round": this.model.get("round_number"),
                "message": this.generate_response_str(),
                "attempts": this.model.get("attempts") || "-",
                "score": this.model.get("score") || "-"
            });
            $(this.el).html(html);
            //this.$('.preview').bind('click', this.preview_question.bind(this));  // TODO: Remove; replaced this with .on method.
            //this.$('.preview').on('click', this.preview_question.bind(this));  // TODO: Remove; using Backbone events property instead.
        }
    });
    return TournamentHistoryResponseView;
});
