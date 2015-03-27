/*globals Houdini */
define([
       'collections/Paginated',
       'models/discussion/response_comment'
], function (PaginatedCollection, DiscussionResponseComment) {
    'use strict';

    var Backbone = window.Backbone;

    var DiscussionResponseCommentCollection = PaginatedCollection.extend({
        urlRoot: '/api/v1/comment/',
        model: DiscussionResponseComment,

        initialize: function (models, options) {
            this.response = options.response;
            this.filter_options = { 'response': options.response.get('id') };
            this.limit = 0;
            DiscussionResponseCommentCollection.__super__.initialize.call(this, models, options);

            this.listenTo(Houdini, 'discussion:response:comment:added', function (comment_added_event) {
                if (parseInt(this.response.get('id'), 10) !== comment_added_event.response) {
                    return;
                }
                var existing = this.get(comment_added_event.comment.toString());
                if (existing) {
                    return;
                }
                var new_comment = new DiscussionResponseComment({
                    id: comment_added_event.comment.toString(),
                    response: this.response
                });
                new_comment.fetch({
                    success: function (model, response) {
                        this.add(new_comment);
                    }.bind(this)
                });
            });

            // Clean up the houdini comment listener
            this.listenTo(this.response, 'destroy', function() {
                this.stopListening();
            });
        },

        parse: function (response) {
            _.each(response.objects, function (model) {
                model.response = this.response;
            }.bind(this));
            response.objects = this.models.concat(response.objects);
            return DiscussionResponseCommentCollection.__super__.parse.call(this, response);
        },

        fetch: function (options) {
            if (typeof options === 'undefined') { options = {}; }
            options = _.extend(options, {update: true});
            return Backbone.Collection.prototype.fetch.call(this, options);
        },

        comparator: function (comment1, comment2) {
            if (Number(comment1.get('id')) > Number(comment2.get('id'))) {
                return -1;
            } else {
                return 1;
            }
        }
    });

    return DiscussionResponseCommentCollection;
});
