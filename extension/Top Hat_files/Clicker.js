/* global QtToolController */
define([
], function (
) {
    'use strict';
    var Clicker = {
        question_id: null,
        question_type: null,
        is_connected: false,
        is_dom_ready: false,
        votes: [],
        poll_id: null,

        vote: function (clicker_id, answer) {
            this.votes.push({
                clicker_id: clicker_id,
                answer: answer
            });
        },
        pollAction: function () {
            var current_votes = this.votes.slice();
            this.votes = [];
            if (current_votes.length > 0) {
                // Make API request to clicker response resource
                $.ajax('/api/v2/clicker_response/', {
                    type: 'POST',
                    data: JSON.stringify({
                        item_id: this.question_id,
                        type: this.question_type,
                        responses: current_votes
                    }),
                    contentType: 'application/json'
                }).done(function () {
                }).fail(function (xhr) {
                    if (xhr.status !== 401) {
                        this.votes = current_votes.concat(this.votes);
                    }
                });
            }
        },
        start_clicker_voting: function (question_id, question_type) {
            if (typeof QtToolController !== 'undefined' && QtToolController.startVoting) {
                return QtToolController.startVoting(question_id, question_type);
            } else {
                return false;
            }
        },
        stop_clicker_voting: function () {
            if (typeof QtToolController !== 'undefined' && QtToolController.stopVoting) {
                return QtToolController.stopVoting();
            } else {
                return false;
            }
        },
        startPolling: function (question_id, question_type) {
            this.question_id = question_id;
            this.question_type = question_type;
            if (this.is_connected) {
                this.start_clicker_voting(question_id, question_type);
                this.poll_id = setInterval(this.pollAction, 1000);
            }
        },
        stopPolling: function () {
            // Submit any final votes
            if (this.votes.length > 0) {
                this.pollAction();
            }
            // Stop voting
            this.question_id = null;
            this.question_type = null;
            this.stop_clicker_voting();
            clearInterval(this.poll_id);
            this.poll_id = null;
        },
        showConnectionStatus: function () {
            $('.clicker_connected').parent().show();
            this.is_connected = true;
            // If we connect AFTER a question has been selected, we'll "re-select" it
            // to automatically enable voting.
            if (this.question_id && this.question_type) {
                this.startPolling(this.question_id, this.question_type);
            }
        },
        hideConnectionStatus: function () {
            // Stop polling if we disconnect
            if (this.poll_id) {
                this.stopPolling();
            }
            $('.clicker_connected').parent().hide();
            this.is_connected = false;
        },
        setDomReadyStatus: function () {
            this.is_dom_ready = true;
            if (typeof QtToolController !== 'undefined' && QtToolController.setDomReady) {
                return QtToolController.setDomReady();
            }
        }
    };

    return Clicker;
});
