/* global _ */
define([
    'views/ModuleItemContent',
    'views/discussion/discussion'
], function (ModuleItemContentView, DiscussionView) {
    'use strict';

    var DiscussionContentView = ModuleItemContentView.extend({
        initialize: function () {
            ModuleItemContentView.prototype.initialize.apply(this);
            this.topic_view = new DiscussionView({ model: this.model });
        },

        render: function () {
            if (this.panel === undefined) { return; }
            // Initialize panel to empty
            this.panel.$b().empty();
            this.panel.$b().append(this.topic_view.el);
            this.topic_view.render();
            this.listenTo(this.topic_view, 'remagnify', _.throttle(function () {
                var panel = this.panel;
                setTimeout(function () {
                    panel.trigger('redo_magnify');
                }, 0);
            }, 100));
        },
        remove: function () {
            this.topic_view.remove();
            ModuleItemContentView.prototype.remove.apply(this);
        }
    });

    return DiscussionContentView;
});
