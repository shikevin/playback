define([
], function () {
    var DiscussionResponseComment = Backbone.Model.extend({
        urlRoot: '/api/v1/comment/',

        defaults: {
            body: "",
            author: "",
            created_at: "",
            sms_comment: false
        },

        url: function () {
            var url = this.urlRoot;
            if (typeof this.id !== 'undefined') {
                url = url + this.id + '/';
            }
            return url;
        },

        parse: function (comment) {
            if (!comment) { return null; }
            if (this.get('response') !== undefined) {
                comment.response = this.get('response');
            }
            return comment;
        },

        toJSON: function () {
            var json = _.omit(this.attributes, [
                'response'
            ]);
            json.response = this.attributes.response.get('resource_uri');
            return json;
        }
    });

    return DiscussionResponseComment;
});
