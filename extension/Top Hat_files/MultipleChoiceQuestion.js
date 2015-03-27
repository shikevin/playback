/* global define, _ */
define([
    'text!templates/question/question_form.html',
    'util/Browser'
], function (
    html,
    Browser
) {
    'use strict';
    var MultipleChoiceQuestionItem = {
        template: _.template(html),
        'placeholders': {
            'description': 'Please select the correct choice, then click \'Submit\':'
        },
        'show_answer_in_answer_form': function ($el) {
            var view = this.get('view');
            if (view === undefined || view.panel === undefined) { return; }
            //highlight multiple choice options
            var enabled = view.panel.$('label.correct_answers').length;
            if (enabled) {
                view.panel.$('label.correct_answers').removeClass('correct_answers');
            } else {
                //get all correct answers and stringify them
                var correct_answers = this.get('correct_answers');
                correct_answers = _.map(correct_answers, function(item) {
                    return _.unescape(item); // decode any special html chars
                });

                view.panel.$('.question_content label').each(function() {
                    var value = $(this).find('.description').text() || $(this).find('b').text();
                    if( _.include(correct_answers, value) ) {
                        $(this).addClass('correct_answers');
                    }
                });
            }
        },
        bind_editor_el: function(el, form) {
            //Add all_correct to form
            form.add([
                {
                    id: 'all_correct',
                    type: 'checkbox',
                    label: 'Students may select multiple answers',
                    change: function() {
                        // When checkbox is clicked, we want to re-validate the form
                        // to trigger 'correct_items_specified' validation to
                        // check commas and display the warning early to user
                        form.get('choices').is_valid();
                    }
                }
            ]);

            // Move the all_correct label to the top of the options list
            form.get('active_immediately').get('el').before(form.get('all_correct').get('el'));

            //validation used by the choices set to ensure that a correct item is specified when the 'has correct answer' checkbox is checked
            form.addValidation('correct_items_specified', function() {
                var has_correct_answer = this.collection.get('has_correct_answer').value();
                if (!has_correct_answer) {
                    return true;
                } else {
                    var correct_answers = $(this.get('el')).find('.cInput input[type=\'checkbox\']:checked');
                    return correct_answers.length ? true : 'A correct answer must be specified';
                }
            });

            form.addValidation('does_not_contain_string_if_all_correct', function(item_val) {
                // Our DB schema doesn't support answering questions with answers
                // that contain commas, however this only applies when there are
                // multiple answers to a question, ie. when all_correct is true
                var is_all_correct_checked = form.get('all_correct').value();

                var is_valid = true;
                if (is_all_correct_checked) {
                    // If multiple answers allowed, we'll use our existing 'does_not_contain_string validation'
                    is_valid = $.fn.composerValidation.does_not_contain_string.apply(this, [item_val]);
                }

                return is_valid;
            });

            //create form
            form.get('question_fields').value([
                {
                    'id': 'correct_answers',
                    'type': 'hidden'
                },
                {
                    'id': 'choices',
                    'type': 'set',
                    'set_wrapper': '<table><thead><tr><th>Value</th><th class=\'correct_answer\'>Correct</th><th>Delete</th></tr></thead><tbody class=\'cSetWrapper\'></tbody></table>',
                    'structure_wrapper': '<tr></tr>',
                    'validation': ['not_empty', 'correct_items_specified', 'does_not_contain_string_if_all_correct'],
                    'does_not_contain_string': ',',
                    'structure': function(set_item) {

                        if (!set_item.value()) {
                            set_item.value('abcdefghijklmnopqrstuvwxyz'.charAt(set_item.index));
                            return false;
                        }
                        $(set_item.el).data('is_auto', (set_item.value().length === 1) ? true : false);

                        //determine if the item is correct
                        var correct_answers = this.collection.get('correct_answers');

                        if (correct_answers) {
                            correct_answers = correct_answers.value();
                        } else {
                            correct_answers = [];
                        }
                        var is_correct =  _.include(correct_answers, set_item.value());

                        var html = '';
                        html += '<td><input type=\'text\' tabindex=\'' + (set_item.index + 1) + '\' class=\'' + ($(set_item.el).data('is_auto') ? 'auto' : '') + '\'></td>';
                        html += '<td class=\'correct_answer\'><input type=\'checkbox\' ' + (is_correct ? 'checked' : '') + ' ></td>';
                        html += '<td>' + set_item.generateDeleteButton() + '</td>';

                        $(set_item.el).html(html);
                        $(set_item.el).find('input').val(set_item.value());

                        //bind enter key to add new element to set if this is the last item
                        if ($(set_item.el).is(':last-child') && set_item.index < 25){
                            $(set_item.el).closest('.cSetWrapper').find('input[type=\'text\']').unbind('keydown');
                            $.fn.composerWidgets.set.bind_new_row_on_enter(this, $(set_item.el).find('input[type=\'text\']'));
                        }

                        //when the text field is changed, update the choices set
                        var form_item = this;
                        $(set_item.el).find('input[type=\'text\']').bind('blur', function() {
                            //get the old and new values
                            var old_value = set_item.value();
                            var new_value = $(this).val();
                            $(set_item.el).data('is_auto', (new_value.length === 1) ? true : false);

                            //if item is set as correct, we need to update the correct answers list
                            var is_correct_answer = $(set_item.el).find('input[type=\'checkbox\']').is(':checked');

                            if (is_correct_answer) {
                                var correct_answer_item = form_item.collection.get('correct_answers');
                                var correct_answer_value = $.extend([], correct_answer_item.value());

                                //remove old value and add new value to the correct answer list
                                correct_answer_value = _.reject(correct_answer_value, function(correct_answer) { return correct_answer === old_value; });
                                correct_answer_value.push(new_value);

                                //set correct answer value list
                                correct_answer_item.value(correct_answer_value);
                            }

                            //update the value for the set
                            set_item.value(new_value);
                            return true;
                        });

                        $(set_item.el).find('input[type=\'text\']').bind('input propertychange', function(){
                            $(set_item.el).data('is_auto', (set_item.value().length === 1) ? true : false);
                        });

                        $(set_item.el).find('input[type=\'text\']').bind('focus', function() {
                            if ($(set_item.el).data('is_auto')) {
                                $(this).val('');
                                $(this).removeClass('auto');
                            }
                        });

                        //show/hide the 'correct' checkboxes when the 'has correct answer' checkbox is changed
                        var has_correct_answer_item = this.collection.get('has_correct_answer');
                        var show_hide_correct = function() {
                            var show_correct = has_correct_answer_item.value() ? true : false;
                            $(set_item.el).find('input[type=\'checkbox\']').attr('disabled', !show_correct);
                        };
                        has_correct_answer_item.bind('change', show_hide_correct);

                        if (!has_correct_answer_item.value()) { show_hide_correct(); }

                        //when the correct answer checkbox is toggled or an item is deleted, update the 'correct_answers' form item
                        function update_correct_answers() {

                            var value = [];

                            $(this).parents('.cRow').find('input[type=\'checkbox\']:checked').each(function() {
                                value.push($(this).val());
                            });
                            form_item.collection.get('correct_answers').value(value);


                            form_item.is_valid(); //re-run validation to see if the correct_items_specified validator is still passing
                        }
                        $(set_item.el).find('input[type=\'checkbox\']').bind('change', update_correct_answers);


                        return true;
                    },
                    'sortable': false,
                    'delete': function(index, val) {
                        //remove old value from the correct answer list, if it is present
                        var correct_answer_item = this.collection.get('correct_answers');
                        var correct_answer_value = _.reject(correct_answer_item.value(), function(ca) { return ca === val; });
                        correct_answer_item.value(correct_answer_value);

                    }
                }
            ]);

            //if we are editing question, populate values; otherwise, populate blank question form
            var data = {};

            if (this.get('id')) {

                data = this.toJSON();
                _.each(data.choices, function (choice, index) {
                    var unescaped_choice = $('<div/>').html(choice).text();
                    data.choices[index] = unescaped_choice;
                });
                _.each(data.correct_answers, function (answer, index) {
                    var unescaped_answer = $('<div/>').html(answer).text();
                    data.correct_answers[index] = unescaped_answer;
                });

            } else {
                data = {
                    'correct_answers': ['a'],
                    'choices': ['a','b','c','d']
                };
            }
            form.values(data);

            return form;
        },
        'bind_student_answer_form': function(el) {
            //if question is multiple choice, get multiple choice data
            var choices = [];

            choices = $.extend([], this.get('choices'));
            choices = _.map(choices, function(choice, index) {
                var choice_bullet_list = 'abcdefghijklmnopqrstuvwxyz'; //the list of 1-char values that are added to the beginning of the choice (e.g. a) Agree b) Disagree)
                return {
                    bullet: choice_bullet_list[index],
                    value: choice,
                    description: (choice_bullet_list[index] === choice) ? null : choice
                };
            });

            var data = {
                answer_choices: choices,
                is_mobile: Browser.is_mobile(),
                is_teacher: window.user.get('role') === 'teacher',
                id: this.get('id'),
                type: 'mc',
                all_correct: this.get('all_correct')
            };

            if (window._.isArray(choices)) {
                $(el)
                    .addClass('height-base')
                    .addClass('height-' + choices.length);
            }

            $(el).html(this.template(data));
            return data;
        },
        'get_student_answer': function(el) {
            var answer_fields = $(el).find('.answer_field');
            if (this.get('all_correct')) {
                // This just returns a list of all the checked items in the answer field
                var checked = answer_fields.filter('[type=checkbox]').filter(':checked');
                return checked.map(function() { return $(this).val(); }).toArray();
            } else {
                //Be aware of iphone trim bug: http://api.jquery.com/jQuery.trim/#comment-86516696
                return answer_fields.filter('[type=radio]').length ? answer_fields.filter(':checked').val() : $.trim(answer_fields.val());
            }
        },
        clear_answer: function(el) {
            var answer_fields = $(el).find('.answer_field');
            answer_fields.filter(':checked').each(function() {
            $(this)[0].checked = false;
            if (is_mobile) {
                $(this).checkboxradio('refresh');
            }
            });
        }

    };

    return MultipleChoiceQuestionItem;
});
