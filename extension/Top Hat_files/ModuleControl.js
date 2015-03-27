/* global Backbone, panels */
define([
    'tree/views/Tree',
    'layouts/edumacation/LayoutCollection',
    'util/Browser',
    'tree/views/TreeModuleItem',
    'tree/views/ModuleItemFolder',
    'dragCheckbox'
], function (
    TreeView,
    layouts,
    Browser
) {
    'use strict';
    var ModuleControlView = Backbone.View.extend({
        initialize: function() {
            // Create Control panel TreeView
            this.tree = this.model.get('tree');
            this.tree.set({ sortable: (window.user.get('role') === 'teacher') ? true : false });

            this.tree_view = new TreeView({
                model: this.tree,
                empty_message: 'No items here...',
                resizable: true
            });

            if (!layouts.get('control')) {
                return;
            }
            // Initialize control panel
            this.panel = panels.add({
                id: this.model.get('id') + '_control_panel',
                module: this.model.get('id'),
                layout: layouts.get('control'),
                title: this.model.get('name'),
                body: '<div class="control_panel_tree"></div>',
                toolbar: (function() {
                    return (window.user.get('role') !== 'teacher') ? {} : {
                        'add_button':'add_item',
                        'delete_button':'delete_items',
                        'folder_button':'panel_add_folder'
                    };
                })(),
                color: this.model.get('color'),
                priority: this.model.get('order'),
                minimize: true
            });

            // Render this view into the control panel
            this.render();
        },
        render: function() {
            if (Browser.is_web() || Browser.is_presentation_tool()) {
                // Render TreeView
                this.tree_view.render();
            }
            $(this.el).html(this.tree_view.el);

            // Render into panel body
            var el = this.panel.$('.control_panel_tree');
            el.html(this.el);

            return this;
        }
    });
    return ModuleControlView;
});
