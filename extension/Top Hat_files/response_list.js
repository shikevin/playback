/* global _ */
define([
    'views/discussion/response',
    'views/ListView'
], function (
    DiscussionResponseView,
    ListView
) {
    'use strict';
    var DiscussionResponseListView = ListView.extend({
        defaults: {
            prepend: true
        },
        initialize: function (options) {
            this.options = _.defaults(options || {}, this.defaults);
            ListView.prototype.initialize.call(this, options);
            this.view = DiscussionResponseView;

            this.collection.on('add', this.trigger_notify, this);
        },

        trigger_notify: function () {
            this.trigger('new_response');
        }
    });

    return DiscussionResponseListView;
});
