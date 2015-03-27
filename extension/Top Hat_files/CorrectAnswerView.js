define([
    'text!templates/question/mc_correct.html',
    'text!templates/question/na_correct.html',
    'text!templates/question/wa_correct.html'
], function (mc_correct, na_correct, wa_correct) {
    CorrectAnswerView = Backbone.View.extend({
        className: "correct_answer_view magnify_scale_font",
        events: {
            'change .mc_correct input': 'set_mc_answers',
            'click .wa_correct .add': 'add_wa_answers',
            'click .na_correct .add': 'save_na_answers'
        },
        render: function () {
            switch(this.model.get('type')) {
            case "mc":
                // render mc view
                this.$el.html(_.template(mc_correct, this.model.attributes));
                break;
            case "na":
                // render na view
                this.$el.html(na_correct);
                this.$('.form_container').composer([
                    {
                        "id": "correct_answer",
                        "type": "text",
                        "is_numeric": true,
                        "label": "Correct answer",
                        "validation": ["number"],
                        "value": this.model.get("answer")
                    },
                    {
                        "id": "tolerance",
                        "type": "text",
                        "is_numeric": true,
                        "label": "Tolerance",
                        "validation": ["number"],
                        "value": this.model.get("tolerance")
                    }
                ]);
                break;
            case "wa":
                // render wa view
                this.$el.html(wa_correct);
                this.$('.case_sensitive_container', this.answer_form).composer([
                    {
                        "id": "is_case_sensitive",
                        "type": "checkbox",
                        "label": "Case-sensitive",
                        "value": false
                    }
                ]);
                this.$('.new_answer_container', this.answer_form).composer([
                    {
                        "id": "new_answer",
                        "type": "text",
                        "label": "Correct answer",
                        "validation": ["not_empty"]
                    }
                ]);
                this.$('#is_case_sensitive').change(function() {
                    this.model.set({"case_sensitive":Boolean(this.$('#is_case_sensitive').attr("checked"))});
                    this.model.save();
                }.bind(this));
                break;
            }
        },
        save_na_answers: function () {
            var answer, tolerance;
            answer = this.$('#correct_answer').val();
            tolerance = this.$('#tolerance').val();
            if(answer) {
                this.model.set({"correct_answer": answer, "has_correct_answer":true});
            }
            if(tolerance) {
                this.model.set({"tolerance": tolerance});
            }
            if(correct_answer || tolerance) {
                this.model.save({}, {
                    success: function () {
                        // sorry for the inline html/css but it's getting really late
                        var success = $('<span style="margin-left: 10px; display:inline">Saved</span>');
                        this.$('.save_button a').after(success);
                        success.fadeOut(1000);
                    }.bind(this)
                });
            }

        },
        add_wa_answers: function () {
            var answer, answer_list;
            answer = this.$('#new_answer').val();
            answer_list = this.model.get('correct_answers');
            answer_list.push(answer);
            this.model.set({
                choices: answer_list,
                correct_answers: answer_list,
                has_correct_answer: true
            });
            this.model.save({}, {
                success: function () {
                    // sorry for the inline html/css but it's getting really late
                    var success = $('<span style="margin-left: 10px; display:inline">Saved</span>');
                    this.$('.add').after(success);
                    success.fadeOut(1000);
                }.bind(this)
            });
        },
        set_mc_answers: function () {
            var selected = _.map(this.$('input:checked'), function (input) { return $(input).val(); });
            this.model.set( {'correct_answers': selected, 'has_correct_answer': selected.length > 0 });
            this.model.save();
        }
    });
    return CorrectAnswerView;
});