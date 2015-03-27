/* global Backbone */
define([
    'views/question/details',
    'util/Browser'
], function (
    QuestionDetailsView,
    Browser
) {
    "use strict";
    var TournamentQuestionView = Backbone.View.extend({
        /*
         * Tournament's Question representation. Shown to students when they "face off".
         *
         */
        render: function() {
            //bind question body to content
            var controller = this.model.get("controller");

            var response = controller.get("current_response");
            if (response === undefined) {
                return;
            }
            this.question = response.get_question_instance();

            controller.pauseCountdown();
            this.$el.append($('#loading_template').html());
            var view = new QuestionDetailsView({ model: this.question });
            this.$el.html(view.render().el);
            this.$('.submitted_answer').remove();

            //hack to get jquery mobile to render form elements properly
            if (Browser.is_mobile()) {
                try {
                    this.$el.parents('div[data-role=page]').page('destroy').page();
                } catch (e) {} //will raise exception if mobile page has not been initialized
            }

            controller.resumeCountdown();
        },
        get_answer: function() {
            return this.question.get_student_answer($('.question_content', this.el));
        }
    });
    return TournamentQuestionView;
});