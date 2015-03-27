define([
    'views/question/details',
    'text!templates/tournament/tournament_practice_match_header.html'
], function (QuestionDetailsView, html) {
    var TournamentPracticeQuestionView = Backbone.View.extend({
        initialize: function() {
            this.render();
            this.model.bind("change:round_attempts", this.render, this);
        },
        render: function() {
            var data = {
                "attempts": this.model.get("round_attempts"),
                "max_attempts": this.model.get("tournament").get("max_attempts")
            };
            var container = $(_.template(html)(data));
            var clockElement = container.find("span");
            var clock = setInterval(function() {
                var now = new Date();
                var dt = (now - this.model.get("round_start_time")) / 1000;
                var mins = Math.floor(dt/60);
                var sec = Math.round(dt % 60);
                clockElement.text(mins + ":" + (sec < 10? "0"+sec : sec));
            }.bind(this), 1000);

            //add question
            var el = $("<div id='tournament_currentQuestion'></div>");

            this.question = this.model.get("round_question");
            //this.question.bind_body_el(el);
            var question_details_view = new QuestionDetailsView({ model: this.question });
            el.append(question_details_view.render().el);
            el.find('h2:contains("Question:")').text(this.question.get('title'));

            el.find(".sms_code_instruc").remove();
            container.append(el);

            //set this view's element to be the question
            $(this.el).html( container );
        },
        get_answer: function() {
            return this.question.get_student_answer( $(this.el).find(".question_content") );
        }
    });
    return TournamentPracticeQuestionView;
});