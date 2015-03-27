/* global Backbone, _, panels, Magnify */
define([
    'layouts/edumacation/LayoutCollection',
    'lobby/PresentationTool'
], function (
    layouts,
    PresentationTool
) {
    'use strict';
    var ModuleItemContentView = Backbone.View.extend({
        initialize: function() {
            this.listenTo(this.model, 'opened', this.opened, this);
            this.listenTo(this.model, 'closed', this.closed, this);
            this.listenTo(this.model, 'change:status', this.set_buttons, this);
            // this.listenTo(this.model, 'change:status', this.render, this);
        },
        _setup_presentation_tool_resizing: function (view) {
            var resize_pt_to_content = _.debounce(function () {
                var content_page = $('#content_page');
                var height = content_page.height();
                var scroll_height = content_page[0].scrollHeight;
                if (height < scroll_height) {
                    // Add 50 pixels to account for headers.
                    PresentationTool.resize_pt(650, scroll_height + 50);

                    // Detach the magnifyend event. We only want to
                    // resize the PT the first time we open the module
                    // item.
                    view.$el.off('magnifyend', resize_pt_to_content);
                }
            }, 200);
            view.$el.on('magnifyend', resize_pt_to_content);
        },
        opened: function(previously_activated) {
            if (this.panel === undefined) {
                this.panel = panels.add({
                    id: this.model.get('id'), /* .get here is important for panels
                                                to work with RelationalModels */
                    module: this.model.get('module'),
                    color: this.model.get('module_color'),
                    title: this.model.get('title'),
                    minimize: true,
                    layout: layouts.get('content'),
                    model: this.model,
                    previously_activated: previously_activated
                });
                this.model.set_panel_buttons(this.panel);
                this.panel.$b().append(this.$el);
                this.render();

                var view = this.panel.get('view');

                if (window.is_presentation_tool) {
                    this._setup_presentation_tool_resizing(view);
                }

                view.$('.thm_panel_body>div').addClass('module_item_content');
            }
        },
        closed: function() {
            // don't leave a trace

            this.remove();
            if (this.panel !== undefined) {
                this.panel.remove();
                this.panel = undefined;
            }
            this.model.unset('view');
        },
        set_buttons: function() {
            if (this.model.is_visible()) {
                this.model.set_buttons();
            }
        },
        remove: function () {
            // 2013 is when I learn to unbind things correctly
            // for every bind, there is an equal and opposite unbind
            this.model.off('opened', this.opened, this);
            this.model.off('closed', this.closed, this);
            this.model.off('change:status', this.set_buttons, this);
            Backbone.View.prototype.remove.call(this);
        }
    });
    return ModuleItemContentView;
});
