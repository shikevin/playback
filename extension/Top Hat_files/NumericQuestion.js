define([
    'util/Browser'
], function (
    Browser
) {
    'use strict';
    var NumericQuestionItem = {
        'placeholders': {
            'description': 'Please enter the correct numeric answer, then click \'Submit\':'
        },
        bind_editor_el: function(el, form) {
            // Create form
            form.get('question_fields').value([
            {
                'id': 'type',
                'type': 'hidden',
                'value': 'na'
            },
            {
                'id': 'correct_answer',
                'type': 'text',
                'label': 'Answer',
                'validation': ['not_empty', 'number']
            },
            {
                'id': 'tolerance',
                'type': 'text',
                'label': 'Tolerance',
                'validation': ['num_greater_than_equal', 'not_empty', 'number'],
                'num_greater_than_equal': 0,
                'tooltip': 'The range (+-) that the student may deviate from the correct answer. Set to "0" if students may only answer correct value.'
            }
            ]);
            form.values( this.get('id') ? this.toJSON() : {} );

            // If user unchecks "has correct answer", hide the answer field
            form.get('has_correct_answer').bind('change', function() {
                if (!form.get('has_correct_answer').value()) {
                    form.get('correct_answer').hide();
                    form.get('tolerance').hide();
                } else {
                    form.get('correct_answer').show();
                    form.get('tolerance').show();
                }
            });

            if (!form.get('has_correct_answer').value()) {
                form.get('correct_answer').hide();
                form.get('tolerance').hide();
            }

            return form;
        },
        validate_answer: function (mi) {
            /**
             * Check to make sure that the answer is submittable
             * For this model, that means it should be a valid numeric type
             */
            var value = mi.get('view').panel.$b('.question_content');
            var answer_text = mi.get_student_answer(value);

            if (_.contains(answer_text, '^')) {
                answer_text = answer_text.replace('^', '');
                answer_text = answer_text.replace(/-/g, '');
                answer_text = answer_text.replace('.', '');
            } 
            if (isNaN(answer_text)) {
                mi.set({ submission_msg: 'Please enter a valid number.'});
                return false;
            }
            return true;

        },
        bind_student_answer_form: function(el) {
            var data = {
                id: this.get('id'),
                is_mobile: Browser.is_mobile(),
                is_teacher: (window.user.get('role') === 'teacher') ? true : false,
                type: 'na'
            };

            $(el).html(this.template(data));
        },
        get_student_answer: function(el) {
            var answer_fields = $(el).find('.answer_field');

            //Be aware of iphone trim bug: http://api.jquery.com/jQuery.trim/#comment-86516696
            var answer = ( answer_fields.filter('[type=radio]').length ) ? answer_fields.filter(':checked').val() : $.trim(answer_fields.val());

            // remove commas
            answer = answer.replace(/,/g, '');

            return answer;
        },
        clear_answer: function (el) {
            $(el).find('.answer_field').val('');
        }
    };

    return NumericQuestionItem;
});
