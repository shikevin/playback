/*global define, window, _, panels*/
define([
    'views/ModuleControl'
], function (ModuleControlView) {
    'use strict';
    var TournamentControlView = ModuleControlView.extend({
        initialize: function() {
            ModuleControlView.prototype.initialize.call(this);

            //re-calculate the 'open tournament practice' button when tournament status is changed
            //when students are given grades for tournaments
            //or when practice sessions are added or removed from a tournament
            this.model.bind('change:next_tournament_start', this.render_tournament_countdown, this);

            // this.render_open_practice_button();


            //calculate next upcoming tournament and show the countdown timer for it
            this.model.request_next_scheduled_tournament();
        },

        // check if this has unfinished practice questions
        // if so, check if this is the most imminent tournament with practice questions
        // if so, make the open button visible and make it open this
        render_open_practice_button: function() {
            if (window.is_mobile) {
                // mobile has no control panel
                // there is nowhere to put the open button
                return;
            }

            if( (window.user.get('role') === 'teacher') ) { return false; }

            var unanswered_tournament = _.detect( this.model.get_active_unopened_tournaments(), function(tournament) {
                return tournament.has_unanswered_practice_session();
            });

            //look for the unanswered items template
            var open_bt_el = this.panel.$b('.unanswered_items');

            //render if it if we have unanswered tournaments, otherwise hide it
            if( !open_bt_el.length && unanswered_tournament ) {
                var el = $('<div class="unanswered_items">' +
                        '<div class="description">Tournament practice incomplete</div>' +
                        '<div class="link"><a href="#">Open</a>' +
                    '</div></div>');
                this.panel.$b().append( el );

                //bind unanswered item button
                el.find('.link a').click($.proxy(function(e) {
                    e.preventDefault();
                    this.model.open_tournament_practice();
                }, this));

            } else if( !unanswered_tournament ) {
                $(open_bt_el).remove();
            }
        },
        render_tournament_countdown: function() {
            if (window.is_mobile || (window.user.get('role') === 'teacher')) {
                // mobile has no control panel
                // there is nowhere to put the countdown
                return;
            }

            var next_scheduled_tournament = this.model.get('next_tournament_start');

            //remove any previous countdown timer update
            clearInterval( this.model.get('scheduled_countdown_timer') );

            //look for upcoming tournament countdown el
            var panel_toolbar_el = panels.get('tournament_control_panel').get('view').$('.thm_panel_toolbar');
            var next_scheduled_el = $('.tournament_schedule_status', panel_toolbar_el);

            if( !next_scheduled_tournament || next_scheduled_tournament < new Date().getTime()/1000 + 5) {
                //if no upcoming tournament && upcoming tournament countdown shown, remove it
                next_scheduled_el.remove();
                if (window.user.get('role') !== 'teacher') {
                    panel_toolbar_el.removeClass('toolbar_active');
                }
            } else {
                //if upcoming tournament, no countdown shown, add it
                if( !next_scheduled_el.length ) {
                    var html = '<div class="tournament_schedule_status">Next tournament starts:<br /><span class="score"></span></div>';
                    panel_toolbar_el.addClass('toolbar_active').append(html);
                }

                //add countdown timer for upcoming tournament
                var countdown_timer = setInterval($.proxy(function() {
                    this.render_tournament_countdown_timer(next_scheduled_tournament);
                }, this), 1000);
                this.model.set({'scheduled_countdown_timer': countdown_timer});
                this.render_tournament_countdown_timer(next_scheduled_tournament);
            }
        },
        render_tournament_countdown_timer: function(countdown_timestamp) {
            if( !countdown_timestamp || countdown_timestamp < new Date().getTime()/1000 - 5) {
                clearInterval(this.model.get('scheduled_countdown_timer'));
                var panel_toolbar_el = panels.get('tournament_control_panel').get('view').$('.thm_panel_toolbar');
                $('.tournament_schedule_status', panel_toolbar_el).remove();
                if(window.user.get('role') !== 'teacher') {
                    panel_toolbar_el.removeClass('toolbar_active');
                }
                return;
            } else {
                this.panel.$('.tournament_schedule_status .score').html( this.model.generate_countdown_string(countdown_timestamp) );
            }
        }
    });

    return TournamentControlView;
});
