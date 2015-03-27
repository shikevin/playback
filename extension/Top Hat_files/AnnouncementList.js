/* global _, Backbone */
define([
    'moment',
    'views/inst_admin/AnnouncementListNoItems',
    'text!templates/inst_admin/announcement_row.html'
], function (
    moment,
    AnnouncementListNoItemsView,
    row_html
) {
    'use strict';

    var AnnouncementView = Backbone.Marionette.ItemView.extend({

        tagName: 'div',
        className: 'list-group-item  list-group-item-default',
        template: _.template(row_html),
        events: {},

        initialize: function() {},

        render: function () {
            var to = this.model.get('organization_name') || this.model.get('course_name');
            this.$el.html(this.template({
                start_datetime: this.model.get('start_datetime'),  // UTC.
                fromnow_datetime: moment.utc(this.model.get('start_datetime')).fromNow(),  // Local time from now.
                content: this.model.get('content'),
                to: to,
                owner_full_name: this.model.get('owner_full_name')
            }));
        }
    });

    var AnnouncementListView = Backbone.Marionette.CollectionView.extend({
        itemView: AnnouncementView,
        emptyView: AnnouncementListNoItemsView,
        className: 'list-group',

        initialize: function() {
            // Render view when collection changes.
            this.listenTo(this.collection, 'reset', this.render, this);
        }
    });

    return AnnouncementListView;
});