/*globals define, Backbone*/
define(['text!templates/no_results.html'], function (no_results_html) {
    'use strict';
    var NoResultsView = Backbone.View.extend({
        tagName: 'td',
        render: function () {
            this.$el.html(no_results_html);
            this.$el.attr('colspan', '999');
        }
    });
    return NoResultsView;
});