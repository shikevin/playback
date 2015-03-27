/* global _, Backbone */
define([
    'tree/models/TreeItem',
    'tree/models/Folder',
    'tree/models/Tree',
    'collections/TreeData',
    'views/course/CourseItems',
    'models/CourseSettings',
    'layouts/edumacation/LayoutCollection',
    'util/Browser',

    'tree/views/TreeItem',
    'tree/views/TreeModuleItem',
    'tree/views/ModuleItemFolder'
], function (
    TreeItem,
    Folder,
    Tree,
    TreeDataCollection,
    CourseItemsView,
    CourseSettings,
    layouts,
    Browser
) {
    'use strict';
    var CourseItems = Backbone.Model.extend({
        defaults: {
            trees: undefined,
            selected_ids: [],
            max_height: 250,
            sortable: false,
            excluded_module_item_types: [],
            extra_module_item_types: []
        },
        initialize: function () {
            /**
             * The CourseItems model.
             * @class CourseItems
             * @extends Backbone.Model
             * @constructor
             */
            var trees = _.isArray(this.get('children')) ? this.get('children') : [];
            var treeCollection = new Backbone.Collection();
            _.each(trees, function (tree) {
                treeCollection.add(tree);
            });
            this.set({trees: treeCollection});
            this.get('trees').bind('add', this.bind_selected_items, this);
            this.bind('change:selected_ids', this.handle_selected_ids_update, this);
        },
        get_item: function (id) {
            /**
             * gets the tree item from the course list's set of trees, or false
             * if nothing exists
             * @method get_item
             * @param {String} id Id of the item to retrieve from the course tree.
             */
            var item = false;
            _.each(this.get('trees').models, function (tree) {
                var result = tree.get_item(id);
                if (result) {
                    item = result;
                }
            });
            return item;
        },
        handle_selected_ids_update: function () {
            /**
             * when the selected_ids property is updated, this method loops through and resets
             * any tree items selected_ids values
             * @method handle_selected_ids_update
             */
            //unselect any selected items that are no longer in selected_ids
            var selected_ids = this.get('selected_ids');
            this.get('trees').each(function (tree) {
                tree.nested_each(function (item) {
                    if (item.is_selected() && item instanceof TreeItem && !(item instanceof Folder) && !_.include(selected_ids, item.get('id'))) {
                        item.set({selected: false });
                    }
                });
            });
            //select any items that are in selected_ids
            _.each(this.get('selected_ids'), function (id) {
                var item = this.get_item(id);

                if (!item) {
                    //Ideally we'd only be checking this for demos... but we
                    //don't know what type of moduleitem we have
                    item = this.get_item('key__demo_demo__' + id);
                } else {
                    item.set({selected: true });
                }
            }, this);
        },
        bind_selected_items: function (tree) {
            tree.bind('nested:selected', _.debounce(function () {
                var selected_ids = [];
                this.get('trees').each(function (tree) {
                    tree.nested_each(function (item) {
                        if (item.is_selected() && item instanceof TreeItem && !(item instanceof Folder)) {
                            selected_ids.push(item.get('id'));
                        }
                    });
                });
                this.set({selected_ids: selected_ids});
            }), this);
        },
        get_tree: function (module_id) {
            return this.get('trees').findWhere({id: module_id});
        },
        add_tree: function (module_id, tree) {
            tree.set({
                id: module_id,
                name: this._module_id_to_name[module_id]
            });
            this.get('trees').add(tree);
        },
        get_or_create_tree: function (module) {
            var tree = this.get_tree(module.id);
            if (!tree) {
                tree = new Tree({
                    sortable: this.get('sortable'),
                    show_select_all: true,
                    resizable: true
                });
                this.add_tree(module.id, tree);
            }
            return tree;
        },
        remove_tree: function (module) {
            var tree = this.get_tree(module);
            if (tree) {
                this.get('trees').remove(tree);
            }
        },
        update_tree: function (module, tree) {
            this.remove_tree(module);
            this.add_tree(module, tree);
        },
        _tree_module_ids: [
            'question',
            'demo',
            'files',
            'feedback',
            'discussion',
            'pages',
            'unitree'
        ],
        _module_id_to_name: {
            question: 'Questions',
            demo: 'Demos',
            files: 'Files',
            feedback: 'Feedback',
            discussion: 'Discussion',
            pages: 'Pages',
            tournament: 'Tournament'
        },
        populate_from_course: function (callback) {
            this.get('trees').reset();
            if (Browser.is_sandbox_app) {
                // Get data async and populate
                var course_settings = CourseSettings.findOrCreate({
                    resource_uri: CourseSettings.resource_uri_from_id(
                        $.ajaxSetup().headers['course-id']
                    )
                });

                var active_modules = course_settings.get('active_modules');
                new TreeDataCollection().fetch({
                    success: function (tree_data) {
                        _.each(this._tree_module_ids, function (module_id) {
                            if (_.contains(active_modules, module_id)) {
                                // Get tree for this module
                                var module_tree = tree_data.findWhere({module_id: module_id});
                                var module_raw_tree_data = module_tree.get('data');
                                var tree = new Folder({
                                    show_select_all: true
                                });
                                tree.deserialize(JSON.parse(module_raw_tree_data));
                                this.add_tree(module_id, this.sanitize_tree(tree));
                            }
                        }.bind(this));
                        if (!_.isUndefined(callback)) {
                            callback();
                        }
                    }.bind(this)
                });
            } else {
                var modules_to_show = [];

                _.each(
                    _.union(this._tree_module_ids, this.get('extra_module_item_types')),
                    function(module_id) {
                        if (!_.contains(this.get('excluded_module_item_types'), module_id)) {
                            modules_to_show.push(module_id);
                        }
                    }.bind(this)
                );
                // Get data non-async using global objects
                _.each(modules_to_show, function (module_id) {
                    var module = require('Modules').get_module(module_id);
                    if (module && module.get('active')) {
                        var tree = this.sanitize_tree(module.get('tree'));
                        this.add_tree(module_id, tree);
                    }
                }.bind(this));

                if (!_.isUndefined(callback)) {
                    callback();
                }
            }

            //Select selected items
            this.handle_selected_ids_update();
        },
        sanitize_tree: function (tree) {
            var sanitized_tree = new Tree({
                    sortable: this.get('sortable'),
                    show_select_all: true,
                    max_height: 250,
                    resizable: true,
                    id: tree.get('id'),
                    title: tree.get('title')
                });
            tree.get('children').each(function (child) {
                this.sanitize_tree_item(sanitized_tree, child);
            }, this);
            return sanitized_tree;
        },
        sanitize_tree_item: function (parent, child) {
            var new_item;
            if (child instanceof Folder) {
                new_item = new Folder({
                    id: child.get('id'),
                    title: child.get('title')
                });
                child.get('children').each(function (child_child) {
                    this.sanitize_tree_item(new_item, child_child);
                }, this);
            } else if (child instanceof TreeItem && !(child instanceof Folder)) {
                new_item = new TreeItem({
                    id: child.get('id'),
                    title: child.get('title'),
                    module_id: child.get('module_id'),
                    selectable: true
                });
                if (child.get('display_name')) {
                    new_item.set({title: child.get('display_name')});
                }
            }
            parent.add(new_item);
        },
        launch_dialog: function () {
            // TODO: Remove view logic from model
            var view = new CourseItemsView({model: this});
            var panel = window.panels.add({
                    id: 'course_item_selection',
                    title: 'Select Items',
                    layout: layouts.get('dialog'),
                    footer_buttons: {Close: 'remove'}
                });
            panel.$b().html(view.el);
            view.render();
            return panel;
        }
    });

    return CourseItems;
});
