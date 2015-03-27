/*globals define, _ */
/* Note: copied from tree.dev.js, needs refactoring */
define([
    'tree/views/Folder', 'tree/views/TreeModuleItem'
], function (FolderView, TreeModuleItemView) {
    'use strict';
    var ModuleItemFolderView = FolderView.extend({
        initialize: function() {
            FolderView.prototype.initialize.call(this);
            this.model.bind('change:status', this.update_action, this);
            this.model.bind('change:saving_status', this.update_action, this);
            this.listenTo(this.model, 'change:status', this.set_status_class, this);
        },
        render: function() {
            FolderView.prototype.render.apply(this);
            this.set_status_class();
        },
        set_status_class: function () {
            // why dont we have this defined somewhere?
            // TODO make constants and replace these everywhere
            var statuses = ['inactive', 'active', 'active_visible', 'visible', 'review', 'mixed'];
            _.each(statuses, function (status) {
                this.$el.removeClass(status);
            }.bind(this));
            this.$el.addClass(this.model.get('status'));
        }
    });
    window.tree_constructors.views.module_item_folder = ModuleItemFolderView;
    return ModuleItemFolderView;
});
