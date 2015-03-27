/* global _, panels */
define([
    'tree/models/Folder',
    'tree/models/TreeModuleItem',
    'util/daedalus',
    'util/fullscreen',
    'layouts/edumacation/LayoutCollection'
], function (
    Folder,
    TreeModuleItem,
    Daedalus,
    Fullscreen,
    layouts
) {
    'use strict';
    var ModuleItemFolder = Folder.extend({
        defaults: _.extend({}, Folder.prototype.defaults, {
            status: undefined
        }),
        initialize: function() {
            Folder.prototype.initialize.call(this);

            //update the folder's status based on the status of it's children
            this.get('children').bind('change:status', this.update_status, this);
            this.get('children').bind('add', this.update_status, this);
            this.get('children').bind('remove', this.update_status, this);
            this.get('children').bind('reset', this.update_status, this);
            this.update_status();

            //update the folder's saving_status property based on the status of its children
            this.get('children').bind('change:saving_status', function() {
                var saving_status = this.get('children').detect(function(child) { return child.get('saving_status'); }) ? true : false;
                this.set({ 'saving_status': saving_status });
            }, this);

            //react to edit action
            this.bind('action', function(action) {
                if( (action === 'Edit') && this.get('module_id') ) {
                    require('Modules').get_module(this.get('module_id')).add_edit_folder(this);
                }

                if( (action === 'Schedule') && this.get('module_id') ) {

                    // get only questions
                    var folder_questions = this.flatten(true).models;

                    // create array with int question ids
                    var question_ids = [];
                    _.each(folder_questions, function (question) {
                        question_ids.push(question.get('module_item').get_id());
                    });

                    // schedule folder dialog
                    if (question_ids.length >= 1) {
                        require('Modules').get_module(this.get('module_id')).schedule_questions(question_ids);
                    }
                    else {
                        // empty folder
                        panels.add({
                            id: 'question_scheduler_form',
                            module: this.id,
                            layout: layouts.get('dialog'),
                            title: 'Item scheduler',
                            body: '<div>Cannot schedule an empty folder.</div>',
                            footer_buttons: {
                                'Close': 'remove'
                            }
                        });
                    }

                } else if ((action === 'students') && this.get('module_id')) {
                    var items = _.chain(this.flatten(true).models)
                        .filter(function exclude_folders (item) {
                            return !(item instanceof ModuleItemFolder);
                        })
                        .filter(function exclude_certain_module_ids (item) {
                            return !_.contains(['tournament', 'feedback'], item.get('module_id'));
                        })
                        .map(function get_module_item (item) {
                            return item.get('module_item');
                        })
                        .value();

                    require('Modules').get_module('course').initialize_status_group_dialog(items);
                }
            });

            //hide the item when it is set to inactive
            if(window.user.get('role') !== 'teacher') {

                /* recursively open all items in a folder, where the folder
                   parameter is an array of models of the folder's child elements
                */
                var recursive_open = function(folder){
                    _.each(folder, function(item_model){
                        if(item_model.get('item_type') === 'module_item'){
                            var item = item_model.get('module_item');
                            var now = (new Date()).toISOString();

                            /* We need this check because closed questions will be opened
                               otherwise. This doesn't happen in TreeModuleItem because
                               the question is not visible to the student in the TreeView.
                            */
                            if(item.get('status') !== 'inactive'){
                                if (!item.get('is_visible')) {
                                    // we override last_activated_at in order to have it
                                    // at the top of the screen. This only happens when
                                    // the item is not visible because it was opened
                                    // at the student's request.
                                    // hack
                                    item_model.set({last_activated_at: now});
                                }

                                item.trigger('opened');
                            }
                        } else {
                            recursive_open(item_model.get('children').models);
                        }
                    });
                };

                this.set({
                    'click': function(type) {
                            var folder_items = this.get('children').models;
                            recursive_open(folder_items);
                        },
                    'selectable': false //no reason to have select option on student side
                });
            }
        },
        save_status: function (status) {
            var items_to_update = [];
            this.nested_each(function (item) {
                if (item instanceof TreeModuleItem) {
                    items_to_update.push(item.get('module_item'));
                }
            });

            if (items_to_update.length === 0) {
                return;
            }
            require('Modules').get_module('course').save_item_statuses(
                items_to_update, status, false, true);

            if (Fullscreen.is_fullscreen()) {
                var item_ids = _.map(items_to_update, function (item) {
                    return item.get('id');
                });
                Daedalus.track('set status while fullscreen', {
                    items: item_ids,
                    num_items: item_ids.length,
                    status: status,
                    module: items_to_update[0].get('module')
                });
            }
        },
        update_status: function () {
            var statuses = this.get('children').pluck('status');
            var uniq_status = _.uniq(statuses);
            var status;
            if( uniq_status.length === 0 ) {
                status =  'inactive';
            } else if( uniq_status.length === 1 ) {
                status =  uniq_status[0];
            } else {
                status =  'mixed';
            }

            this.set({'status': status});
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
        get_actions: function() {
            if (window.user.is_student()) {
                return [];
            }

            var module_id = this.get('module_id');
            if (!module_id) {
                // item has no module - no way to know actions
                return [];
            }

            var actions = require('Modules').get_module(module_id).get('tree_actions');
            var num_non_folder_items = 0;
            this.nested_each(function (item) {
                if (item.get('item_type') !== 'module_item_folder') {
                    num_non_folder_items += 1;
                }
            });
            if (num_non_folder_items === 0) {
                return [
                    {
                        group: 'Set Status',
                        items: [
                            {
                                description: 'Only professors can access',
                                id: 'inactive',
                                title: '<b>Closed</b>(Inactive)'
                            }
                        ]

                    },
                    {
                        group: 'Actions',
                        items: [
                            {id: 'Edit', instant: true, title: 'Edit Folder'}
                        ]
                    }
                ];
            }

            return [
                _.find(actions, function(action) {
                    return action.group === 'Set Status';
                }),
                {
                    group: 'Actions',
                    items: [
                        {id: 'Edit', instant: true, title: 'Edit Folder'},
                        {id: 'Schedule', instant: true, title: 'Schedule Questions'},
                        {id: 'students', instant: true, title: 'Assign to individuals'}
                    ]
                }
            ];
        },
        get_current_action: function () {
            return this.get('saving_status') ? 'Pending' : this.get('status');
        }
    });
    window.tree_constructors.models.module_item_folder = ModuleItemFolder;
    return ModuleItemFolder;
});
