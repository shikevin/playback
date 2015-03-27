/*global Backbone, window, $*/
define([
    'models/question/question'
], function (Question) {
    "use strict";
    var TournamentScoreboardView = Backbone.View.extend({
        /*
         * Renders the 'scoreboard' for a tournament question
         *               ____
         * /------------/     \-----------\
         * |           |       |           |
         * |  x  x o   |  0:30 |   o o x   |
         * |           |       |           |
         * \------------\_____/-----------/
         * You                     Charles111
         */
        initialize: function() {
            this.model.bind("change:countdown_time", this.render_countdown_timer, this);
            this.model.bind("change:countdown_message", this.render_countdown_message, this);
            this.model.bind("change:countdown_intense_background", this.render_countdown_message, this);

            this.model.bind("change:home", this.render_counters, this);
            this.model.bind("change:away", this.render_counters, this);

            this.listenTo(this.model, 'change:users', this.render_counters, this);

            this.model.bind("change:round", this.render_round_indicator, this);

            this.render();
        },
        render: function() {
            $(this.el).html("<div class='counter home'></div><div class='countdown'><span class='top'></span><b></b><span class='bottom'></span></div><div class='counter away'></div>");

            //counter
            this.render_home_counter();
            this.render_away_counter();

            //timer
            this.render_countdown_timer();
            this.render_countdown_message();
        },
        render_counters: function() {
            this.model.get('tournament').fetch().done(function() {
                this.render_home_counter();
                this.render_away_counter();
            }.bind(this));
        },
        render_home_counter: function() {
            var el = $(this.el).find(".counter.home");
            var data = this.model.get("home");
            var max_attempts = this.model.get("tournament").get("max_attempts");

            var user = this.model.get('tournament').get('users').detect(function(user) {
                return String(user.get('id')) === window.user.get('id');
            });
            var rank;
            if (user === undefined) {
                rank = 'unranked';
            } else {
                rank = user.get('rank') + this.render_ordinal(user.get('rank'));
            }

            this.render_counter(el, data.alias, rank, data.attempts, max_attempts, data.status_str);

            //We show the round indicator on the home side, so we must re-render it on each home redraw
            this.render_round_indicator();
        },
        render_away_counter: function() {
            var el = $(this.el).find(".counter.away");
            var data = this.model.get("away");
            var max_attempts = this.model.get("tournament").get("max_attempts");

            var user = this.model.get('tournament').get('users').detect(function(user) {
                return user.get('id') === data.user_id;
            });
            var rank;
            if (user === undefined) {
                rank = 'unranked';
            } else {
                rank = user.get('rank') + this.render_ordinal(user.get('rank'));
            }

            this.render_counter(el, data.alias, rank, data.attempts, max_attempts, data.status_str);
        },
        render_counter: function(el, alias, rank, attempts, max_attempts, status_str) {
            //render the html for the counter checks
            var attempts_html;
            if (status_str) {
                attempts_html = '<div class="attempt ' + status_str + '"><span class="inner">' + status_str + '</span></div>';
            } else {
                attempts_html = '';
                for (var index = 0; index < max_attempts; index++) {
                    var is_incorrect = ( index < attempts ) ? true : false;
                    attempts_html += "<div class='attempt " + (is_incorrect ? "failed": "") + "'><span class='inner'>X</span></div>";
                }
            }

            //render the counter structure
            $(el).html("<div class='attempts'></div><div class='name'></div><div class='rank'></div>");
            $(el).find(".attempts").html(attempts_html);
            $(el).find(".name").html(alias);
            $(el).find(".rank").html(rank);

            //add special class when there are more than three attempts
            if (max_attempts > 3) {
                $(el).find(".attempts").addClass("many_attempts");
            }
        },
        render_round_indicator: function() {
            var el = $(this.el).find(".counter.home");
            el.find(".round_counter").remove();

            var round = this.model.get("round");
            var num_rounds = this.model.get("num_rounds");
            var round_html = "<div class='round_counter'>Round " + round + " / " + num_rounds + "</div>";
            $(el).prepend(round_html);
        },
        render_countdown_timer: function() {
            var seconds_remaining = this.model.get("countdown_time");
            var time_str;
            if (!seconds_remaining) {
                time_str = "-:-";
            } else {
                var mins = Math.floor( seconds_remaining / 60 );
                var secs = seconds_remaining % 60;
                time_str = mins + ":" + (secs < 10 ? "0" + secs : secs);
            }

            $(this.el).find(".countdown b").html( time_str );
            if(seconds_remaining < 4 && seconds_remaining > 0 && this.model.countdown_intense_background) {
                $(this.el).find(".countdown").switchClass("", "warning",100).switchClass("warning","",200);
            }
        },
        render_countdown_message: function() {
            var message = this.model.get("countdown_message");
            var message_parts = message.split(" ");

            var part1 = message_parts.shift();
            var part2 = message_parts.join(" ");

            $(this.el).find("span.top").html( part1 );
            $(this.el).find("span.bottom").html( part2 );

            //add or remove an 'intense' class depending on if we should show an intense background or not
            if (this.model.get("countdown_intense_background")){
                $(this.el).find(".countdown").addClass("intense");
            } else {
                $(this.el).find(".countdown").removeClass("intense");
            }
        },
        render_ordinal: function (n) {
            var s = ['th', 'st', 'nd', 'rd'];
            var v = n % 100;
            return (s[(v - 20) % 10] || s[v] || s[0]);
        }
    });
    return TournamentScoreboardView;
});
