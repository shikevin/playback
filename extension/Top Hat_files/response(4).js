/* globals define, Backbone */

define([
], function () {
    'use strict';

    var FeedbackResponse = Backbone.Model.extend({
        urlRoot: '/api/v2/feedback_response/',
        url: function () {
            var url = this.urlRoot;
            if (typeof this.id !== 'undefined') {
                url = url + this.id + '/';
            }
            return url;
        }
    });

    return FeedbackResponse;
});
