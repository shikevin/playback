define([
       'views/discussion/response_comment',
       'views/ListView'
], function (
    DiscussionResponseCommentView,
    ListView
) {
    'use strict';
    var DiscussionResponseCommentListView = ListView.extend({
        initialize: function () {
            this.view = DiscussionResponseCommentView;
            DiscussionResponseCommentListView.__super__.initialize.apply(this);
        }
    });

    return DiscussionResponseCommentListView;
});
