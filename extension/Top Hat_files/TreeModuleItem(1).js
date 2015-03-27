/*globals define, _*/
/* Note: copied from tree.dev.js, needs refactoring */
define([
    'tree/views/TreeItem',
    'tree/views/TreeActionItem'
], function (TreeItemView, TreeActionItemView) {
    'use strict';
    var TreeModuleItemView = TreeActionItemView.extend({
        className: 'tree_row module_item no_tree_children app-styles',

        initialize: function() {
            TreeItemView.prototype.initialize.call(this);
            this.model.bind('change:status', this.render_action, this);
            this.model.bind('change:saving_status', this.render_action, this);
            this.model.bind('change:scheduled', this.render_scheduled, this);
            this.model.bind('change:schedules', this.render_scheduled, this);
            if (!_.isUndefined(this.model.get('module_item'))) {
                this.model.get('module_item').bind('change:schedules', this.render_scheduled, this);
                this.model.get('module_item').bind('change:next_tournament_start', this.render_scheduled, this);
            }
            this.model.bind('change:status_group', this.render_status_group, this);
            this.model.bind('change:answered', this.render_answered, this);
            this.listenTo(this.model, 'change:status', this.set_status_class, this);
            this.listenTo(this.model, 'change:module_item', this.render, this);
        },
        render: function() {
            TreeActionItemView.prototype.render.call(this);
            this.render_status_group();
            this.render_scheduled();
            this.render_answered();
            this.set_status_class();
        },
        render_answered: function() {
            var el = $(this.el).find('div span.answered');

            if( !this.model.get('answered') ) {
                $(el).remove();
            } else if( !el.length ) {
                el = $('<span class="answered"></span');
                $(this.el).find('div').append( el );
            }
        },
        set_status_class: function () {
            // why dont we have this defined somewhere?
            // TODO make constants and replace these everywhere
            var statuses = ['inactive', 'active', 'active_visible', 'visible', 'review'];
            _.each(statuses, function (status) {
                this.$el.removeClass(status);
            }.bind(this));
            this.$el.addClass(this.model.get('status'));
        },
        render_scheduled: function() {
            $(this.el).find('.scheduled').remove();

            if (this.model.get('scheduled') && user.get('role') === 'teacher') {
                var el = $('<span class=\'scheduled icon timer\' title=\'\'></span>');
                switch (this.model.get('module_id')) {
                    case 'question':
                        el.prop('title', 'This question has been scheduled');
                    break;

                    case 'tournament':
                        el.prop('title', 'This tournament has been scheduled');
                    break;
                }
                this.$('.tree_modifiers').append(el);
            }
        },
        render_status_group: function() {
            if (this.model.get('status_group') && window.user.is_teacher()) {
                var el = $('<span class="status_group icon students" title="This item is part of a custom group"></span>');
                this.$('.tree_modifiers').append(el);
            }
            else {
                $(this.el).find('.status_group').remove();
            }
        }
    });

    window.tree_constructors.views.module_item = TreeModuleItemView;
    return TreeModuleItemView;
});
