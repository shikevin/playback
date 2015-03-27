/* globals panels, Backbone, _, Daedalus */

define([
    'models/course/CourseItems',
    'models/tournament/Practice',
    'views/course/CourseItemsPreview',
    'views/tournament/Details',
    'views/tournament/Schedule',
    'views/tournament/EditorPracticeList',
    'layouts/edumacation/LayoutCollection'
], function (
    CourseItems,
    TournamentPractice,
    CourseItemsPreviewView,
    TournamentDetailsView,
    TournamentScheduleView,
    TournamentEditorPracticeListView,
    layouts
) {
    'use strict';
    var TournamentEditView = Backbone.View.extend({
        /*
         * The master-view responsible for setting up the Tournament Editor
         * Coordinates the setting of tournament details, practice sessions,
         * question selection, and schedule selection
         *
         * All server calls originate from methods called from this view.
         */
        initialize: function() {
            this.render();
        },
        render: function(item) {
            /*
             * sets up the tournament editor panel
             */
            this.panel = panels.add({
                id: 'add_tournament',
                module: 'tournament',
                layout: layouts.get('dialog'),
                title: 'Add Tournament',
                width: 400,
                body: ''
            });

            //set a reference to the panel body; this will be used to set panel content from now on
            this.panel_el = this.panel.$b();

            this.render_tournament_details();
        },
        render_tournament_details: function() {
            /*
             * shows the basic deatils page
             */
            var view = new TournamentDetailsView({model: this.model});
            this.panel_el.html( this.render_header('New Tournament', 'Tournaments allow students to compete against each other by answering a series of timed questions.') );
            this.panel_el.append( view.el );

            //update panel
            this.panel.set({
                width: 500,
                footer_buttons: {
                    'Close': 'remove',
                    'Next': function() {
                        if( !view.is_valid() ) { return false; }
                        var data = view.get_data();

                        this.panel.loading();

                        this.model.save(data, {
                           success: function(model, response) {
                               this.render_select_questions();
                           }.bind(this)
                        });
                    }.bind(this)
                }
            });
        },
        render_practice_sessions: function() {
            /*
             * shows all the practice sessions in the tournament, with options
             * to add/remove/rename/select questions for each
             */
            var view = new TournamentEditorPracticeListView({model: this.model});
            this.panel_el.html( this.render_header('Practice Sessions', 'Practice sessions allow students to prepare for a tournament by answering questions in a non-graded, untimed manner.') );
            this.panel_el.append( view.el );

            this.panel.set({
                footer_buttons: {
                    'Back': $.proxy(function() {
                        this.render_next_steps();
                    }, this)
                }
            });

            var that = this;

            //handle practice deletion
            view.bind('delete_practice', function(id, title) {
                //add loading indicator to panel
                this.panel.loading();

                //delete panel and re-render list of practice sessions when done
                that.model.delete_practice_session(id, function() {
                    this.render_practice_sessions();
                }, this);
            }, this);

            //handle question selection
            view.bind('select_questions', function(id, title) {
                this.render_select_questions(id);
            }, this);

            //handle item adding
            view.bind('add_practice', function(title) {
                //add loading indicator
                this.panel.loading();

                //create new practice session
                var practice = new TournamentPractice();
                practice.save({
                    tournament_id: this.model.id,
                    name: title
                }, {
                    success: function(model, result) {
                        this.render_select_questions(model.id, 'practice');
                    }.bind(this)
                });
            }, this);

            //handle item renaming
            view.bind('rename_practice', function(id, title) {

                //rename the practice session
                var practice = new TournamentPractice();
                practice.save({
                    id: id,
                    tournament_id: this.model.id,
                    name: title
                });

            }, this);
        },
        render_select_questions: function(practice_id) {
            /*
             * renders the question selection menu for the tournament or practice session
             * if a practice_id is passed, will render for practice session; if no value passed,
             * will render for tournament
             */

            //set up list of question items
            var items = new CourseItems({max_height: 200});
            var tree;
            if (require('Modules').get_module('unitree').get('active')) {
                var subtree = require('Modules').get_module('unitree').get('tree').filter_module_ids(['question']);
                tree = items.sanitize_tree(subtree);
            } else {
                tree = items.sanitize_tree(require('Modules').get_module('question').get('tree'));
            }
            items.add_tree('question', tree);

            //get list of selected questions from server
            this.model.get_session_questions(practice_id, function( selected_questions ) {
                items.set({selected_ids: selected_questions});

                //this is terrible code, but i'm sick and i appologize
                if( advanced_form ) {
                    var num_questions = items.get('selected_ids').length;
                    var max_rounds = Math.floor(num_questions / 2);
                    advanced_form.get('max_rounds').set({num_less_than_equal: max_rounds});

                    items.bind('change:selected_ids', function(a,b,c,d) {
                        var num_questions = this.get('selected_ids').length;
                        var max_rounds = Math.floor(num_questions / 2);
                        advanced_form.get('max_rounds').set({
                            num_less_than_equal: max_rounds,
                            value: max_rounds
                        });
                    });
                }

            }, this);

            var view = new CourseItemsPreviewView({model: items, clickable: false});
            this.panel_el.html( this.render_header('Add Tournament', 'Select the questions you wish to have in your tournament.') );
            this.panel_el.append( view.el );

            var advanced_form;
            if( !practice_id ) {
                this.panel_el.append('<div id=\'num_rounds_form\'></div>');
                var max_rounds = this.model.get('max_rounds') || 0;
                advanced_form = this.panel_el.find('#num_rounds_form').composer([
                    {
                        id: 'max_rounds',
                        type: 'picker',
                        options: _.range(0,200),
                        index: max_rounds,
                        num_less_than_equal: max_rounds,
                        label: 'Number of rounds',
                        validation: ['num_less_than_equal']
                    }
                ]);
            }

            view.render();

            this.panel.set({
                footer_buttons: {
                    'Back': function() {
                        if (practice_id) {
                            this.render_practice_sessions();
                        } else {
                            this.render_tournament_details();
                        }
                    }.bind(this),
                    'Save': function() {
                        if( advanced_form && !advanced_form.is_valid() ) {
                            return false;
                        }
                        //this is terrible code, but i'm sick and i appologize
                        var max_rounds = advanced_form && advanced_form.get('max_rounds').value();
                        this.handle_selected_questions( items, practice_id, max_rounds );
                    }.bind(this)
                }
            });
        },
        handle_selected_questions: function(items, practice_id, max_rounds) {
            /*
             * called after a user has clicked 'next' on the question selection page; confirms that enough
             * questions have been provided and then saves questions, jumping user to appropriate page
             */
            var selected_ids = items.get('selected_ids');

            if( practice_id ) {
                //if this is a practice, save the selected ids to the practice session and go back to practice sessions view
                this.panel.loading();
                var practice = new TournamentPractice();
                practice.save({
                    id: practice_id,
                    tournament_id: this.model.id,
                    question_ids: selected_ids
                }, {
                    success: function(model, result) {
                        this.model.fetch().done(function(){
                            this.render_practice_sessions();
                        }.bind(this));
                    }.bind(this)
                });
            } else {
                //if this is a tournament, save the questions to the tournament and show the schedule page
                this.panel.loading();
                this.model.save({
                    max_rounds: max_rounds,
                    question_ids: selected_ids
                }, {
                    success: function(model, result) {
                        this.render_next_steps();
                        var event_name = 'created tournament';
                        // ugly - parse KeyString
                        var properties = {
                            moduleItemId: model.get('id')
                        };
                        Daedalus.track(event_name, properties);
                        Daedalus.increment('numTournamentsCreated');
                        Daedalus.set_property('lastTournamentCreated', new Date());
                    }.bind(this)
                });

            }
        },
        render_next_steps: function() {
            var html = '<div class=\'tournament_created\'>' +
                this.render_header('Tournament Created', 'Your tournament is ready to use!') +
                '<h2>Optional Steps:</h2><div class=\'steps\'></div></div>';

            this.panel.$b().html(html);
            this.panel.$b('.steps').composer([
                {
                    id: 'schedule',
                    type: 'button',
                    change: function() { this.render_schedule(); }.bind(this),
                    value: 'Schedule the tournament'
                },
                {
                    id: 'practice',
                    type: 'button',
                    change: function() { this.render_practice_sessions(); }.bind(this),
                    value: 'Create a practice session'
                }
            ]);

            this.panel.set({
                footer_buttons: {
                    'Done': 'remove'
                }
            });
        },
        render_header: function(title, description) {
            return '<div class=\'tournament_header\'>' +
                '<h1>' + title + '</h1>' +
                '<p>' + description + '</p>' +
            '</div>';
        },
        render_schedule: function() {
            /*
             * renders the page that sets the tournament schedule
             */

            this.panel_el.html( this.render_header('Tournament Schedule', 'Tournament schedules allow you to launch tournaments at a specific time in the future. You will no longer need to be present to launch the tournament.') );

            if (this.model.get('has_been_played')) {
                this.panel_el.append('<p class=\'warn\'>This tournament has already been played and cannot be rescheduled.');
                return;
            }
            var view = new TournamentScheduleView({model: this.model});
            this.panel_el.append( view.el );

            this.panel.set({
                footer_buttons: {
                    'Cancel': function() { this.render_next_steps(); }.bind(this),
                    'Save': function() { this.handle_schedule_submission(view); }.bind(this)
                }
            });
        },
        handle_schedule_submission: function(view, past_schedules_confirmed) {
            /*
             * saves the tournament's schedule; if a scheduled event is set for the past, launches
             * the tournament immediately
             */
            var schedules = view.get_schedules();

            if( !view.contains_past_schedules() || past_schedules_confirmed ) {
                this.model.set_schedules( schedules );
                this.render_next_steps();
            } else {
                this.panel_el.html('<p class=\'warn\'>Submitting a tournament for this time will start the tournament immediately.</p>');
                this.panel.set({
                    footer_buttons: {
                        'Cancel': function() { return this.render_schedule(); }.bind(this),

                        //if acknowledged, call self again, marking past schedules as confirmed
                        'Ok': function() { return this.handle_schedule_submission(view, true); }.bind(this)
                    }
                });
            }
        }
    });

    return TournamentEditView;
});
