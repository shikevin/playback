/*globals define, _ */
/* Note: copied from tree.dev.js, needs refactoring */
define([
    'tree/models/TreeActionItem',
    'util/daedalus',
    'util/fullscreen'
], function (TreeActionItem, Daedalus, Fullscreen) {
    'use strict';
    var DEFAULT_TITLE = '- Undefined -';
    var TreeModuleItem = TreeActionItem.extend({
        /*
         * Advanced tree item that shares many of its properties with a corresponding module_item
         * The id for the module item is passed in as the 'id' property, and the item expects a
         * matching module item to be accessible via the module_item property. This value is set outside
         * of the deserialization, in the link_tree_items_to_module_items method
         */
        defaults: _.extend({}, TreeActionItem.prototype.defaults, {
            status: 'inactive',
            selectable: true,
            answered: false,
            item: undefined,
            title: DEFAULT_TITLE
        }),
        serialize: function() {
            var data = this.toJSON();

            //we don't want to pass the module item instance in the serialized object, and this object's
            //id reference points to the module item already
            delete data.module_item;

            return data;
        },
        deserialize: function(data) {
            this.set(data);
            if (this.get('title') === DEFAULT_TITLE && this.get('display_name')) {
                this.set({title: this.get('display_name')});
            }
        },
        setup_module_item_bindings: function() {
            //ensure a module item exists
            if( !this.get('module_item') ) {
                return false;
            }

            //set title to be the module item's title
            this.set({ 'title': this.get('module_item').get('title') || this.defaults.title });
            this.get('module_item').bind('change:title', function() {
                this.set({'title': this.get('module_item').get('title') });
            }, this);

            //set status to module_item's status, and bind for MI's status changes
            this.set({'status': this.get('module_item').get('status') });
            this.get('module_item').bind('change:status', function() {
                this.set({'status': this.get('module_item').get('status')});
            }, this);

            //set answered state to module_item's states, and bind for MI's answered changes
            this.set({'answered': this.get('module_item').get('answered') });
            this.get('module_item').bind('change:answered', function() {
                this.set({'answered': this.get('module_item').get('answered')});
            }, this);

            //set saving_status state to module_item's states, and bind for MI's answered changes
            this.get('module_item').bind('change:saving_status', function() {
                this.set({'saving_status': this.get('module_item').get('saving_status')});
            }, this);
        },
        save_status: function(status) {
            var item = this.get('module_item');
            if (item.get('module') === 'tournament') {
                return item.save_status(status);
            }
            item.module().save_item_statuses([item], status);
            // Track status change with Daedalus
            Daedalus.track_mi_status(this.get('module_item'), status);

            if (window.is_fullscreen) {
                Daedalus.track('set status while fullscreen', {
                    items: [item.get_id()],
                    num_items: 1,
                    status: status,
                    module: item.get('module')
                });
            }
        },
        initialize: function() {
            TreeActionItem.prototype.initialize.call(this);
            //Map tree item to module item
            this.bind('change:module_item', this.setup_module_item_bindings, this);
            this.setup_module_item_bindings();

            //bubble the actionmenu's action up to the module item model
            this.bind('action', function(action) {
                this.get('module_item').trigger('action', action);
            });

            //if user is student, set so that clicking on item in tree will open it
            if(window.user.get('role') !== 'teacher') {
                this.set({
                    'click': function() {
                        var item = this.get('module_item');
                        var now = (new Date()).toISOString();

                        if (!item.get('is_visible')) {
                            // we override last_activated_at in order to have it
                            // at the top of the screen. This only happens when
                            // the item is not visible because it was opened
                            // at the student's request.
                            // hack
                            this.set({last_activated_at: now});
                        }

                        item.trigger('opened');
                    },
                    'selectable': false //no reason to have select option on student side
                });
            }
        },
        trigger_action: function (action) {
            if( _.include(['active_visible', 'visible', 'active', 'review', 'inactive'], action) ) {
                this.save_status(action);
            } else {
                Fullscreen.exit_fullscreen();
                this.trigger('action', action);
            }
            if( _.include(['active_visible', 'visible'], action) && window.is_presentation_tool) {
                $(window).trigger('item_set_visible');
            }
        },
        get_actions: function () {
            if(this.get('module_item') && window.user.is_teacher()) {
                return this.get('module_item').module().get('tree_actions');
            } else {
                return {};
            }
        },
        get_current_action: function () {
            return this.get('saving_status') ? 'Pending' : this.get('status');
        }
    });
    window.tree_constructors.models.module_item = TreeModuleItem;
    return TreeModuleItem;
});
