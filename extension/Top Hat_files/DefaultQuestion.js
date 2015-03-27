/* jshint quotmark: false, strict: false */
/*global _ */
define([
    'mathjax'
], function (mathjax) {
    var DefaultQuestionItem = {
        "placeholders": {
            "description": ""
        },
        "bind_editor_el": function() {},
        "bind_student_answer_form": function() {},
        "get_student_answer": function() {},
        "set_student_answer": function(el, answer_text) {
            $(el).find(".submission_msg").remove();
            $(el).append($('<div title="" class="submission_msg">').text(
                'You answered: ' + answer_text.replace(/\|,,\|/g, ",")));
            var regex = /\|,,\|/g;
            var seperator = ',';
            $(el).find(".submission_msg").prop('title', answer_text.replace(regex, seperator));
            mathjax.execute_mathjax($(el).find('.submission_msg')[0]);
        },
        "show_answer_in_answer_form": function ($el) {
            var correct_answer_str = ( this.get("correct_answers") && this.get("correct_answers").join ) ? this.get("correct_answers").join(", ") : undefined;
            var correct_answer_html = (
                "<span class='correct_answers magnify_scale_font' " +
                "magnify_max_font='24'>Correct Answer: <b>" +
                _.escape(correct_answer_str).replace(/\|,,\|/g, ",") +
                "</b></span>");
            var view = this.get('view');
            if (view === undefined || view.panel === undefined) { return; }
            if (view.panel.$el().find(".question_details_tab .correct_answers").length === 0) {
                view.panel.$(".question_content").after(correct_answer_html);
                mathjax.execute_mathjax(view.panel.$(".correct_answers")[0]);
            }
        }
    };

    return DefaultQuestionItem;
});
