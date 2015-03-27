/*global define, Backbone, _ */
define([
    'text!templates/inst_admin/announcement_list_no_items.html'
], function (html) {
    'use strict';

    var AnnouncementListNoItemsView = Backbone.View.extend({
        template: _.template(html),
        render: function () {
            this.$el.html(this.template());
        }
    });

    return AnnouncementListNoItemsView;
});