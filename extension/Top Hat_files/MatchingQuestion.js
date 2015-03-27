/* globals _ */
define([
    'mathjax',
    'text!templates/question/matching_question_set_wrapper.html'
], function (
    mathjax,
    matching_question_set_wrapper_html
) {
    'use strict';

    var MatchingQuestionItem = {
        'placeholders' : {
            'description': 'Match the following items, then click \'Submit\':'
        },
        'bind_editor_el': function(el, form) {
            /* add a custom validation for validation - ['','Not a dummy',false] would fail, but ['', 'A dummy', true] would not */
            form.addValidation('matches_not_empty', function(item_val) {
                //loop through items and return list with true/false based on if they have empty values
                var results = _.map(item_val, function(item) {
                    var is_dummy = (item[2] === true) ? true : false;
                    var is_valid = _.isEmpty($.trim(item[1])) ? false : true;

                    if (!is_dummy && _.isEmpty($.trim(item[0]))) {
                        is_valid = false;
                    }
                    return is_valid;
                });

                return (results.length > 0 && !_.include(results, false)) ? true : 'Fields must not be empty';
            });

            form.get('question_fields').value([
                {
                    'id': 'type',
                    'type': 'hidden',
                    'value': 'match'
                },
                {
                    'id': 'match_a',
                    'type': 'hidden'
                },
                {
                    'id': 'match_b',
                    'type': 'hidden'
                },
                {
                    'id': 'matches',
                    'type': 'set',
                    'sortable': false,
                    'immutable': true,
                    'validation': ['matches_not_empty', 'does_not_contain_string'],
                    'does_not_contain_string': ',',
                    'structure': function(set_item) {
                        var val = set_item.value();
                        var html = '';

                        html += '<input type=\'text\' class=\'match_a\' /><b>&#x21E2;</b><input class=\'match_b\' type=\'text\' />';
                        html += set_item.generateDeleteButton();

                        if (val[2] === true) {
                            $(set_item.el).addClass('cMatchDummy');
                        }

                        $(set_item.el).html(html);

                        //set values
                        $(set_item.el).find('input.match_a').val(val[0]);
                        $(set_item.el).find('input.match_b').val(val[1]);

                        $(set_item.el).find('input').bind('change', { 'set_item': set_item, 'item': this }, function(e) {
                            var set_item = e.data.set_item;
                            var item = e.data.item;

                            var data = $.extend([], set_item.value());
                            var index = $(this).hasClass('match_a') ? 0 : 1;
                            data[index] = $(this).val();

                            var item_data = $.extend([], item.value());
                            item_data[ set_item.index ] = data;
                            item.value(item_data);
                        });
                    },
                    'set_wrapper': matching_question_set_wrapper_html,
                    'initialize': function() {

                        //bind to add dummy and add item events
                        var item = this;
                        this.get('el').find('.cMatchAdd a').bind('click', function(e) {
                            e.preventDefault();
                            var is_dummy = $(this).hasClass('cMatchAddDummy') ? true : false;
                            var val = ['','', is_dummy];

                            var item_val = $.extend([], item.value());
                            item_val.push(val);
                            item.value(item_val);
                        });
                    },
                    'change': function() {
                        var match_a = [];
                        var match_b = [];
                        var val = this.value();
                        _.each(val, function (v, index) {
                            match_a.push(v[0]);
                            match_b.push(v[1]);
                        });

                        this.collection.get('match_a').value( match_a );
                        this.collection.get('match_b').value( match_b );
                    }
                }
            ]);

            //set up form's data
            var data = {};
            if (!this.get('id')) {
                data.matches = [['','',false]];
            } else {
                data = this.toJSON();

                //create set value based on values of match_a and match_b items;
                var match_a = this.get('match_a');
                var match_b = this.get('match_b');
                var matches = [];
                _.each(match_a, function (m, index) {
                    var is_dummy = m ? false : true;
                    matches.push([m, match_b[index], is_dummy]);
                });
                data.matches = matches;
            }
            form.values(data);

            return form;
        },
        'show_answer_in_answer_form': function() {
            var view = this.get('view');
            if (view === undefined || view.panel === undefined) { return; }
            var answer_form = view.details_view.$('.question_content.cForm').data('answer_form').get('student_matching');
            if (answer_form.get('toggle_answer')) {
                answer_form.get('el').removeClass('toggle_answer');
                answer_form.value(answer_form.get('toggle_answer'));
                answer_form.set({'toggle_answer': undefined });
            } else {
                answer_form.get('el').addClass('toggle_answer');
                answer_form.set({'toggle_answer': answer_form.value() });

                var correct_answers = this.get('correct_answers')[0].split('|,,|');
                correct_answers = _.map(correct_answers, function(item) {
                    return $.trim(item);
                });

                answer_form.value( correct_answers );
            }
        },
        bind_student_answer_form: function(el) {
            var mi = this;
            var form = $(el).composer({
                id: 'student_matching',
                type: 'set',
                value: this.get('choices'),
                sortable: true,
                clickSort: true,
                immutable: true,
                structure: function(set_item) {
                    var mi_match_a = mi.get('match_a');
                    if(mi.get('show_answer')) {
                        // on show_answer, remove all the empty options
                        mi_match_a = _.compact(mi_match_a);
                    }
                    var match_a = mi_match_a[set_item.index];
                    var match_b = set_item.value();
                    var get_index = this.get_subclass_fn('get_index').bind(this);
                    var index = get_index(set_item.value());
                    var html = '';
                    var chr = String.fromCharCode(97 + index); // TODO: assert(0 <= set_item.index < 26)

                    if (match_a) {

                        html += '<td class=\'selectable\'><div class=\'feedback_wrapper\'><div class=\'match_wrapper\'>' + match_a + '</div><div class=\'selection_feedback\'>&nbsp;</div></div></td>';
                        html += '<td class=\'matching_arrow\'<b>⇢</b></td>';
                    } else {
                        html += '<td class=\'no_selection\'></td><td class=\'no_selection\'></td>';
                    }
                    html += '<td class=\'choosable disable\'><div id=\'' + chr + '\'class=\'feedback_wrapper\'><b>' + chr + '</b>';
                    html += '<div class=\'match_wrapper\'>' + match_b + '</div><div class=\'selection_feedback\'>&nbsp;</div></div></td>';
                    $(set_item.el).html(html);
                }.bind(this),
                "set_wrapper": "<table class='magnify_scale_font' magnify_max_font='18' aria-label='To match items, click a cell in the SELECT ONE column. Find, then click, the matching cell in the MATCH WITH column.' ><thead><tr><th>Select One</th><th></th><th>Match With</th></tr></thead><tbody class='cSetWrapper '></tbody></table>",
                "structure_wrapper": "<tr></tr>"
            });
            form.get('student_matching').bind('change', function() {
                // Re-render match on change of value
                mathjax.execute_mathjax(el[0]);
            });

            if (_.isArray(this.get('match_a')) && _.isArray(this.get('match_b'))) {
                var max = Math.max(this.get('match_a').length, this.get('match_b').length);
                $(el)
                    .addClass('height-base')
                    .addClass('height-' + max);
            }


            $(el).data('answer_form', form);

            return form;
        },
        'get_student_answer': function(el) {
            var form = $(el).data('answer_form');
            return form.get('student_matching').value();
        },

        'get_index': function(value) {
            for (var i = 0; i<this.get('choices').length; i++) {
                if (value === this.get('choices')[i]) {
                    return i;
                }
            }
            throw 'Cannot get index of value ' + value;
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

    return MatchingQuestionItem;
});
