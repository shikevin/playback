define([
], function (
) {
    'use strict';
    var TournamentDetailsView = Backbone.View.extend({
        /*
         * Responsible for rendering the form that populates basic tournament details - the name,
         * number of questions, etc.
         *
         * Methods:
         * - is_valid(): return true/false if all form data is correct
         * - get_data(): returns JSON obj with all form data
         *
         * Events:
         * - toggle_advanced: called when the 'advanced items' checkbox is triggered; use to resize container panel
         */
        initialize: function() {
            this.render();
        },
        is_valid: function() {
            return ( this.tournament_form.is_valid() && this.advanced_form.is_valid() ) ? true : false;
        },
        get_data: function() {
            var tournament_form = this.tournament_form.values_or_placeholders();
            var advanced_form = this.advanced_form.values_or_placeholders();
            return _.extend(tournament_form, advanced_form);
        },
        set_advanced_settings_visibility: function(visible) {
            if (visible) {
                this.$el.addClass('advanced');
            } else {
                this.$el.removeClass('advanced');
            }
        },
        render: function() {
            $(this.el).html('<div id=\'tournament_properties\'></div>' +
                    '<div id=\'tournament_advanced\'></div>');
            var that = this;

            //try to get placeholder tournament name
            var title_placeholder;
            try {
                var num_questions = require('Modules').get_module('tournament').get("tree").flatten(true).length;
                title_placeholder = 'Tournament ' + (num_questions + 1);
            } catch(e) {
                title_placeholder = '';
            }

            //render basic settings
            this.tournament_form = $(this.el).find('#tournament_properties').composer([
                {
                    id: 'id',
                    type: 'hidden',
                    value: this.model.id
                },
                {
                    id: 'name',
                    type: 'text',
                    label: 'Name',
                    value: this.model.get('title'),
                    placeholder: title_placeholder
                },
                {
                    id: 'advanced',
                    type: 'checkbox',
                    label: 'Show advanced settings',
                    change: function () {
                        requirejs('models/UserSettings').set({ tournament_advanced_settings: this.value() });
                        that.set_advanced_settings_visibility(this.value());
                    }
                },
                {
                    id: 'active_immediately',
                    type: 'checkbox',
                    label: 'Tournament immediately available',
                    value: (this.model.get('status') !== 'inactive') ? true : false
                }
            ]);

            //advanced options
            this.advanced_form = $(this.el).find('#tournament_advanced').composer([
                {
                    id: 'max_attempts',
                    type: 'text',
                    numeric: true,
                    value: this.model.get('max_attempts') || 3,
                    label: 'Max attempts per question',
                    validation: ['num_greater_than_equal'],
                    num_greater_than_equal: 1
                },
                {
                    id: 'round_length',
                    type: 'text',
                    numeric: true,
                    value: this.model.get('round_length') || 30,
                    label: 'Length of each round (sec)',
                    validation: ['num_greater_than_equal'],
                    num_greater_than_equal: 5
                },
                {
                    id: 'participation_score',
                    type: 'text',
                    numeric: true,
                    value: this.model.get('participation_score') || '0',
                    label: 'Participation weight',
                    validation: ['num_greater_than_equal'],
                    num_greater_than_equal: 0
                },
                {
                    id: 'correctness_score',
                    type: 'text',
                    numeric: true,
                    value: this.model.get('correctness_score') || '0',
                    label: 'Correctness weight',
                    validation: ['num_greater_than_equal'],
                    num_greater_than_equal: 0
                },
                {
                    id: 'correct_answer_score',
                    type: 'text',
                    numeric: true,
                    value: this.model.get('correct_answer_score') || '0',
                    label: 'Points for correct answer',
                    validation: ['num_greater_than_equal'],
                    num_greater_than_equal: 0
                },
                {
                    id: 'first_answer_score',
                    type: 'text',
                    numeric: true,
                    value: this.model.get('first_answer_score') || '0',
                    label: 'Points for quickest correct answer',
                    validation: ['num_greater_than_equal'],
                    num_greater_than_equal: 0
                },
                {
                    id: 'incorrect_answer_penalty',
                    type: 'text',
                    numeric: true,
                    value: this.model.get('incorrect_answer_penalty') || '0',
                    label: 'Penalty for incorrect attempt',
                    validation: ['num_greater_than_equal'],
                    num_greater_than_equal: 0
                }

            ]);

            // Look up user settings to see if we want to show advanced settings
            requirejs('models/UserSettings').get(
                { tournament_advanced_settings: 'tournament_advanced_settings' },
                function(settings) {
                    var advanced_checkbox = that.tournament_form.items()[2];

                    // Toggling the checkbox and advanced settings views appropriately
                    advanced_checkbox.set('value', settings.tournament_advanced_settings);
                    that.set_advanced_settings_visibility(settings.tournament_advanced_settings);
                }, { tournament_advanced_settings: false });
        }
    });

    return TournamentDetailsView;
});
