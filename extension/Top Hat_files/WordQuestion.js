define([
    'util/Browser'
], function (
    Browser
) {
    var WordQuestionItem = {
        'placeholders' : {
            'description': 'Enter the correct word answer, then click \'Submit\':'
        },
        'bind_editor_el': function(el, form) {
            // Create form
            form.get('question_fields').value([
                {
                    'id': 'type',
                    'type': 'hidden',
                    'value': 'wa'
                },
                {
                    'id': 'choices',
                    'type': 'set',
                    'structure': function(set_item) {
                        var html = '';
                        html += set_item.generateSortButton();
                        html += '<input type=\'text\' style=\'width:70%\' />';
                        html += set_item.generateDeleteButton();

                        $(set_item.el).html(html);
                        $(set_item.el).find('input[type=text]').val( set_item.value() );

                        //bind enter key to add new element to set if this is the last item
                        if($(set_item.el).is(':last-child')){
                            $.fn.composerWidgets.set.bind_new_row_on_enter(this, $(set_item.el).find('input[type=\'text\']'));
                        }

                        // On input change, update values
                        $(set_item.el).find('input').bind('change', function() {
                            set_item.value($(this).val());
                        });
                    },
                    'validation': ['not_empty']
                },
                {
                    'id': 'case_sensitive',
                    'type': 'checkbox',
                    'label': 'Answer is case sensitive',
                    'value': true
                }
            ]);
            form.values( this.get('id') ? this.toJSON() : {} );
            if (this.get('correct_answers').length !== 0) {
                form.get('choices').value(this.get('correct_answers'));
            } else {
                form.get('choices').value(['']);
            }

            // If user unchecks 'has correct answer', hide the answer field

            form.get('has_correct_answer').bind('change', function() {
                if (!form.get('has_correct_answer').value()) {
                    form.get('choices').hide();
                    form.get('case_sensitive').hide();
                } else {
                    form.get('choices').show();
                    form.get('case_sensitive').show();
                }
            });

            if (!form.get('has_correct_answer').value()) {
                form.get('choices').hide();
                form.get('case_sensitive').hide();
            }
            return form;
        },

        bind_student_answer_form: function(el) {
            var data = {
                id: this.get('id'),
                is_mobile: Browser.is_mobile(),
                is_teacher: (window.user.get('role') === 'teacher') ? true : false,
                type: 'wa'
            };
            $(el).html(this.template(data));
        },
        
        get_student_answer: function(el) {
            var answer_fields = $(el).find('.answer_field');

            //Be aware of iphone trim bug: http://api.jquery.com/jQuery.trim/#comment-86516696
            var answer = ( answer_fields.filter('[type=radio]').length ) ? answer_fields.filter(':checked').val() : $.trim(answer_fields.val());
            return answer;
        },
        clear_answer: function (el) {
            $(el).find('.answer_field').val('');
        }

    };

    return WordQuestionItem;
});
