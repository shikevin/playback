/* Slightly modified version of paginated_collection.js.
 * Courtesy of takinbo on GitHub: https://gist.github.com/takinbo/1105343
 */
define([
], function () {
    "use strict";

    var Backbone = window.Backbone;

    var PaginatedCollection = Backbone.Collection.extend({
        initialize: function (models, options) {
            _.bindAll(this, 'parse', 'url', 'page_info', 'next_page', 'previous_page', 'filtrate', 'sort_by');
            // Defaults
            typeof(options) != 'undefined' || (options = {});
            typeof(this.limit) != 'undefined' || (this.limit = 20);
            typeof(this.offset) != 'undefined' || (this.offset = 0);
            typeof(this.filter_options) != 'undefined' || (this.filter_options = {});
            typeof(this.sort_field) != 'undefined' || (this.sort_field = '');

        },

        fetch: function (options) {
            return Backbone.Collection.prototype.fetch.call(this, options);
        },

        parse: function (resp) {
            this.offset = resp.meta.offset;
            this.limit = resp.meta.limit;
            this.total = resp.meta.total_count;
            return resp.objects;
        },

        url: function () {
            var url_params = _.extend({offset: this.offset, limit: this.limit}, this.filter_options);
            if (this.sort_field) {
                url_params = _.extend(url_params, {sort_by: this.sort_field});
            }
            // TODO: There's got to be a better way
            return this.urlRoot + '?' + $.param(url_params);
        },

        page_info: function () {
            var info = {
                total: this.total,
                offset: this.offset,
                limit: this.limit,
                pages: Math.ceil(this.total / this.limit),
                prev: false,
                next: false
            },
                max = Math.min(this.total, this.offset + this.limit);

            if (this.total === this.pages * this.limit) {
                max = this.total;
            }

            info.range = [(this.offset + 1), max];

            if (this.offset > 0) {
                info.prev = (this.offset - this.limit);
            }

            if (this.offset + this.limit < info.total) {
                info.next = this.offset + this.limit;
            }

            return info;
        },

        next_page: function (options) {
            if (!this.page_info().next) {
                return false;
            }
            this.offset = this.offset + this.limit;
            return this.fetch(options);
        },

        previous_page: function () {
            if (!this.page_info().prev) {
                return false;
            }
            this.offset = (this.offset - this.limit) || 0;
            return this.fetch();
        },

        filtrate: function (options) {
            this.filter_options = options || {};
            this.offset = 0;
            return this.fetch();
        },

        sort_by: function (field) {
            this.sort_field = field;
            this.offset = 0;
            return this.fetch();
        }
    });

    return PaginatedCollection;
});
