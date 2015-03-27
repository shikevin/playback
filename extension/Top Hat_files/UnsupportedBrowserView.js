/* global _, Backbone */
define([
    'text!templates/publisher/unsupported_browser.html'
], function (html) {
    'use strict';
    var UnsupportedBrowserView = Backbone.View.extend({
        className: 'unsupported_browser',
        template: '',
        initialize: function (options) {
            this.options = options || {};
        },
        render: function () {
            this.$el.html($('#loading_template').html());
            var failed = this.options.failed.join(', ');
            this.$el.html(_.template(html, {failed: failed}));
            this.options.panel.set({
                footer_buttons: {
                    'Details': {
                        bt_class: 'amber',
                        callback: this.show_details.bind(this)
                    },
                    'I\'ll risk it': {
                        bt_class: 'affirmative',
                        callback: 'remove'
                    }
                }
            });
        },
        show_details: function () {
            this.$('.browser-fail-details').show();
            this.options.panel.set({
                footer_buttons: {
                    'I\'ll risk it': {
                        bt_class: 'affirmative',
                        callback: 'remove'
                    }
                }
            });
        }
    });
    return UnsupportedBrowserView;
});