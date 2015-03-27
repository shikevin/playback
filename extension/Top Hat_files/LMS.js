/* global define, Backbone */
define([
    'views/lms/Canvas',
    'views/lms/Pearson',
    'views/lms/D2L'
], function (CanvasView, PearsonView, D2L) {
    'use strict';
    var LMSView = Backbone.View.extend({
        lms_views: {
            'canvas': CanvasView,
            'pearson': PearsonView,
            'd2l': D2L
        },
        initialize: function (options) {
            this.options = options || {};
            if (!this.options.lms) {
                throw 'no lms in response';
            }

            if (!this.lms_views[this.options.lms]) {
                throw 'cant render that lms';
            }
            this.viewClass = this.lms_views[this.options.lms];
        },
        render: function () {
            if (!this.view) {
                this.view = new this.viewClass(this.options);
                this.view.render();
            } else {
                this.view.detach();
            }
            this.$el.html(this.view.$el);
        }
    });
    return LMSView;
});
