/*globals define, _, Daedalus, Houdini, Backbone*/
define([
   'models/discussion/response',
   'collections/Paginated'
], function (DiscussionResponse, PaginatedCollection) {
    'use strict';

    var DiscussionResponseCollection = PaginatedCollection.extend({
        urlRoot: '/api/v1/response/',
        model: DiscussionResponse,

        initialize: function (models, options) {
            this.discussion = options.discussion;
            this.filter_options = { 'discussion': this.discussion.get('id') };
            PaginatedCollection.prototype.initialize.call(this, models, options);

            var is_my_event = function (discussion_event) {
                return (
                    parseInt(this.discussion.id.split('/')[4],10) ===
                    parseInt(discussion_event.discussion, 10)
                );
            }.bind(this);

            this.listenTo(Houdini, 'discussion:response:added', function (response_event) {
                if (_.isUndefined(this.discussion.get('view'))) {
                    return;
                }
                if (!is_my_event(response_event)) {
                    return;
                }
                this.fetch_response(response_event.uri, function() {
                    Daedalus.track('discussion_response_added');
                });
            }.bind(this));

            this.listenTo(Houdini, 'discussion:response:updated', function (response_event) {
                if (_.isUndefined(this.discussion.get('view'))) {
                    return;
                }
                if (!is_my_event(response_event)) {
                    return;
                }
                this.fetch_response(response_event.uri, function() {
                    Daedalus.track('discussion_response_updated');
                });
            }.bind(this));

            this.listenTo(Houdini, 'discussion:response:deleted', function (response_deleted_event) {
                if (_.isUndefined(this.discussion.get('view'))) {
                    return;
                }
                if (!is_my_event(response_deleted_event)) {
                    return;
                }
                var existing_response = this.get(response_deleted_event.uri);
                if (existing_response) {
                    existing_response.trigger('destroy');
                }
            }.bind(this));
        },

        parse: function (response) {
            _.each(response.objects, function (model) {
                model.discussion = this.discussion;
                var id = Number(model.id);
                model.voted = _.contains(this.discussion.get('voted'), id);
                model.flagged = _.contains(this.discussion.get('flagged'), id);
            }.bind(this));
            var new_objects = [];
            _.each(response.objects, function (object) {
                var existing = this.get(object.id);
                if (existing) {
                    existing.set(object);
                } else {
                    new_objects.push(object);
                }
            }, this);
            response.objects = this.models.concat(new_objects);
            return DiscussionResponseCollection.__super__.parse.call(this, response);
        },

        fetch: function (options) {
            if (typeof options === 'undefined') { options = {}; }
            options = _.extend(options, {update: true});
            return Backbone.Collection.prototype.fetch.call(this, options);
        },

        fetch_response: function (uri, success_callback) {
            var response = new DiscussionResponse({
                resource_uri: uri,
                discussion: this.discussion
            });
            response.fetch({
                success: function (response) {
                    this.add(response, {merge: true});
                    if (this.discussion.get('is_magnified')) { // FIXME view logic has no place in the model
                        _.defer(function () {
                            this.discussion.get('view').panel.trigger('redo_magnify');
                        }.bind(this));
                    }
                    if (success_callback) {
                        success_callback();
                    }
                }.bind(this),
                error: function (response, http_response) {
                    if (http_response.status === 404) { // did we miss a discussion:response:deleted event?
                        response.trigger('destroy');
                    }
                }.bind(this)
            });
        }
    });

    return DiscussionResponseCollection;
});
