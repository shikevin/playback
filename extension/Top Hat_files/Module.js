/* global Backbone, _, publisher, panels */
define([
    'tree/models/Tree',
    'tree/models/TreeModuleItem',
    'tree/models/TreeModuleItemFolder',
    'tree/models/Folder',
    'tree/models/CourseTreeItem',
    'tree/models/CourseTreeItemParent',
    'models/HiddenFolder',
    'models/TreeData',
    'util/daedalus',
    'text!templates/confirm_destroy_group.html',
    'text!templates/lobby/no_content_placeholder_student.html',
    'text!templates/lobby/no_content_placeholder_homework_present.html',
    'layouts/edumacation/LayoutCollection',
    'modules/UnansweredItems',
    'models/lobby_user',
    'util/Browser',
    'modules/FolderInsertMixin',
    'backbone.cocktail'
], function (
    Tree,
    TreeModuleItem,
    ModuleItemFolder,
    Folder,
    CourseTreeItem,
    CourseTreeItemParent,
    HiddenFolder,
    TreeData,
    Daedalus,
    confirm_destroy_group_html,
    PlaceHolderStudentTemplate,
    PlaceHolderStudentHomeworkPresentTemplate,
    layouts,
    UnansweredItems,
    User,
    Browser,
    FolderInsertMixin,
    Cocktail
) {
    'use strict';
    var Module = Backbone.Model.extend({
        /* 'Modules' are components of functionality on the site. This is the base
         * Backbone.Model that the individual Modules extend (e.g. Question). */
        relations: [{
            type: Backbone.HasOne,
            key: 'tree_data',
            relatedModel: TreeData
        }],
        defaults: {
            id: undefined,
            name: undefined,
            color: undefined,
            model: undefined,
            order: undefined,
            active: false,

            // We need to track the number of active homework items to decide
            // what placeholder/empty state to use for students, notifying them of
            // homework items if they exist somewhere
            active_homework_items: 0,

            // Some modules are not client-side facing (tutorial, course, publisher)
            // these are not shown in some areas of site (e.g. module list)
            hidden_module: false,
            // Modules are not authorized to the user by default
            // unauthorized modules are not shown in some areas of site (e.g. module list)
            authorized: false,
            // control_view: ModuleControlView, // extend this default

            // tree_actions are what a user can do to a module item in a module. They
            // constitute the action menu drop-down in the module's control panel view
            tree_actions: [{
                'group': 'Set Status',
                'items': [
                    {
                        'id': 'active_visible',
                        'title':'<b>Ask</b>(Active + Visible)',
                        'description': 'Online students will see the item. Students can submit answers.'
                    },
                    {
                        'id': 'visible',
                        'title':'<b>Show</b>(Visible)',
                        'description': 'Online students will see the item. Students can not submit answers.'
                    },
                    {
                        'id': 'active',
                        'title':'<b>Homework</b>(Active)',
                        'description': 'Assign item as homework to students.'
                    },
                    {
                        'id': 'review',
                        'title':'<b>Review</b>',
                        'description': 'Give students study items. Students can view answers.'
                    },
                    {
                        'id': 'inactive',
                        'title':'<b>Closed</b>(Inactive)',
                        'description': 'Only professors can access'
                    }
                ]
            }, {
                'group': 'Actions',
                'items': [
                    {id: 'Duplicate', instant: true, title: 'Duplicate Item'},
                    {id: 'Edit', instant: true, title: 'Edit Item'},
                    {id: 'Preview', instant: true, title: 'Preview Item'},
                    {id: 'Answers', instant: true, title: 'Show Answers'},
                    {id: 'Schedule', instant: true, title: 'Schedule Item'},
                    {id: 'students', instant: true, title: 'Assign to individuals'}
                ]
            }]
        },

        /**
         * Move and change position of tree items.
         *
         * @param  {String[]} item_ids - source ids to move
         * @param  {String=} options.parent - destination tree item to move to
         * @param  {Integer=} options.position - position in destination folder to move to
         */
        move_items: function (item_ids, options) {
            var parent = options.parent;
            var position = options.position;

            var parent_id;
            if (!_.isUndefined(parent)) {
                parent_id = parent.get('id');
                if (parent_id === '') {
                    parent_id = 'root';
                }
            }
            var models_to_save = this.change_parent_and_position(
                item_ids, parent_id, position);

            /**
             * Run functions that return deferred one at a time.
             */
            var async_serial = function (models) {
                if (!models.length) {
                    return;
                }
                models.shift().call(this).then(function () {
                    async_serial(models);
                });
            };
            async_serial(models_to_save);
        },

        /**
         * Move tree item to another folder and position within that folder.
         *
         * @param  {String[]} item_ids - source ids to move
         * @param  {Integer} position - position in destination folder to move to
         * @param  {String} parent_id - destination id to move to
         * @return {Function[]} - Array of functions that will return a deferred.
         */
        change_parent_and_position: function (item_ids, parent_id, position) {
            return _.map(item_ids, function (item_id) {
                var tree_item = new CourseTreeItem({
                    item_id: item_id
                });
                tree_item.set({resource_uri: tree_item.url()});
                return function () {
                    var data = {};
                    if (!_.isUndefined(parent_id)) {
                        data.parent = {
                            parent_id: parent_id
                        };
                    }
                    if (!_.isUndefined(position)) {
                        data.position = position;
                    }
                    return tree_item.save(data, {patch: true});
                };
            });
        },

        initialize: function() {
            // Create a new control panel tree
            if (_.isUndefined(window.user)) {
                window.user = new User(window.user_data);
            }
            this.set({'tree': new Tree({
                children: [],
                sortable: ((window.user.get('role') === 'teacher') ? true : false)
            })});

            this.get('tree').bind('save:hidden', function(item) {
                var folder;

                if (item.get('hidden')) {
                    // If we're hiding, perform a POST request to create a hidden folder
                    folder = new HiddenFolder({
                        'module_id': this.id,
                        'folder_id': item.get('id')
                    });
                    folder.save();
                } else {
                    // If we're showing, find the hidden folder entry and delete it
                    folder = new HiddenFolder();
                    folder.fetch({
                        data: {
                            folder_id: item.get('id')
                        },
                        success: function(collection, response, options) {
                            collection.destroy();
                        }
                    });
                }
            }, this);

            this.get('tree').bind('sorted', function(item, old_folder, new_folder, position) {
                if (require('Modules').get_module('unitree').get('active')) {
                    this.move_items([item.get('id')], {
                        parent: new_folder,
                        position: position
                    });
                } else {
                    publisher.send({
                        module: this.id,
                        command: 'move_item',
                        args: {
                            item_id: item.get('id'),
                            item_type: item.get('item_type'),
                            old_folder_id: old_folder.get('id'),
                            new_folder_id: new_folder.get('id'),
                            position: position
                        },
                        success: function (data, args) {
                            var patch = args.patch;
                            if (patch) {
                                this.get('tree_data').patch(patch);
                            }
                        }.bind(this)
                    });
                }
            }, this);

            // Set up new module items collection
            this.set({'items': new Backbone.Collection() });

            // when the module is activated, get its init command from the server
            this.bind('change:active', function() {
                if(this.get('active')) {

                    //needs to be deferred, or it locks up the UI
                    _.defer($.proxy(function() {
                        if(!this.get('hidden_module')) {
                            this.toggle_view(); // create the control panel
                            this.get('items').each(function(item) {
                                if (item.is_visible()) {
                                    item.trigger('opened');
                                }
                            });
                        }
                    }, this));

                    require('lobby/Lobby').trigger_course_load_finished();
                    this.init_callback();
                } else if(!this.get('hidden_module')) {
                    // Close all open module items
                    this.get('items').each(function(item) {
                        item.set({ opened: false });
                    });

                    // Close all active module items in the content column
                    this.get('items').each(function(item) {
                        item.trigger('closed');
                    });

                    // hidden modules never get deactivated
                    panels.in_module(this.id).each(function(panel) {
                        panel.remove();
                    });
                    this.toggle_view(); // remove the control panel
                }
            }.bind(this));
        },

        toggle_view: function() {
            if (Browser.is_mobile()) {
                // don't create module views on mobile
                // because mobile doens't have anywhere to put the view
                return;
            }
            if (
                require('Modules').get_module('unitree').get('active') &&
                this.get('id') !== 'unitree' &&
                this.get('id') !== 'attendance'
            ) {
                this.remove_view();
                return;
            }

            var ControlView = this.get('control_view');
            if (ControlView && this.get('active')) {
                this.set({ control_panel: new ControlView({ model: this })});
            } else {
                this.remove_view();
            }
        },

        remove_view: function () {
            var control_panel = this.get('control_panel');
            if (control_panel) {
                if (control_panel.panel) {
                    control_panel.panel.remove();
                }
                control_panel.remove();
                this.unset('control_panel');
            }
        },

        items: function() { return this.get('items'); },

        init_callback: function() {

        },

        reload: function() {

        },

        //the header buttons pass in element data in their callback that confuses the add_edit_folder command;
        //this method cleans it up
        panel_add_folder: function() {
            this.add_edit_folder();
        },
        add_edit_folder: function(existing_folder) {
            var panel = panels.add({
                module: this.id,
                id: 'add_folder',
                layout: layouts.get('dialog'),
                title: existing_folder ? 'Rename Folder' : 'Add Folder',
                body: '<div class="thm_form"></div>',
                footer_buttons: {
                    Cancel: 'remove',
                    Ok: function () {
                        if (!form.is_valid()) {
                            return false;
                        }
                        panel.loading();

                        publisher.send({
                            module: this.id,
                            command: existing_folder ? 'rename_folder' : 'add_folder',
                            args: {
                                folder_id: existing_folder ? existing_folder.get('id') : undefined,
                                folder_name: form.get('name').value()
                            },
                            success: function(data, args) {
                                var patch = args.patch;
                                if (patch) {
                                    this.get('tree_data').patch(patch);
                                }
                                panel.remove();

                                var event_name = existing_folder ? 'renamed folder' : 'created folder';
                                Daedalus.track(event_name);
                            }.bind(this)
                        });
                    }.bind(this)
                }
            });

            var form = panel.$('.thm_form').composer([{
                'id': 'name',
                'type': 'text',
                'label': 'Folder name',
                'validation': ['unique_folder_name', 'not_empty']
            }]);

            form.addValidation('unique_folder_name', $.proxy(function(item_val) {
                var folder_name_matches_old = existing_folder ? item_val === existing_folder.get('title') : false;
                if( this.get('tree').get_item(item_val, 'title', 'folder') && !folder_name_matches_old ) {
                    return 'Folder name currently in use.';
                } else {
                    return true;
                }
            }, this));

            //set title to existing folder, if we have been provided one
            if( existing_folder ) {
                form.get('name').value( existing_folder.get('title') );
            }
        },

        schedule_questions: function (question_ids) {
            Daedalus.track('opened question scheduler');
            Daedalus.set_property('hasOpenedScheduler', true);
            Daedalus.increment('openedQuestionSchedulerCount');

            var start_status_options = [
                'active',
                'review'];
            var start_status_options_names = [
                'Homework (Active)',
                'Review'];

            var end_status_options = [
                'review',
                'inactive'];
            var end_status_options_names = [
                'Review',
                'Closed (Inactive)'];

            var schedule_form = function(data, args) {
                var old_start_in_seconds = args.start_in_seconds;
                var old_end_in_seconds = args.end_in_seconds;
                var start_status = args.start_status;
                var end_status = args.end_status;
                var start_timestamp_end_date = new Date();

                // used for start/end timestamp
                var datepicker_field = function (set_item, is_end_timestamp) {
                    var pretty_date_str = 'Click to set a date';
                    //set up value to show to user
                    if ( set_item.value() === 'varies' ) {
                        pretty_date_str = 'Varies';
                    } else if( set_item.value() === 'started' ) {
                        pretty_date_str = 'Started';
                    } else if( set_item.value() ) {
                        pretty_date_str = new Date( set_item.value() * 1000 ).strftime('%b %d %Y %I:%M %p'); // must be in milliseconds
                    }

                    //set up element
                    $(set_item.el).html('<b></b><input type="text" />');

                    //bind datepicker
                    $(set_item.el).find('input')
                        .val( pretty_date_str )
                        .datetimepicker({
                            onClose: function (dateTxt, inst) {
                                var new_time = Math.round($(this).datepicker('getDate').getTime() / 1000);
                                set_item.value( new_time );
                                if (!is_end_timestamp) {
                                    start_timestamp_end_date = new_time * 1000;
                                }
                            },
                            beforeShow: function (input, inst) {
                                var $input = $(input);
                                if (is_end_timestamp) {
                                    // Set the min date on the end_timestamp to
                                    // 1 minute after the start_timestamp current value
                                    var ONE_MINUTE = 60000;
                                    var new_min_date = new Date(start_timestamp_end_date + ONE_MINUTE);
                                    $input.datepicker('option', 'minDate', new_min_date);
                                    $input.datepicker('option', 'minDateTime', new_min_date);
                                } else {
                                    var dateVal = set_item.value() ? new Date( set_item.value() * 1000 ) : new Date();
                                    $input.datepicker('setDate', dateVal);
                                }
                            },
                            minDate: new Date()
                        });
                };
                var start_timestamp_datepicker_field = function (set_item) {
                    datepicker_field(set_item, false);
                };
                var end_timestamp_datepicker_field = function (set_item) {
                    datepicker_field(set_item, true);
                };

                // THIS IS A HACK
                var start_options = _.zip(start_status_options, start_status_options_names);
                start_options = _.map(start_options, function (status_pair, other_thing) {
                    return {
                        option: status_pair[1],
                        value: status_pair[0]
                    };
                });
                var end_options = _.zip(end_status_options, end_status_options_names);
                end_options = _.map(end_options, function (status_pair, other_thing) {
                    return {
                        option: status_pair[1],
                        value: status_pair[0]
                    };
                });
                var schedule_composer_data = [{
                    'id': 'start_status',
                    'type': 'radio',
                    'label': 'Start Status',
                    'options': start_options
                },{
                    'id': 'end_status',
                    'type': 'radio',
                    'label': 'End Status',
                    'options': end_options
                },{
                    'id': 'start_timestamp',
                    'type': 'set',
                    'label': 'Start',
                    'immutable': true,
                    'sortable': false,
                    'structure': start_timestamp_datepicker_field,
                    'value': [old_start_in_seconds]
                },{
                    'id': 'end_timestamp',
                    'type': 'set',
                    'label': 'End',
                    'immutable': true,
                    'sortable': false,
                    'structure': end_timestamp_datepicker_field,
                    'value': [old_end_in_seconds]
                }];

                // add 'remove button' if schedules exist
                if (old_start_in_seconds !== '' || old_end_in_seconds !== '') {
                    schedule_composer_data.push({
                        'id': 'delete_schedule',
                        'type': 'button',
                        'value': 'Remove Schedule',
                        'change': $.proxy(function() {

                            var properties = {
                                number_questions: question_ids.length
                            };
                            Daedalus.track('canceled question schedule', properties);
                            Daedalus.increment('canceledQuestionScheduledCount');

                            publisher.send({
                                module: 'question',
                                command: 'delete_question_schedules_external',
                                args: {'question_ids': question_ids},
                                success: function() {
                                    panel.remove();
                                }.bind(this),
                                timeout_handling: publisher.TOH.retry
                            });
                        }, this)
                    });
                }

                this.form = panel.$b('.form').composer(schedule_composer_data);

            };

            var submit_schedule_button = function() {
                var start_status = this.form.get('start_status').value();
                var end_status = this.form.get('end_status').value();
                var start_timestamp = this.form.get('start_timestamp').value()[0];
                var end_timestamp = this.form.get('end_timestamp').value()[0];

                $('#cId_start_timestamp').find('.cValidation').remove();
                $('#cId_end_timestamp').find('.cValidation').remove();

                // error: start after end
                if ( typeof(start_timestamp) === 'number' && typeof(end_timestamp) === 'number' && end_timestamp < start_timestamp) {
                    $('#cId_end_timestamp').append('<div class="cValidation invalid"><span>' + 'End date must be after start date.' + '</span></div>');
                }

                else if ( start_timestamp === 'varies' ) {
                    $('#cId_start_timestamp').append('<div class="cValidation invalid"><span>' + 'Cannot be left blank.' + '</span></div>');
                }
                else if ( end_timestamp === 'varies' ) {
                    $('#cId_end_timestamp').append('<div class="cValidation invalid"><span>' + 'Cannot be left blank.' + '</span></div>');
                }

                // error: both start/end blank
                else if ( start_timestamp === '' && end_timestamp === '') {
                    $('#cId_start_timestamp').append('<div class="cValidation invalid"><span>' + 'Start and end cannot both be blank.' + '</span></div>');
                    $('#cId_end_timestamp').append('<div class="cValidation invalid"><span>' + 'Start and end cannot both be blank.' + '</span></div>');
                }

                // error: start == end
                else if ( Math.abs(start_timestamp - end_timestamp) < 10 ) {
                    $('#cId_end_timestamp').append('<div class="cValidation invalid"><span>' + 'Cannot start and end at the same time.' + '</span></div>');
                }

                // create question schedules
                else {
                    var properties = {
                        number_questions: question_ids.length,
                        start_status: start_status,
                        end_status: end_status,
                        start_timestamp: new Date( start_timestamp * 1000 ).strftime('%b %d %Y %I:%M %p'),
                        end_timestamp: new Date( end_timestamp * 1000 ).strftime('%b %d %Y %I:%M %p')
                    };
                    Daedalus.track('created question schedule', properties);
                    Daedalus.set_property('hasUsedScheduler', true);
                    Daedalus.increment('createdQuestionScheduleCount');

                    publisher.send({
                        module: 'question',
                        command: 'create_question_schedules_external',
                        args: {
                            'question_ids': question_ids,
                            'start_status': start_status,
                            'end_status': end_status,
                            'start_timestamp': start_timestamp,
                            'end_timestamp': end_timestamp
                        },
                        success: function() {
                            panel.remove();
                        }
                    });
                }

            };

            var panel = panels.add({
                id: 'question_scheduler_form',
                module: this.id,
                layout: layouts.get('dialog'),
                title: 'Item scheduler',
                body: '<div class="form"></div>',
                footer_buttons: {
                    'Close': 'remove',
                    'Schedule': $.proxy(submit_schedule_button, this)
                }
            });

            // get data to prepopulate form
            publisher.send({
                'module': 'question',
                'command': 'get_question_schedules_external',
                'args': {'question_ids': question_ids},
                'success': $.proxy(schedule_form, this)
            });

        },

        delete_items: function() {
            var selected_items = [];
            this.get('tree').nested_each(function(item) {
                if( item.is_selected() ) {
                    selected_items.push(item);
                }
            });

            if( !selected_items.length ) {
                return false;
            }

            var panel = panels.add({
                module_id: 'course',
                id: 'delete_items',
                layout: layouts.get('dialog'),
                title: 'Confirm Delete',
                body: 'Are you sure you would like to delete these items from the course?',
                footer_buttons: {
                    'Cancel': 'remove',
                    'Ok': $.proxy(function() {

                        _.each(selected_items, function(item) {
                            if(item instanceof TreeModuleItem) {
                                item.get('module_item').set({ status: 'inactive', opened: false });
                            }
                        });

                        panel.set({
                            'footer_buttons': {'Cancel': 'remove'}
                        });
                        panel.loading();

                        var items = _.map(
                            selected_items,
                            function(item) {
                                // track deletion
                                var event_name, properties;
                                if (item.get('item_type') === 'module_item_folder') {
                                    event_name = 'deleted folder';
                                    properties = {
                                        moduleItemId: item.get('id')
                                    };
                                    Daedalus.track(event_name,properties);
                                } else {
                                    event_name = 'deleted ' + item.get('module_id');
                                    properties = {
                                        moduleItemId: item.get('id')
                                    };
                                    Daedalus.track(event_name,properties);
                                    Daedalus.increment('numModulesDeleted');
                                }

                                return {
                                    'id': item.get('id'),
                                    'type': item.get('item_type')
                                };
                            }
                        );

                        publisher.send({
                            'module': this.id,
                            'command': 'delete_items',
                            'args': {'items': items},
                            success: function(data, args) {
                                var patch = args.patch;
                                if (patch) {
                                    this.get('tree_data').patch(patch);
                                }
                                panel.remove();
                            }.bind(this)
                        });
                    }, this)
                }
            });
        },

        get_control_tree: function() {
            return publisher.get_tree( this.id, this.id + '_control_div' );
        },

        update_data: function( tree ) {
            var tree_data = tree.get('data');
            this.update_data_tree(tree_data);
            this.update_data_mi(tree_data);
            this.link_tree_items_to_module_items();
            this.update_tree_module_ids();
        },

        link_tree_items_to_module_items: function() {
            /*
             * loops through each TreeModuleItem instance in the module's tree and checks if the item has been
             * linked with its corresponding module item (i.e. the tree item's module_item value has been set)
             * If not, it finds the corresponding module item and links it
             */
            this.get('tree').nested_each(function(item) {
                if( (item instanceof TreeModuleItem) && !item.get('module_item') ) {
                    var module_item = this.get('items').find(function (mi) {
                        return mi.get('id') === item.id;
                    });
                    item.set({ 'module_item': module_item });
                }
            }.bind(this));
        },

        update_data_tree: function( data_str ) {
            //the tree data is not updated on every SO update, so check the data against a local
            //cache to make sure that tree data has been modified

            if( data_str && (data_str !== this.get('previous_tree_data')) ) {
                /*if( window.deserialize_once ) { return false; } else { window.deserialize_once = true; }*/

                var data = data_str ? JSON.parse(data_str) : undefined;
                this.get('tree').deserialize( data );

                this.set({'previous_tree_data': data_str});
            }
        },

        update_tree_module_ids: function () {
            var module_id = this.get('id');
            this.get('tree').nested_each(function (item) {
                if (item instanceof Folder) {
                    item.set({module_id: module_id});
                }
            });
        },

        FOLDER_TYPES: ['module_item_folder', 'folder'],

        extract_module_items: function(folder) {
            var active_homework_items = 0;
            var items = {};
            _.each(folder.children, function(child) {
                if (child.item_type === 'module_item') {
                    items[child.id] = child;
                    // Count the number of homework items for the module
                    if (child.status === 'active') {
                        active_homework_items++;
                    }
                } else if (child.item_type === 'module_item_folder') {
                    _.extend(items, this.extract_module_items(child));
                }
            }.bind(this));

            // Set the number of homework items found for the module
            this.set({
                active_homework_items: active_homework_items
            });

            return items;
        },

        update_data_mi: function (tree_data_str) {
            //loops through supported modules and ensures their moduleitems are up to date
            //if a new module item is found, add it
            //if a module item is no longer present, remove it
            //if a module item changes status, update it

            if( !tree_data_str ) {
                return false;
            }

            var tree_data = JSON.parse(tree_data_str);
            var items = this.extract_module_items(tree_data);
            this.update_tree_module_ids();

            // If we're a student, we want to check if there are other modules with homework items open
            // to decide what empty state/placeholder copy to use
            if (window.user.get('role') === 'student') {
                var modules_with_homework = ['question', 'discussion', 'pages', 'demo'];
                var homework_is_active_somewhere = false;

                // Loop through modules checking the # of active homework module items
                for (var index = 0; index < modules_with_homework.length; index++) {
                    if (require('Modules').get_module(modules_with_homework[index]).get('active_homework_items') !== 0) {
                        homework_is_active_somewhere = true;
                        break;
                    }
                }

                if (!homework_is_active_somewhere) {
                    $('.placeholder').html(_.template(PlaceHolderStudentTemplate, {}));
                } else {
                    $('.placeholder').html(_.template(PlaceHolderStudentTemplate, {}) +
                                           _.template(PlaceHolderStudentHomeworkPresentTemplate, {}));
                }
            }

            //find all module items that are not in the items dictionary and delete them
            var items_to_delete = this.get('items').filter(function(item) { return !items[item.get('id')]; });
            _.each(items_to_delete, function(item) {
                item.trigger('closed');
                this.get('items').remove(item);
                item.trigger('remove');
            }, this);

            var statuses = [];
            // loop through present items, adding them if they do not exist
            // statuses are set afterwards
            _.each(items, function(item_data, item_id) {
                var status = item_data.status === undefined ? undefined : item_data.status.toLowerCase();
                var scheduled = item_data.scheduled;
                var status_group = item_data.status_group;
                var item, uri;
                var module_id = item_data.module_id || this.get('id');
                var ModelClass = require('Modules').get_module(module_id).get('model');
                if (ModelClass.prototype.urlRoot) {
                    uri = ModelClass.prototype.urlRoot + item_id + '/';
                    item = this.get('items').get(uri);
                } else {
                    item = this.get('items').get(item_id);
                }

                if (item) {
                    item.set({
                        scheduled: scheduled,
                        status_group: status_group,
                        title: item_data.display_name,
                        last_activated_at: item_data.last_activated_at
                    });
                    statuses.push({item: item, status: status});
                } else {
                    var data = {
                        id: item_id,
                        title: item_data.display_name,
                        scheduled: scheduled,
                        status_group: status_group,
                        module: item_data.module_id,
                        last_activated_at: item_data.last_activated_at
                    };
                    var module_item = new ModelClass(data);
                    if (uri) {
                        module_item.set({
                            resource_uri: uri
                        });
                    }

                    this.get('items').add(module_item);
                    statuses.push({item: module_item, status: status});
                }

            }, this);

            // update all the statuses after the other attributes have all been set
            // this helps keep items in the correct activation order
            _.each(statuses, function (new_status) {
                new_status.item.set({status: new_status.status});
            });
        },

        confirm_status_group_override: function (items, status) {
            var panel = panels.add({
                id: 'confirm_destroy_group',
                title: '',
                module: this.id,
                body: confirm_destroy_group_html,
                layout: layouts.get('dialog'),
                width: 600,
                footer_buttons: {
                    'Cancel': 'remove',
                    'Yes, change status now': function () {
                        panel.remove();
                        this.save_item_statuses(items, status, true);
                    }.bind(this)
                }
            });
        },

        save_item_statuses: function(items, status, override, bulk_update) {
            var BULK_UPDATE_DISABLED_MODULES = ['tournament', 'feedback'];
            var any_item_in_custom_status = _.reduce(items, function (memo, item) {
                return item.get('status_group') || memo;
            }, false);
            if (any_item_in_custom_status && !override) {
                this.confirm_status_group_override(items, status);
                return;
            }

            var _items;
            if (status === 'active_visible') {
                // check if there are too many items
                var active_filter = function (item) {
                    return item.get('status') === 'active_visible';
                };
                var active_items = _.filter(require('Modules').get_module_items(), active_filter);
                var total = _.union(active_items, items);
                if (_.isUndefined(this.MAX_ACTIVE_VISIBLE_ITEMS)) {
                    this.MAX_ACTIVE_VISIBLE_ITEMS = window.course.get(
                        'course_data').get('settings').get('max_visible_items');
                }
                if (total.length > this.MAX_ACTIVE_VISIBLE_ITEMS) {
                    window.alert('You are trying to ask ' + total.length +
                                 ' items at once. No more than ' +
                                 this.MAX_ACTIVE_VISIBLE_ITEMS +
                                 ' items may be in "Ask" mode at once.');
                    return;
                }

                if (bulk_update) {
                    // Remove from bulk updating
                    _items = _(items);
                    items = _items.difference(_items.filter(function (item) {
                        var module_id = item.get('module');
                        if (!module_id) {
                            module_id = item.get('module_id');
                        }
                        return _.contains(
                            BULK_UPDATE_DISABLED_MODULES, module_id
                        );
                    }));
                } else {
                    var played_tournaments = _.filter(items, function (item) {
                        return item.get('module') === 'tournament' && item.get('has_been_played');
                    });
                    if (played_tournaments.length > 0) {
                        alert("This tournament has already been run. Please create a new tournament.");
                    }
                }
            }

            var file_module = require('Modules').get_module('files');
            if (
                bulk_update &&
                _.contains(file_module.PRESENTATION_STATUSES, status)
            ) {
                var num_files_over_limit = file_module.check_open_file_limit(
                    items, status);
                if (num_files_over_limit) {
                    // Remove new files from being bulk updated
                    _items = _(items);
                    items = _items.difference(_items.filter(function (item) {
                        return item.get('module') === 'files';
                    }));
                }
            }

            //mark status as being in-process of saving
            _.each(items, function (item) {
                item.set({saving_status: true});
            });

            var item_ids = _.map(items, function(item) { return item.get('id'); });

            publisher.send({
                module: this.id,
                command: 'set_module_item_status',
                args: {
                    items: item_ids,
                    status: status,
                    bulk_update: bulk_update || false
                },
                failure: function() {
                    publisher.footer_message('There was an problem setting the item\'s status. Please try again', 'red' ); //inform the user
                },
                success: function(data, args) {
                    _.each(args.patches, function (patch, module_id) {
                        var tree_data = require('Modules').get_module(module_id).get('tree_data');
                        // if the unified tree is active, we might get a tree
                        // update for a tree that's not in use. Check it exists
                        if (tree_data) {
                            tree_data.patch(patch);
                        }
                    });
                    _.each(items, function (item) {
                        item.set({'saving_status': false});
                        //want to update sms keys if current sms key is null
                        if(item.get('sms_code') === null && data.sms_keys && data.sms_keys[item.get('id')]){
                            item.set('sms_code', data.sms_keys[item.get('id')]);
                        }
                    });
                }.bind(this),
                timeout_handling: publisher.TOH.retry
            });
        },
        monitor_answered_items: function () {
            if (Browser.is_web() && window.user.is_student()) {
                new UnansweredItems({module: this.id});
            }
        }
    });

    Cocktail.mixin(Module, FolderInsertMixin);
    return Module;
});
