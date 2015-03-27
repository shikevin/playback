define([], function () {
    var TournamentSummaryView = Backbone.View.extend({
        /*
         * Shown after a round, breaks down scoring to explain to students
         * who won the round, and how many points are awarded.
         *
         */
        template: "<div class='points <%= status %>'>" +
        "<div class='point status'><%= status %></div>" +
        "<div class='point correct'><span class='value'><%= points_correct %></span><span class='legend'>Correct</span></div>" +
        "<div class='point first'><span class='value'><%= points_first %></span><span class='legend'>First Correct</span></div>" +
        "<div class='point incorrect'><span class='value'><%= Math.abs(points_incorrect ? points_incorrect : 0) %></span><span class='legend'><%= num_incorrect ? points_incorrect : 0 %> Incorrect</span></div>" +
        "<div class='point total <% if( points_total < 0 ) { %>incorrect<% } %>'><span class='value'><%= Math.abs(points_total ? points_total : 0) %></span><span class='legend'><%= alias %></span></div>" +
        "</div>",
        className: "round_summary",
        preview_el: $("<span/>"),
        initialize: function() {
            var response = this.model.get("controller").get("current_response");
            if( !response ) {
                $(this.el).html("<p>Waiting for new round...</p>");
                return false;
            }

            this.render();

            //rerender on changes to user response
            response.bind("change", this.render, this);

            //rerender on changes to opponent response
            if( response.get("opponent") ) {
                response.get("opponent").bind("change", this.render, this);
            }
        },
        render: function() {
            var response = this.model.get("controller").get("current_response");
            var response_data = this.calculate_response( response );
            var opponent_data = response.get("opponent") ? this.calculate_response( response.get("opponent") ) : false;

            this.generate_status( response_data, opponent_data );

            //render preview element
            $(this.preview_el).html( response_data.status );

            //render user and opponent summary
            var user_html = _.template(this.template, response_data);
            if( opponent_data ) {
                user_html += _.template(this.template, opponent_data);
            }

            $(this.el).html( user_html ).toggleClass("multi", opponent_data ? true : false);
        },
        generate_status: function( user, opponent ) {
            if( !opponent && user.correct ) {
                user.status = "won";
            } else if( !opponent && !user.correct ) {
                user.status = "lost";
            } else if( user.first ) {
                user.status = "won";
                opponent.status = "lost";
            } else if( opponent.first ) {
                user.status = "lost";
                opponent.status = "won";
            } else {
                user.status = "tied";
                opponent.status = "tied";
            }
        },
        calculate_response: function( response ) {
            var opponent = response.get("opponent");
            var first = response.get("correct") && opponent && (!opponent.get("correct") || (opponent.get("time") > response.get("time")));
            var num_incorrect = response.get("attempts") - (response.get("correct") ? 1 : 0);

            var points_correct = response.get("correct") ? (this.model.get("correct_answer_score") || 0) : 0;
            var points_first = first ? (this.model.get("first_answer_score") || 0) : 0;
            var points_incorrect = num_incorrect * (this.model.get("incorrect_answer_penalty") || 0);
            var points_total = points_correct + points_first - points_incorrect;

            return {
                "alias": response.get("alias"),
                "first": first,
                "correct": response.get("correct"),
                "points_correct": Math.round( points_correct * 10 ) / 10,
                "points_first": Math.round( points_first * 10 ) / 10,
                "points_incorrect": Math.round( points_incorrect * 10 ) / 10,
                "num_incorrect": num_incorrect,
                "points_total": Math.round( points_total * 10 ) / 10
            }
        }
    });
    return TournamentSummaryView;
});