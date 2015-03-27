/*globals define, Backbone, _ */
define([
    'collections/discussion/response_comment',
    'models/discussion/response_comment'
], function (DiscussionResponseCommentCollection, DiscussionResponseComment) {
    'use strict';

    // Represent discussion topic module item responses
    var DiscussionResponse = Backbone.Model.extend({
        urlRoot: '/api/v1/response/',
        idAttribute: 'resource_uri',
        defaults: {
            response: '',
            owner: '',
            created_at: '',
            upvote_count: 1,
            voted: true,
            flagged: false,
            key_string: null,
            comment_count: 0,

            // One-off attributes not included in serialization & deserialization of model
            grading_enabled: false,
            canvas_data: null,

            // TODO: Remove these, they are just here to make rendering work
            grade: 0,
            hide_usernames: false,
            date_created: '',
            submission_type: ''
        },

        parse: function (response) {
            if (!response) { return null; }
            if (this.get('discussion') !== undefined) {
                var discussion = this.get('discussion');
                response.discussion = discussion;
                response.voted = _.contains(discussion.get('voted'), Number(this.id));
                response.flagged = _.contains(discussion.get('flagged'), Number(this.id));
            }
            return response;
        },

        upvote: function () {
            return $.ajax({
                type: 'put',
                url: '/api/v1/votes/' + this.get('discussion').get_id() + '/',
                data: JSON.stringify({voted: [this.get('id')]}),
                contentType: 'application/json'
            }).done(function () {
                // voted is the response ids we have already voted for
                var voted = this.get('discussion').get('voted');
                if (voted.indexOf(parseInt(this.get('id'), 10)) !== -1) {
                    // Dont upvote something we have already upvoted
                    return;
                }
                voted.push(Number(this.get('id')));
                this.get('discussion').set({
                    voted: _.uniq(voted)
                });
                this.set({
                    upvote_count: this.get('upvote_count') + 1,
                    voted: true
                });
            }.bind(this));
        },

        flag: function () {
            return $.ajax({
                type: 'put',
                url: '/api/v1/votes/' + this.get('discussion').get_id() + '/',
                data: JSON.stringify({flagged: [this.get('id')]}),
                contentType: 'application/json'
            }).done(function () {
                var flagged = this.get('discussion').get('flagged');
                flagged.push(Number(this.get('id')));
                this.get('discussion').set({
                    flagged: _.uniq(flagged)
                });
                this.set({flagged: true});
            }.bind(this));
        },

        toJSON: function () {
            var json = _.omit(this.attributes, [
                'grading_enabled',
                'comments',
                'discussion',
                'id'
            ]);
            json.discussion = this.attributes.discussion.id;
            return json;
        },

        initialize: function (){
            this.set({ comments: new DiscussionResponseCommentCollection([], { response: this })});
        }
    });

    return DiscussionResponse;
});
