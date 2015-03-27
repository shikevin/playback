/* global _ */
define([
    'tree/views/TreeItem',
    'views/ActionMenu',
    'text!templates/status_button.html',
    'util/Browser'
], function (
    TreeItemView,
    ActionMenuView,
    status_html,
    Browser
) {
    'use strict';
    var TreeActionItemView = TreeItemView.extend({
        status_template: _.template(status_html),
        className: 'tree_row module_item no_tree_children app-styles',
        events: _.extend({}, TreeItemView.prototype.events, {
            'click span.status': 'show_action_menu'
        }),
        initialize: function() {
            TreeItemView.prototype.initialize.call(this);
            this.model.bind('change:actions', this.set_action, this);
            this.model.bind('change:current_action', this.set_action, this);
            this.action_menu = null;
        },
        render: function() {
            TreeItemView.prototype.render.call(this);
            this.render_action();
        },
        show_action_menu: function (e) {
            e.stopPropagation();

            if (_.isEmpty(this.model.get_actions())) {
                // Some items (especially for students) have no actions.
                // Rather than show an empty popover, do nothing.
                return;
            }
            $('.status_popover').remove();
            if (this.action_menu) {
                this.action_menu.remove();
            }
            var container, placement;
                if (Browser.is_presentation_tool()) {
                container = '#control';
                placement = 'left';
            } else {
                container = '.course_view';
                placement = 'right';
            }
            this.action_menu = new ActionMenuView({
                model: this.model,
                popover: {
                    namespace: this.cid,
                    btn: $(e.currentTarget),
                    container: container,
                    placement: placement,
                    classes: 'status_popover',
                    adjust: true,
                    heading: false
                }
            });
            this.action_menu.on('destroy', function remove_action_menu() {
                this.action_menu = null;
            }, this);
            this.action_menu.on('action', function (action) {
                this.model.trigger_action(action);
                this.action_menu.remove();
            }, this);
            this.action_menu.render();
        },
        set_action: function () {
            $(this.el).find('.status .option').attr('status', this.model.get_current_action());
        },
        render_action: function() {
            var status = this.model.get_current_action();
            var el = $(this.status_template({
                status: status,
                status_text: this.status_to_text[status]
            }));
            this.$('.action_container').append(el);
            this.action_container = el;
        },
        update_action: function () {
            var status = this.model.get_current_action();
            var el = $(this.status_template({
                status: status,
                status_text: this.status_to_text[status]
            }));
            this.action_container.replaceWith(el);
            this.action_container = el;
        }
    });
    window.tree_constructors.views.action_item = TreeActionItemView;
    return TreeActionItemView;
});
