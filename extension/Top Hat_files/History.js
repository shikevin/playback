/* globals define, _, Backbone */

define([
    'views/tournament/HistoryResponse',
    'models/tournament/Response',
    'models/tournament/UserHistory'
], function (TournamentHistoryResponseView, TournamentResponse, TournamentUserHistory) {
    'use strict';
    var TournamentHistoryView = Backbone.View.extend({
        initialize: function() {
            this.current_user_id = undefined;

            this.model.get('users').bind('add', this.update_student_selector, this);

            if (window.user.get('role') === 'student') {
                this.get_historical_responses(window.user.get('id'));
            }
            this.render();
        },
        get_historical_responses: function (student_id) {
            var that = this;
            var user_history = new TournamentUserHistory();
            user_history.id = user_history.urlRoot + this.model.get('id') + '/';

            user_history.fetch({
                data: $.param({
                    user_id: student_id
                })
            }).done(function() {
                var responses = that.model.get('controller').get('responses');
                var user_responses = user_history.get('responses');
                responses.add(user_responses);
                that.render_history();
            });
        },
        render_student_selector: function() {
            //only teachers see student selector
            if (window.user.get('role') !== 'teacher') { return false; }

            var that = this;
            this.select_el = $(this.el).find('.user_selector').composer([
                {
                    'id': 'user',
                    'type': 'select',
                    'label': 'User',
                    'placeholder': '',
                    'change': function () {
                        if (that.current_user_id !== that.$('#user').val() ) {
                            that.current_user_id = that.$('#user').val();
                            // get the responses for the selected user
                            if (!that.current_user_id) {
                                that.get_historical_responses('all');
                            }
                            else {
                                that.get_historical_responses(that.current_user_id);
                            }

                        }
                    }
                }
            ]);
            this.update_student_selector();
        },
        update_student_selector: function() {
            //only teachers see student selector
            if (window.user.get('role') !== 'teacher') { return false; }

            // Populates the dropdown with users participating in the tournament
            var users = {};
            this.model.get('users').each(function(user) {
                users[user.get('id')] = user.get('alias');
            });

            //Initialize the current user as the first user in the list
            if (!this.current_user_id ) {
                this.current_user_id = _.first(_.keys(users)) || 'all';

                // now that we have set a current user, we must render the history for them
                this.get_historical_responses(this.current_user_id);
            }

            this.select_el.get('user').set({
                options: users,
                value: this.current_user_id
            });
        },
        render: function() {
            $(this.el).html('<div class="user_selector"></div><div class="match_history"></div>');
            this.render_student_selector();
            this.render_history();
        },
        render_history: function() {
            // Filter responses to just the selected user
            var current_user_id = (window.user.get('role') === 'teacher') ? this.current_user_id : window.user.get('id');
            var responses = this.model.get('controller').get('responses').get_user_responses( current_user_id );

            responses.sort(function(a,b) {
                return a.get('round_number') - b.get('round_number');
            });


            $(this.el).find('.match_history').html('<table class="tournament_history"><tr><th>Round</th><th>Outcome</th><th>Attempts</th><th>Score</th><th>Question</th></tr></table>');
            var table_el = $(this.el).find('.match_history table');

            if (responses.length === 0) {
                table_el.append( this.get_empty_history_message() );
            } else {
                _.each(responses, function (response) {
                    var view = new TournamentHistoryResponseView({ model: response });
                    table_el.append( view.el );
                });
            }
        },
        get_empty_history_message: function() {
            if ((window.user.get('role') === 'teacher') ) {
                return '<tr><td colspan="10">Selected user has not yet played any rounds.</td></tr>';
            } else {
                return '<tr><td colspan="10">You have not yet played any rounds.</td></tr>';
            }
        }
    });
    return TournamentHistoryView;
});
