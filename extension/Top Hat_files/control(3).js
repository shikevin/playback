/* global _, Backbone, panels */
define([
    'tree/models/Folder',
    'tree/views/Tree',
    'views/ActionMenu',
    'tree/models/TreeModuleItemFolder',
    'views/unitree/MoveMenu',
    'views/unitree/CreateMenu',
    'text!templates/unitree/toolbar.html',
    'util/Browser',
    'layouts/edumacation/LayoutCollection'
], function (
    Folder,
    TreeView,
    ActionMenuView,
    ModuleItemFolder,
    MoveMenuView,
    CreateMenuView,
    unitree_control_html,
    Browser,
    layouts
) {
    'use strict';
    var TOP_OF_FOLDER_INDEX = 0;
    var ROOT_FOLDER_ID = '';

    var ModuleControlView = Backbone.View.extend({
        className: 'unified_control',
        template: _.template(unitree_control_html),
        events: {
            'click .add_button': 'show_add_menu',
            'click .delete': 'delete_items',
            'click .status': 'set_status',
            'click .move': 'show_move_menu'
        },
        initialize: function () {
            if (!layouts.get('control')) {
                return;
            }

            this.tree = this.model.get('tree');
            this.tree.set({
                sortable: window.user.is_teacher()
            });

            this.tree_view = new TreeView({
                model: this.tree,
                empty_message: 'No items here...',
                resizable: true
            });

            this.panel = panels.add({
                id: this.model.get('id') + '_control_panel',
                module: this.model.get('id'),
                layout: layouts.get('control'),
                title: this.model.get('name'),
                body: $('#loading_template').html(),
                color: this.model.get('color'),
                priority: this.model.get('order'),
                minimize: true
            });


            this.on('action', function (action) {
                if ((action === 'students') && this.get('module_id')) {
                    var items = _.chain(this.flatten(true).models)
                        .filter(function exclude_folders(item) {
                            return !(item instanceof ModuleItemFolder);
                        })
                        .map(function get_module_item(item) {
                            return item.get('module_item');
                        })
                        .value();

                    require('Modules').get_module('course').initialize_status_group_dialog(items);
                }
            });

            this.render();

            this.listenTo(this.tree, 'change:selected', this.toggle_buttons, this);
        },
        render: function () {
            if (this.tree_view) {
                this.tree_view.render();
            }

            this.$el.html(this.template());
            this.$('.control_panel_tree').append(this.tree_view.el);
            this.panel.$b().empty().append(this.el);
            this.toggle_buttons();
        },
        toggle_buttons: function () {
            var buttons_visible = this.tree.get('selected') !== false;
            this.$('.selected_only').toggle(buttons_visible);
        },
        show_add_menu: function (event) {
            var $current_target = $(event.currentTarget);
            if (this.add_menu) {
                this.stopListening(this.add_menu);
                this.add_menu.remove();
            }

            var container;
            if (Browser.is_presentation_tool()) {
                container = '#control';
            } else {
                container = '.course_view';
            }

            this.add_menu = new CreateMenuView({
                model: {
                    item_types: [
                        {
                            module: 'question',
                            name: 'Question'
                        },
                        {
                            module: 'discussion',
                            name: 'Discussion topic'
                        },
                        {
                            module: 'files',
                            name: 'File upload'
                        },
                        {
                            module: 'pages',
                            name: 'Pages content'
                        },
                        {
                            module: 'demo',
                            name: 'Demo'
                        },
                        {
                            module: 'tournament',
                            name: 'Tournament'
                        }
                    ]
                },
                popover: {
                    namespace: this.cid,
                    btn: $current_target,
                    container: container,
                    placement: 'bottom',
                    adjust: true
                }
            });

            this.listenTo(this.add_menu, 'remove', function () {
                this.stopListening(this.add_menu);
                this.add_menu = null;
            }, this);

            this.listenTo(this.add_menu, 'add_item', function (module_id) {
                if (module_id === 'folder') {
                    require('Modules').get_module('unitree').add_edit_folder();
                } else {
                    require('Modules').get_module(module_id).add_item();
                }
                this.add_menu.remove();
            }, this);

            this.add_menu.render();
        },
        show_move_menu: function (e) {
            if (this.move_menu) {
                this.stopListening(this.move_menu);
                this.move_menu.remove();
            }
            var item_ids = this.tree.selected_without_subchildren();
            var folders = [];
            this.tree.nested_each(function (item) {
                if (item instanceof Folder) {
                    folders.push({
                        id: item.get('id'),
                        title: item.get('title')
                    });
                }
            });

            var container;
            if (Browser.is_presentation_tool()) {
                container = '#control';
            } else {
                container = '.course_view';
            }

            this.move_menu = new MoveMenuView({
                model: {
                    folders: folders,
                    selected_item_count: item_ids.length
                },
                popover: {
                    namespace: this.cid,
                    btn: $(e.currentTarget),
                    container: container,
                    placement: 'bottom',
                    adjust: true
                }
            });

            this.listenTo(this.move_menu, 'destroy', function () {
                this.stopListening(this.move_menu);
                this.move_menu = null;
            }, this);

            this.listenTo(this.move_menu, 'move', function (target) {
                if (target === 'root') {
                    target = ROOT_FOLDER_ID;
                }
                var destination = this.tree.get_item(target);
                this.model.move_items(item_ids, {
                    parent: destination
                });
                this.move_menu.remove();
            }, this);

            this.listenTo(this.move_menu, 'move_special', function (target) {
                var position = TOP_OF_FOLDER_INDEX;
                if (target === 'bottom') {
                    position = -1;
                }
                this.model.move_items(item_ids, {
                    position: position
                });
                this.move_menu.remove();
            }, this);

            this.move_menu.render();
        },
        delete_items: function () {
            require('Modules').get_module('unitree').delete_items();
        },
        set_status: function (e) {
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
                model: {
                    get_actions: function () {
                        return require('Modules').get_module('unitree').get('tree_actions');
                    },
                    get_current_action: function () {
                        return 0;
                    }
                },
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
                this.trigger_action(action);
                this.action_menu.remove();
            }, this);
            this.action_menu.render();
        },
        trigger_action: function (action) {
            var selected_items = this.tree.selected(true).models;
            if (_.contains(['active_visible', 'visible', 'active', 'review', 'inactive'], action)) {
                var is_bulk_action = (
                    selected_items.length > 1 ||
                    (
                        selected_items.length === 1 &&
                        selected_items[0].get('module') === 'tournament' ||
                        selected_items[0].get('module_id') === 'tournament'
                    )
                );
                require('Modules').get_module('unitree').save_item_statuses(
                    selected_items, action, false, is_bulk_action);
            } else if (action === 'Schedule') {
                // create array with int item ids
                var item_ids = [];
                _.each(selected_items, function (item) {
                    item_ids.push(item.get('id'));
                });

                // schedule folder dialog
                if (item_ids.length >= 1) {
                    require('Modules').get_module('unitree').schedule_questions(item_ids);
                } else {
                    // empty folder
                    panels.add({
                        id: 'question_scheduler_form',
                        module: this.id,
                        layout: layouts.get('dialog'),
                        title: 'Activation scheduler',
                        body: '<div>Cannot schedule an empty set.</div>',
                        footer_buttons: {
                            'Close': 'remove'
                        }
                    });
                }
            } else if (action === 'students') {
                selected_items = _.chain(selected_items)
                    .filter(function exclude_folders(item) {
                        return !(item instanceof ModuleItemFolder);
                    })
                    .map(function get_module_item(item) {
                        return item.get('module_item');
                    })
                    .value();
                require('Modules').get_module('course').initialize_status_group_dialog(selected_items);
            }
            if ( _.contains(['active_visible', 'visible'], action) && window.is_presentation_tool) {
                $(window).trigger('item_set_visible');
            }
        }
    });
    return ModuleControlView;
});
