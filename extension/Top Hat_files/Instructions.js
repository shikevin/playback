define([
], function (
) {
    var TournamentInstructionsView = Backbone.View.extend({
        /*
         * Shows instructions to students before Tournament begins.
         * Instructions include how to get points, how many attempts, etc.
         *
         */
        className: 'tournament_instructions',
        template: '<div class="header"><h1>Get ready!</h1><h2>Tournament <b><%= title %></b> begins in <span class="tournament_time">-:-</span></h1></div>' +
            '<ol>' +
            '<li>Each round, you and a fellow student will be matched and asked a question</li>' +
            '<li>You\'ll have <b><%= max_attempts %></b> tries to get it right</li>' +
            '<% if( correct_answer_score ) { %><li>If you answer a question correctly, you will be awarded <b><%= correct_answer_score %></b> points</li><% } %>' +
            '<% if( first_answer_score ) { %><li>Whoever answers the question correctly first will be awarded <b><%= first_answer_score %></b> points</li><% } %>' +
            '<% if( incorrect_answer_penalty ) { %><li>Incorrect attempts will be penalized <b><%= incorrect_answer_penalty %></b> points</li><% } %>' +
            '<li>The student with the highest score in the class at the end wins the tournament!</li>' +
            '</ol>',
        initialize: function() {
            this.render();
            this.update_time = setInterval(function() {
                this.render_time();
            }.bind(this), 1000);
        },
        render: function() {
            var html = _.template(this.template, this.model.toJSON());
            $(this.el).html(html);
            this.render_time();
        },
        render_time: function() {
            this.time = require('Modules').get_module('tournament').generate_countdown_string(this.model.get('next_tournament_start'));
            $(this.el).find('span.tournament_time').html(this.time);
        }
    });
    return TournamentInstructionsView;
});
