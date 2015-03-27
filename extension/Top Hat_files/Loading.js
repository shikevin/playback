/*globals define, Backbone, _*/
define(['text!templates/loading.html'], function (loading_html) {
    'use strict';
    var LoadingView = Backbone.View.extend({
        template: _.template(loading_html),
        render: function () {
            this.$el.html(this.template());
        }
    });
    return LoadingView;
});