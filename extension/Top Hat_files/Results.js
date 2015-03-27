/*global window, define, Backbone, $, _ */
define([], function () {
    "use strict";
    var TournamentResultsView = Backbone.View.extend({
        /*
         * Shows rankings, how the Tournament went for all participants.
         * Shown to students after Tournament ends, and to profs all the way through.
         *
         */
        className: "tournament_list tournament_results",
        tagName: "li",
        preview_el: $("<span/>"),
        initialize: function() {
            this.model.get("users").bind("add", this.render, this);
            this.model.get("users").bind("change:score", this.render, this);
            this.model.fetch().done(function() {
                this.render();
            }.bind(this));
        },
        render: function() {
            var rankings;
            this.model.get('users').sort();
            if (window.user.get('role') === 'teacher') {
                rankings = this.model.get("users").first(10);
            } else {
                rankings = this.model.get("users").first(5);
            }

            //render rankings
            var html = '';
            if (this.model.get('research_mode') && !this.model.get('survey_complete')) {
                if (this.model.get('status') === 'active_visible') {
                    // tournament is in progress
                    $(this.el).html('For research purposes, rankings will not be shown until after the tournament is complete.');
                } else {
                    // tournament is complete?
                    if (this.model.get('survey_url').indexOf('?') === -1) {
                        // start the survey URL query string
                        $(this.el).html('The tournament is complete. To see your rank, please complete <a target="_new" href="' + this.model.get('survey_url') + '?entry_0=' + window.user.get('alias') + '&entry_10=' + window.user.get('id') + '">this survey.</a>');
                    } else {
                        $(this.el).html('The tournament is complete. To see your rank, please complete <a target="_new" href="' + this.model.get('survey_url') + '&entry_0=' + window.user.get('alias') + '&entry_10=' + window.user.get('id') + '">this survey.</a>');
                    }
                    $(this.el).find('a').bind('click', function() {
                        setTimeout(function() {
                            this.model.set({
                                survey_complete: true
                            });
                            this.render();
                        }.bind(this), 1000);
                    }.bind(this));
                }
                return;
            }

            if (!rankings.length) {
                html = '<div class="result ">This tournament has not yet been played.</div>';
            }

            _.each(rankings, function (ranking) {
                var current_user = ranking.get('id') == window.user.get('id');
                html += this.render_ranking(ranking.get("alias"), ranking.get("score"), ranking.get('rank'), ranking.get('wins'), current_user);
            }, this);

            var row_index = rankings.length;

            //include the current user, even if they are not in top 5
            var user = this.model.get("users").detect(function(user) { return user.get("id") == window.user.get('id'); });
            if( user && !_.include(rankings, user) ) {
                var index = this.model.get("users").indexOf( user );
                var rankings = this.model.get("users").models;

                //render a 'gap' between the user's ranking and the previous ranking
                //if the gap is greater than 1
                if( index > row_index ) {
                    html += this.render_gap();
                }
                html += this.render_ranking( rankings[index].get("alias"), rankings[index].get("score"), rankings[index].get('rank'), rankings[index].get('wins'), true )
                row_index = index;

                //render the preview el
                $(this.preview_el).html( "Your Rank: <span>" + (parseInt(index) + 1) + "<span>" );
            }



            // //render the last ranking
            // var user = this.model.get("users").last()
            // if( user && !_.include(rankings, user) ) {
            //     var index = this.model.get("users").indexOf( user );

            //     //render a 'gap' between the user's ranking and the previous ranking
            //     //if the gap is greater than 1

            //     if( index > (row_index + 1) ) {
            //         html += this.render_gap();
            //     }

            //     html += this.render_ranking( "???", user.get("score"), index );
            // }

            html += "<div id='log_container' />";

            $(this.el).html( html );
        },
        render_gap: function() {
            return "<li class='gap'></li>";
        },
        render_ranking: function( alias, points, rank, wins, current_user ) {
            //since users are sorted by score, we can use the index as a base-0 rank
            var template = _.template("<li class='<% if( current_user ) { %>selected<% } %>'><span class='icon rank_<%= rank %>'><%= rank %></span>" +
                "<span class='details'><b><%= alias %></b></span>" +
                "<span class='side'><b><%= wins %></b> wins / <b><%= points %></b> points</span></div>");

            return template({
                "rank": rank,
                "alias": alias,
                "current_user": current_user,
                "points": points,
                "wins": wins
            });
        }
    });
    return TournamentResultsView;
});
