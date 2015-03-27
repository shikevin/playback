/* global global, _ */
define([
    'mathjax'
], function (mathjax) {
    'use strict';

    var SortQuestionItem = {
        'placeholders' : {
            'description': 'Sort these items into the correct order, then click \'Submit\':'
        },
        'bind_editor_el': function(el, form) {

            form.get('question_fields').value([
                {
                    'id': 'type',
                    'type': 'hidden',
                    'value': 'sort'
                },
                {
                    'id': 'sorted_options',
                    'type': 'set',
                    'sortable': true,
                    'does_not_contain_string': ',',
                    'validation': ['not_empty', 'does_not_contain_string'],
                    'structure': function(set_item) {
                        var val = [''];
                        if (set_item.value()) {
                            val = set_item.value();
                        }

                        var html = '';
                        html += set_item.generateSortButton();
                        html += '<input type=\'text\' style=\'width:60%\' />';
                        html += set_item.generateDeleteButton();

                        $(set_item.el).html(html);
                        $(set_item.el).find('input[type=\'text\']').val( val );

                        // Bind enter key to add new element to set

                        $.fn.composerWidgets.set.bind_new_row_on_enter(this, $(set_item.el).find('input[type=\'text\']'), '');

                        $(set_item.el).find('input').bind('change', function() {
                            set_item.value( $(this).val() );
                        });

                    }
                }
            ]);
            form.values( this.get('id') ? this.toJSON() : {} );
            return form;
        },
        bind_student_answer_form: function(el) {
            var form = $(el).composer({
                id: 'student_sorting',
                type: 'set',
                sortable: true,
                structure: function(set_item) {
                    var get_index = this.get_subclass_fn('get_index').bind(this);
                    var index = get_index(set_item.value());
                    $(set_item.el).html(
                        '<div class=\'feedback_wrapper\'><div class=\'selection_feedback\'>&nbsp;</div>' +
                        set_item.generateSortButton() +
                        '<span class=\'cSortValue\'><b>' + String.fromCharCode(index + 97) + '</b> ' + set_item.value() + '</span>' +
                        '</div>');
                }.bind(this),
                set_wrapper: '<ul class=\'cSetWrapper magnify_scale_font\'></ul>',
                value: this.get('choices'),
                immutable: true
            });
            form.get('student_sorting').bind('change', function() {
                // Re-render match on change of value
                mathjax.execute_mathjax(el[0]);
            });

            if (window._.isArray(this.get('choices'))) {
                $(el)
                    .addClass('height-base')
                    .addClass('height-' + this.get('choices').length);
            }

            $(el).data('answer_form', form);

            return form;
        },
        'get_index': function(value) {

            for(var i=0; i<this.get('choices').length; i++) {

                if(value === this.get('choices')[i]) {
                    return i;
                }
            }
            throw 'Cannot get index of value ' + value;
        },
        'get_student_answer': function(el) {
            var form = $(el).data('answer_form');
            return form.get('student_sorting').value();
        },
        clear_answer: function(el) {
            var $currentDiv = $(document.getElementById('course_wrapper'));
            var scrollValue = $currentDiv.scrollTop();
            $(el).empty();
            this.get_subclass_fn('bind_student_answer_form').apply(this, [el]);
            $(el).append('<p>Your answer is anonymous.</p>');
            $currentDiv.scrollTop( scrollValue );
        }
    };

    return SortQuestionItem;
});
