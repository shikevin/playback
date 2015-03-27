/* global Backbone, _ */
define([
    'tree/models/TreeActionItem'
], function (
    TreeActionItem
) {
    'use strict';
    var Folder = TreeActionItem.extend({
        defaults: {
            title: '',
            children: undefined, //new Backbone.Collection(),
            hidden: false,
            selectable: true,
            selected: false,
            item_type: 'folder',
            click: undefined
        },
        recursive_merge: function (source, options) {
            options = options || {};
            var target = this;
            source.get('children').each(function (child) {
                if (options.selected && child.get('selected') === false) {
                    return;
                }
                // get the folder to put this in
                var parent = target.get_item(source.get('id'), 'title');
                if (parent === false ) {
                    //folder doesnt exist, add it
                    parent = new Folder({
                        title: source.get('title'),
                        id: source.get('id')
                    });
                    target.add(parent);
                }
                // put the child into the folder
                if (child instanceof Folder) {
                    // check if the folder already exists
                    var folder = target.get_item(child.get('id'));
                    if (!folder) {
                        // we can't put folders directly... they come with children
                        // so we clone the folder
                        folder = new Folder({
                            title: child.get('title'),
                            id: child.get('id')
                        });
                        folder.set('id', child.get('id'));
                        target.add(folder);
                    }
                    // and merge the children
                    folder.recursive_merge(child, options);
                } else {
                    parent.add(child);
                }
            });
        },
        serialize: function() {
            var children = this.get('children').map(function(child) {
                return child.serialize();
            });
            return {
                hidden: this.get('hidden'),
                children: children,
                id: this.get('id'),
                title: this.get('title'),
                item_type: 'module_item_folder'
            };
        },
        serialize_selected: function () {
            var selected_children = this.get('children').filter(function (child) {
                // we have to exclude false because `selected` might be mixed
                return child.get('selected') !== false;
            });
            var children = selected_children.map(function(child) {
                if (child instanceof Folder) {
                    return child.serialize_selected();
                } else {
                    return child.serialize();
                }
            });
            return {
                hidden: this.get('hidden') || false,
                children: children,
                id: this.get('id') || '',
                title: this.get('title') || '',
                item_type: 'module_item_folder'
            };
        },

        deserialize: function(data) {
            //we'll be modifying data property, so we better clone it
            data = _.extend({}, data);

            _.each(data.children, function (new_item, index) {
                var existing_item = new_item.id === undefined ? undefined : this.get('children').findWhere({
                    id: new_item.id,
                    item_type: new_item.item_type
                });
                var ChildClass, child_obj;
                //if folder item does not exist at serialized item's position, add new item
                if( !existing_item ) {
                    ChildClass = window.tree_constructors.models[ new_item.item_type ];
                    child_obj = new ChildClass();
                    child_obj.deserialize(new_item);
                    this.get('children').add(child_obj);

                //if both folder and serialized data exist at corresponding location and match ids, update that object
                } else if (existing_item.get('id') === new_item.id && existing_item.get('item_type') === new_item.item_type) {
                    existing_item.deserialize( new_item );

                //if folder and serialized data exist at same location but are different, replace with serialized
                } else {
                    this.get('children').remove(existing_item);

                    ChildClass = window.tree_constructors.models[new_item.item_type];
                    child_obj = new ChildClass();
                    child_obj.deserialize(new_item);
                    this.get('children').add(child_obj, {'at': index});
                }
            }.bind(this));

            // sort this folder's children according to the new data
            var get_index = function (item) {
                var data_item = _.find(data.children, function (d_item) {
                    return d_item.id === item.get('id');
                });
                return _.indexOf(data.children, data_item);
            };

            var sort_func = function(a, b) {
                var ia = get_index(a), ib = get_index(b);
                return ia > ib ? 1 : (ia < ib ? -1 : 0);
            };

            this.get('children').models.sort(sort_func);

            // if any child does NOT have a matching record in data.children,
            // remove it
            var items_to_remove = this.get('children').filter(function (item) {
                return _.where(data.children, {
                    id: item.get('id'),
                    item_type: item.get('item_type')
                }).length === 0;
            });
            _.each(items_to_remove, function(item) {
                this.get('children').remove(item);
            }.bind(this));

            //delete the data so that we don't set the list's children to be a serialized array wehen we call 'set'
            //then set title and other properties
            delete data.children;
            this.set(data);

            this.trigger('deserialize');
        },
        initialize: function() {
            if( !this.get('children') ) {
                this.set({'children': new Backbone.Collection() });
            }
            if( _.isArray( this.get('children') ) ) {
                this.set({'children': new Backbone.Collection(this.get('children')) });
            }

            //update the folder's selected status
            this.get('children').bind('change:selected', this.update_selected, this);
            this.get('children').bind('add', this.update_selected, this);
            this.get('children').bind('remove', this.update_selected, this);
            this.update_selected();

            //updates children when folder's selected status changed
            this.bind('change:selected', function() {
                var is_selected = this.get('selected');

                //if folder's status is 'mixed', don't propogate that down - this is a
                //folder-specific value
                if( is_selected === 'mixed' ) {
                    return false;
                }
                this.get('children').each(function(child) {
                    child.set({'selected': is_selected});
                });
            });

            //propagate 'save:hidden' status changes up to this folder's parents when a user has clicked a folder
            this.get('children').bind('save:hidden', function(item) {  this.trigger('save:hidden', item); }, this);

            //propogate 'nested:add' event up to folder's parents
            this.get('children').bind('add', function(item) {  this.trigger('nested:add', item); }, this);
            this.get('children').bind('nested:add', function(item) {  this.trigger('nested:add', item); }, this);

            //propogate 'nested:remove' event up to folder's parents
            this.get('children').bind('remove', function(item) {  this.trigger('nested:remove', item); }, this);
            this.get('children').bind('nested:remove', function(item) {  this.trigger('nested:remove', item); }, this);

            //propogate 'nested:selected' event up to folder's parents
            this.get('children').bind('change:selected', function(item) {  this.trigger('nested:selected', item); }, this);
            this.get('children').bind('nested:selected', function(item) {  this.trigger('nested:selected', item); }, this);

            //collection's remove event is triggered on model
            this.get('children').bind('remove', function(item) {  this.trigger('remove', item); }, this);

            //collection's add event is triggered on model
            this.get('children').bind('add', function(item) {  this.trigger('add', item); }, this);

            this.bind('click', function() {
                if( this.get('click') ) {
                    this.get('click').call(this);
                }
            });
        },
        //call when a user interaction results in a hidden status change
        //sets the hidden status of a tree item and triggers a special save:hidden status
        //this allows us to differentiate between user actions and data updates
        save_hidden: function(hidden_status) {
            this.set({'hidden': hidden_status});
            this.trigger('save:hidden', this);
        },
        update_selected: function() {
            //gets the selected status from all of the folder's selectable children
            var selectable_children = this.get('children').filter(function(child) {
                return child.get('selectable');
            });
            var child_statuses = _.map(selectable_children, function(child) {
                return child.get('selected');
            });
            child_statuses = _.uniq(child_statuses);

            //calculate the status based on the number of unique child statuses
            var selected;
            switch( child_statuses.length ) {
            case 0:
                selected = false;
                break;
            case 1:
                selected = child_statuses[0];
                break;
            default:
                selected = 'mixed';
            }

            this.set({'selected': selected });
        },
        add: function(item, position) {
            this.get('children').add(item, {at:position});
        },
        remove: function(item) {
            this.get('children').remove(item);
        },
        move: function(item, position) {
            var from = this.get('children').indexOf(item);
            var to = parseInt(position, 10);

            if( from === to ) {
                return false;
            }

            var children_arr = this.get('children').models;
            children_arr.splice(to,0, children_arr.splice(from,1)[0]);
            this.trigger('move');
        },

        get_item: function(id, variable_name, type) {
            var item = false;
            var type_class = type ? window.tree_constructors.models[type] : undefined;
            variable_name = variable_name || 'id';

            if (this.get(variable_name) === id) { return this; }

            this.nested_each(function(child) {
                if(type_class && !(child instanceof type_class)) {
                    return true;
                }

                if(child.get(variable_name) === id) {
                    item = child;
                    return false;
                }
            });
            return item;
        },

        get_item_index: function(id) {
            var i = 0, result = -1;
            this.nested_each(function (child) {
                if (child.get('id') === id) {
                    result = i;
                    return false;
                }
                i++;
            });
            return result;
        },

        indexes_of: function(item) {
            var indexes = [];
            var index = 0;
            this.nested_each(function (child) {
                if( item.cid === child.cid ) {
                    indexes.push( index );
                }
                index++;
            });
            return indexes;
        },

        indexOf: function(item) {
            // like indexes_of, but only returns the first hit
            var index = 0;
            var result;
            this.nested_each(function (child) {
                if(item.cid === child.cid && result === undefined) {
                    result = index;
                }
                index++;
            });
            return result;
        },

        each: function(fn) { this.get('children').each(fn); },
        length: function() { return this.get('children').length(); },

        nested_each: function(fn) {
            var models = this.get('children').models;
            for(var index = 0; index < models.length; index += 1) {
                var child = models[index];

                //run function on child
                var result = fn.call(this, child);
                if( result === false ) {
                    return false;
                }

                //run function on child's children - if it has them
                if( child instanceof Folder ) {
                    result = child.nested_each(fn);

                    //bubble false results up
                    if( result === false ) {
                        return false;
                    }
                }
            }
        },

        flatten: function(exclude_folders) {
            //collections are like arrays, but with nice build-in methods
            var list = new Backbone.Collection();

            var add_to_list = function(item, list) {
                //add the item to the list
                if( !(item instanceof Folder) || !exclude_folders ) {
                    list.add(item);
                }

                //if the item is a folder, add each of it's children to the list
                if( item instanceof Folder ) {
                    item.get('children').each(function(item) {
                        add_to_list(item, list);
                    });
                }
            };
            add_to_list(this, list);
            return list;
        },
        selected: function(exclude_folders) {
            var items = this.flatten(exclude_folders).filter(function(item) {
                return item.get('selectable') && item.get('selected');
            });
            return new Backbone.Collection(items);
        },
        is_selected: function() {
            return ( this.get('selectable') && ( this.get('selected') === true ) ) ? true : false;
        },
        /**
         * Returns a list of ids that are selected. If a folder and all it's
         * children are selected, only the folder will be returned.
         *
         * If folder children are selected, the folder will be discluded.
         *
         * @return {Backbone.Collection} A list of selected tree items.
         */
        selected_without_subchildren: function () {
            var discluded_ids = [];

            var fully_selected_filter = function (node) {
                return (
                    node.get('item_type') === 'module_item_folder' &&
                    node.get('selectable') &&
                    node.get('selected') === true
                );
            };
            var mixed_selected_filter = function (node) {
                return (
                    node.get('selectable') &&
                    node.get('selected') === 'mixed'
                );
            };
            var fully_selected_folders = this.flatten().filter(fully_selected_filter);
            _.each(fully_selected_folders, function (folder) {
                // Disclude subfolders and module items from being added
                var children_ids = folder.flatten().pluck('id');
                children_ids = _.without(children_ids, folder.get('id'));
                discluded_ids = _.union(discluded_ids, children_ids);
            });

            // Remove mixed selection folders
            discluded_ids  = _.union(
                discluded_ids,
                new Backbone.Collection(this.flatten().filter(mixed_selected_filter)).pluck('id')
            );

            var selected_tree_ids = this.selected().pluck('id');
            selected_tree_ids = _.difference(selected_tree_ids, discluded_ids);

            return selected_tree_ids;
        },
        nested_length: function () {
            var i = 0;
            this.nested_each(function() {
                i++;
            });
            return i;
        },
        filter: function (iteratee) {
            var result = this.clone();
            var children = this.get('children').filter(iteratee);
            result.set({
                children: new Backbone.Collection(children)
            });
            return result;
        },
        /**
         * Filters the tree to only contain items corresponding to specific
         * module_ids.
         *
         * @param {String[]} module_ids - Module ids to filter.
         * @returns {Folder} Resulting filtered tree.
         */
        filter_module_ids: function (module_ids) {
            var children = new Backbone.Collection();
            this.get('children').each(function (child) {
                if (child instanceof Folder) {
                    child = this.filter_module_ids.call(child, module_ids);
                    children.add(child);
                } else if (_.contains(module_ids, child.get('module_id'))) {
                    children.add(child);
                }
            }.bind(this));
            var result = this.clone();
            result.set({
                children: children
            });
            return result;
        }

    });
    window.tree_constructors.models.folder = Folder;
    return Folder;
});
