define([
], function () {
    var AnswerItem = Backbone.Model.extend({
        idAttribute: 'resource_uri',
        urlRoot: '/api/v1/answer/',
        defaults: {
            response: ''
        }
    });

    return AnswerItem;
});
