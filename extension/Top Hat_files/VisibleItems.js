/* global Backbone, _ */
define([
], function (
) {
    'use strict';
    var VisibleItems = Backbone.Model.extend({
        urlRoot: '/api/v2/visible_items/',
        polling_interval: window.site_data.settings.VISIBLE_ITEMS_POLLING_INTERVAL,
        initialize: function () {
            this.interval = setInterval(this.poll.bind(this), this.polling_interval);
        },
        url: function () {
            return this.urlRoot + this.id + '/';
        },
        poll: function () {
            if (this.get('id')) {
                if (this.old_poll) {
                    // failed to resolve the request in a timely manner
                    // hold off for 1 period
                    this.old_poll.abort();
                    window.Daedalus.track('poll_aborted');
                    return;
                }
                this.old_poll = this.fetch();
                this.old_poll
                    .then(this.ensure_visible.bind(this))
                    .always(function () {
                        delete this.old_poll;
                    }.bind(this));
            }
        },
        parse: function (data) {
            return {
                item_ids: _.map(data, String)
            };
        },
        ensure_visible: function () {
            _.each(this.get('item_ids'), function (item_id) {
                var item = require('Modules').get_module_item(item_id);
                var data = {item_id: item_id};
                if (!item) {
                    window.Daedalus.track('visible_item_doesnt_exist', data);
                    // the module might not be active. Fetch the course data
                    window.course.get('course_data').fetch();
                    return;
                }
                if (!item.is_visible()) {
                    window.Daedalus.track('visible_item_not_visible', data)
                    // the tree might be out of date. Fetch the item data
                    // a fetch will trigger a render if it becomes visible post-fetch
                    item.fetch().done(function () {
                        if (item.is_visible()) {
                            // success - the polling fallback caught a failed activation and recovered
                            window.Daedalus.track('visible_item_recovered_by_polling', data);
                        } else {
                            // the polling fallback is falsely reporting that an item should be visible
                            window.Daedalus.track('polling_false_positive', data);
                        }
                    });
                    return;
                }
                var panel = window.panels.get(item_id);
                var view = item.get('view');
                if (!panel || !view) {
                    window.Daedalus.track('visible_item_not_rendered', data);
                    // everyone things that the item should be visible
                    // but the view for the item is not currently on the screen
                    // clean any existing view and rebuild it
                    item.trigger('closed');
                    item.trigger('opened');

                }
                return;
            });
        }
    });
    return VisibleItems;
});
