/* global _, user, Backbone, publisher, Daedalus,
    panels, Houdini */
define([
    'views/ModuleItemContent',
    'models/ModuleItemTimer',
    'layouts/edumacation/LayoutCollection',
    'lobby/PresentationTool',
    'util/Browser',
    'course/NavUtils',
    'models/course/module_item/Activation',
    'util/fullscreen',
    'modules/FolderInsertMixin',
    'backbone.cocktail'
], function (
    ModuleItemContentView,
    ModuleItemTimer,
    layouts,
    PresentationTool,
    Browser,
    NavUtils,
    ModuleItemActivation,
    Fullscreen,
    FolderInsertMixin,
    Cocktail
) {
    'use strict';
    var ModuleItem = Backbone.Model.extend({
        view_type: ModuleItemContentView,
        defaults: {
            current_report: undefined,
            current_session: 'All Data',
            module: undefined, // these are overwritten by ModuleItem subclasses
            is_magnified: false, // stores whether item is magnified or not
            module_color: undefined,
            status_report_div: 'status_bar',
            show_answer: false,
            opened: false,
            reports: {}
        },
        get_id: function() {
            var id = /[0-9].*/.exec(this.get('id'));
            if (id !== null) {
                return '' + parseInt(id, 10);
            }
        },
        module: function () {
            return require('Modules').get_module(this.get('module'));
        },
        BUTTONS: {
            CLOSE: {label: 'Close'},
            SUBMIT: {label: 'Submit'},
            DONE: {label: 'Done'},
            DOWNLOAD: {label: 'Download', bt_class: 'pull-left'},
            DISABLE_SUBMISSIONS: {label: 'Disable Submissions', bt_class: 'pull-left'},
            ENABLE_SUBMISSIONS: {label: 'Enable Submissions', bt_class: 'pull-left'},
            MAGNIFY: {label: 'Magnify', bt_class: 'pull-left'},
            DEMAGNIFY: {label: 'Demagnify', bt_class: 'pull-left'},
            SHOW_ANSWER: {label: 'Show Answer', bt_class: 'pull-left'},
            HIDE_ANSWER: {label: 'Hide Answer', bt_class: 'pull-left'},
            CLOSE_AND_ASK_NEXT: {label: 'Close & Ask Next'}
        },

        button_list: {
            teacher: {},
            student: {}
        },
        set_buttons: function () {
            var view = this.get('view');
            if (view) {
                this.set_panel_buttons(view.panel);
            }
        },
        set_panel_buttons: function (panel) {
            /**
             * responsible for getting footer buttons and assigning their callbacks
             * by default, uses the 'button_list' and 'button_callbacks' variables
             * to determine which buttons to show
             * @method set_panel_buttons
             */

            // get a list of buttons from the 'button_list' property; this may
            // be either a dictionary of lists (e.g. {"teacher":"active":[]}
            // or a function that returns a list of buttons

            var button_list = [];
            if (_.isFunction(this.button_list)) {
                button_list = this.button_list();
            } else {
                button_list = this.button_list[window.user.get('role')][
                    this.get('status')];
            }

            // set list of buttons into a dictionary, which uses the functions
            // in 'button_callbacks' as the new_button callbacks
            var footer_buttons = {};
            var that = this;
            _.each(button_list, function (button_object) {
                var button_label = button_object.label;
                var new_button = that.button_callbacks[button_label];

                if (_.isFunction(new_button)) {
                    new_button = function () {
                        that.button_callbacks[button_label](that);
                    };
                } else if (_.isObject(new_button) && new_button.callback) {
                    new_button = _.clone(new_button);
                    that._set_button_classes(new_button, button_object);
                    var old_callback = new_button.callback;
                    new_button = {
                        icon: new_button.icon,
                        bt_class: new_button.bt_class,
                        callback: function () {
                            old_callback(that);
                        }
                    };
                }
                footer_buttons[button_label] = new_button;
            });

            if (panel) {
                panel.set({
                    footer_buttons: footer_buttons
                });
            }
            if (Fullscreen.is_fullscreen()) {
                $('.footer_button_magnify span').text('Demagnify');
            } else {
                $('.footer_button_magnify span').text('Magnify');
            }

            return footer_buttons;
        },

        _set_button_classes: function (new_button, button_object) {
            if (window.user.is_teacher()) {
                if (!_.isUndefined(button_object.bt_class)) {
                    if (_.isUndefined(new_button.bt_class)) {
                        new_button.bt_class = button_object.bt_class;
                    } else {
                        new_button.bt_class += ' ' + button_object.bt_class;
                    }
                }
            }
        },

        scroll_into_view: function () {
            /**
             * Scrolls the DOM element of this module item into view
             * @method scroll_into_view
             */
            var id;
            if (this.get('module') === 'feedback') {
                // Feedback module views do not actually have a module item id
                // as their element_id.
                id = 'instructor_feedback';
            }
            else {
                id = this.get('id');
            }

            // TODO The element_id attribute is set by the Panel. We should
            // not be coupling it with the ModuleItem model code so closely.
            var module_item_div = $(
                'div[element_id=' + id + ']');

            // TODO We shouldn't be accessing the main container directly like
            // this.
            var course_wrapper = $('#course_wrapper');
            course_wrapper.scrollTop(
                course_wrapper.scrollTop() +
                module_item_div.offset().top);
        },
        // The button_callbacks object contains a set of functions that will be
        // triggered on the callback to buttons with a matching key. The
        // ModuleItem object contains several new_button callbacks that are shared
        // accross many module items
        button_callbacks: {
            'Magnify': {
                icon: 'magnify',
                callback: function(mi) {
                    var event_name = mi.get('module');
                    var properties = {
                        moduleItemId: mi.get('id'),
                        moduleItemType: mi.get('type')
                    };
                    var fullscreen = Fullscreen.is_fullscreen();

                    if (fullscreen) {
                        event_name += ' demagnified';
                        Daedalus.track(event_name, properties);
                        Daedalus.increment('numDemagnify');
                    } else {
                        event_name += ' magnified';
                        Daedalus.track(event_name, properties);
                        Daedalus.increment('numMagnify');
                    }

                    Fullscreen.toggle_fullscreen();
                }
            },
            'Done': function (mi) {
                mi.trigger('closed');
            },
            'Close': {
                icon: 'delete',
                bt_class: 'danger',
                callback: function(mi) {
                    if (window.user.is_student()) {
                        mi.trigger('closed');
                    } else {
                        var layout = mi.get('view').panel.get('layout');

                        if (layout.panels.length === 1) {
                            Fullscreen.exit_fullscreen();

                            if (Browser.is_presentation_tool()) {
                                PresentationTool.set_page('#control_page');
                             }
                        }

                        mi.save_status('inactive');
                        mi.set({is_magnified: false});
                        Daedalus.track_mi_status(mi, 'deactivated');
                    }
                }
            },
            'Close & Ask Next': {
                callback: function (mi) {
                    var mi_id = parseInt(mi.get('id'), 10);
                    ModuleItemActivation.update_field(
                        'previous_module_item_id',
                        mi_id,
                        function (module_item_activation) {
                            if (
                                module_item_activation.get(
                                    'active_module_item_id') === null
                            ) {
                                Fullscreen.exit_fullscreen();

                                if (Browser.is_presentation_tool()) {
                                    PresentationTool.set_page('#control_page');
                                }
                            }
                        }
                    );
                }
            },
            'Disable Submissions': {
                icon: 'lock',
                bt_class: 'amber',
                callback: function (mi) {
                    mi.save_status('visible');
                    var event_name = 'disabled ' + mi.get('module') + ' submissions';
                    var properties = {
                        moduleItemId: mi.get('id'),
                        questionType: mi.get('type')
                    };
                    Daedalus.track(event_name, properties);
                }
            },
            'Enable Submissions': {
                icon: 'ok',
                bt_class: 'affirmative',
                callback: function (mi) {
                    mi.save_status('active_visible');
                    var event_name = 'enabled ' + mi.get('module') + ' submissions';
                    var properties = {
                        moduleItemId: mi.get('id'),
                        questionType: mi.get('type')
                    };
                    Daedalus.track(event_name, properties);
                }
            }
        },
        initialize: function () {
            /**
             * The ModuleItem model class.
             * @class ModuleItem
             * @constructor
             */
            this.on('change:reports add:reports remove:reports', function () {
                // when the report dictionary is changed, we run it through
                // 'update_report_data' with a blank existing report dictionary
                // this will cause 'report_added' and 'report_updated' events to
                // be triggered
                var new_data = $.extend({}, this.get('reports'));
                this.update_report_data(new_data);
            });

            if (window.user.is_teacher()) {
                //----------- Timer -----------
                //setup timer elements
                var timer = new ModuleItemTimer();
                this.set({timer: timer});
                Houdini.on('timer_pause', function (data) {
                    if (data.id === this.get('id')) {
                        timer.silent = true;
                        timer.pause();
                        timer._timer.set(data.seconds);
                        timer.silent = false;
                    }
                }.bind(this));
                Houdini.on('timer_play', function (data) {
                    if (data.id === this.get('id')) {
                        timer.silent = true;
                        timer.set(data.seconds);
                        timer.play();
                        timer.silent = false;
                    }
                }.bind(this));

                //determine if the timer should be started or stopped

                //if the `is_timed` or `status` attribues are changed, re-decide if the timer should be started or stopped
                this.on('change:is_timed', this.start_timer_if_required, this);
                this.on('change:status', this.start_timer_if_required, this);

                //if the status is ever changed from active_visible, pause the timer
                this.on('change:status', function () {
                    if (this.get('status') !== 'active_visible') {
                        timer.pause();
                        $('#controls', '#' + this.get('id') + '_details').hide();
                    }
                }, this);

                //whenever the timer runs out, set the module item's status to visible
                timer.on('finish', function () {
                    this.save_status('visible');
                }, this);

                this.listenTo(timer, 'change:running', function () {
                    var course_channel = 'course.key__course_course__' +
                        window.course.get('course_data').get('id');
                    if (timer.silent) {
                        return;
                    }
                    var data = {
                        id: this.get('id'),
                        seconds: timer._timer._secondsRemaining
                    };
                    var eventName = timer._timer.is_running() ? 'timer_play' : 'timer_pause';
                    Houdini.broadcast(course_channel, eventName, data);
                });
            }

            //bind for tree action menu events
            this.on('action', function (action) {
                if (action === 'Duplicate') {
                    this.duplicate_dialog();
                } else if (action === 'Edit') {
                    //check if item is active; if so, do not allow user to proceed
                    if (this.is_visible()) {
                        var item = this;
                        var error_panel = panels.add({
                            'id': 'cannot_edit',
                            'layout': layouts.get('dialog'),
                            'title': 'Cannot edit item',
                            'body': 'Please deactivate the item before editing',
                            'footer_buttons': {
                                'Cancel': 'remove',
                                'Deactivate': function () {
                                    //update deactivate panel

                                    error_panel.set({
                                        'footer_buttons': { 'Cancel': 'remove' }
                                    });
                                    error_panel.loading();

                                    item.on('change:status', _.once(function () {
                                        error_panel.remove();
                                        item.edit_dialog();
                                    }));
                                    item.save_status('inactive');
                                }
                            }
                        });
                    } else {
                        this.edit_dialog();
                    }
                } else if (action === 'Schedule') {
                    // schedule 1 question dialog
                    var question_ids = [this.get_id()];
                    this.module().schedule_questions(question_ids);
                } else if (action === 'students') {
                    this.custom_status();
                }
            });
            this.on('opened', this.opened, this);

            // Determine if the item has opend or closed based on the status.
            // If it is opened, the item gets an 'opened' trigger, if it is
            // closed, it gets a 'closed' trigger.
            this.on('change:status', this.setup_panel, this);

            if (!Browser.is_sandbox_app) {
                require('Modules').get_module(this.get('module')).on('change:active', this.setup_panel, this);
            }
        },
        custom_status: function () {
            require('Modules').get_module('course').initialize_status_group_dialog([this]);
        },
        opened: function () {
            this.setup_panel(true);
        },
        setup_panel: function (force, context) {
            // in this function, we want to determine if it is necessary to create
            // or destroy the view. If the visibility of the item changes, the
            // view must be updated.

            if (!window.panels) {
                // HACK; Only create a view if panels is defined globally. This is
                // a hack to let us use ModuleItem in the new Gradebook SPA. Ideally
                // models should not be aware of views anyway.
                return;
            }

            var panel = panels.get(this.get('id'));
            var view = this.get('view');
            var previously_activated = (context === true);

            if (this.is_visible() || force === true) {
                if (_.isUndefined(view) && _.isUndefined(panel)) {
                    view = new this.view_type({model: this});
                    this.set({view: view});
                    view.opened(previously_activated);
                }
            } else {
                if (view && view.closed) {
                    view.closed();
                }
            }
        },

        start_timer_if_required: function () {
            var show_timer = true;
            if (window.user.get('username') === 'admin') { show_timer = false; } //masive hack to prevent timer from showing on admin side
            if (window.user.get('role') !== 'teacher') { show_timer = false; } //masive hack to prevent timer from showing on admin side

            var is_timed = this.get('is_timed');
            if (_.isUndefined(is_timed) && this.get('profile')) {
                is_timed = this.get('profile').is_timed;
            }
            if (!is_timed) { show_timer = false; }
            if (this.get('status') !== 'active_visible') { show_timer = false; }

            if (show_timer) {
                var limit = this.get('time_limit');
                if (_.isUndefined(limit) && this.get('profile')) {
                    limit = this.get('profile').time_limit;
                }
                this.get('timer').start(limit);
            } else {
                this.get('timer').reset();
            }
        },

        edit_dialog: function () {
            //rest to be subclassed...
        },

        get_folder: function (tree, item_id, current_folder) {
            /**
            * Get the id of the folder that contains the given item
            * @method get_folder
            * @param  {Object} tree           Object that represents folder tree
            * @param  {String} item_id        Unique item id to search
            * @param  {String} current_folder Current folder id
            * @return {String}                Folder id the item was found or null if item not found
            */
            if (tree.children) {
                current_folder = tree.id;
                // interate through children
                for (var i = tree.children.length - 1; i >= 0; i--) {
                    // recurse into tree and keep looking
                    var found_in_folder = this.get_folder(tree.children[i], item_id, current_folder);
                    if(found_in_folder !== null) {
                        return found_in_folder;
                    }
                }
                return null;
            } else {
                if (tree.id === item_id) {
                    // found the item!
                    return current_folder;
                } else {
                    // not found in that folder
                    return null;
                }
            }
        },

        duplicate_dialog: function () {
            var panel = panels.add({
                id: 'duplicate_item',
                module: this.module().id,
                layout: layouts.get('dialog'),
                title: 'Duplicate',
                body: '<p>What would you like to call the new item?</p><div class="form"></div>',
                footer_buttons: {
                    'Close': 'remove',
                    'Next': function () {
                        if (form.is_valid()) {
                            var tree;
                            if (require('Modules').get_module('unitree').get('active')) {
                                tree = JSON.parse(require('Modules').get_module('unitree').get('tree_data').get('data'));
                            } else {
                                tree = JSON.parse(this.module().get('tree_data').get('data'));
                            }
                            var folder_id = this.get_folder(tree, this.get('id'), '');
                            var display_name = form.get('name').value();
                            publisher.post('publisher', 'duplicate_item', '', {
                                item_id: this.get('id'),
                                display_name: display_name,
                                folder_id: folder_id
                            }, function (model, response, options) {
                                var tree_data;
                                if (require('Modules').get_module('unitree').get('active')) {
                                    tree_data = require('Modules').get_module('unitree').get('tree_data');
                                } else {
                                    tree_data = this.module().get('tree_data');
                                }
                                tree_data.patch(response.patch).done(function () {
                                    require('Modules').get_module_item(
                                        response.item_id.toString()).edit_dialog();
                                });
                            }.bind(this));
                            panel.remove();
                        }
                    }.bind(this)
                }
            });

            var form = panel.$b('.form').composer();
            form.addValidation('not_duplicate', function (val) {
                var duplicate_item_name = this.module().get('items').detect(function (item) {
                    return item.get('title') === val;
                });
                return duplicate_item_name ? 'Another question matches this name. Please enter a different name' : true;
            }.bind(this));
            form.add([{
                id: 'name',
                value: this.get('title') + ' Copy',
                type: 'text',
                validation: ['not_empty', 'not_duplicate'],
                initialize: function () {
                    // bind enter key
                    $(this.get('el')).find('input').keydown(function (e) {
                        if (e.keyCode === 13) {
                            panel.buttons_trigger('Next');
                        }
                    });
                }
            }]);
        },

        get_required_attributes: function (callback_fn, proxy) {
            publisher.send({
                module: this.get('module'),
                command: 'get_mi',
                args: {id: this.id},
                success: function (callback_fn, data, args) {
                    this.set(args.data);
                    if (callback_fn) {
                        callback_fn.call(proxy);
                    }
                    if (this.get('panel')) {
                        this.get('panel').trigger('redo_magnify');
                    }
                }.bind(this, callback_fn),
                timeout_handling: publisher.TOH.retry
            });
        },

        get_required_attributes_if_not_present: function (attribute_list, callback_fn) {
            // takes a list of attributes and does a call to server to get them
            // if they are not already stored in this instance
            // returns true if they are stored, false if they are not and
            // server call is made can take optional callback_fn, which is
            // executed either immediately (if no server call made) or after
            // server call is returned determine if any content needs to be
            // pulled from the server
            var item_values = this.toJSON();

            // similar to _.keys(item_values), except it makes sure the item's value is not undefined
            var item_keys = [];
            _.each(item_values, function (value, item_key) {
                if (!_.isEmpty(value)) {
                    item_keys.push(item_key);
                }
            }, this);

            if (_.intersection(attribute_list, item_keys).length !== attribute_list.length) {
                this.get_required_attributes( callback_fn );
                return false;
            } else {
                if (callback_fn) {
                    callback_fn();
                }

                return true;
            }
        },

        is_visible: function () {
            var status = this.get('status');
            var module = require('Modules').get_module(this.get('module'));
            if (
                (status === 'visible' || status === 'active_visible') &&
                module && module.get('active')
            ) {
                return true;
            } else {
                return false;
            }
        },

        toggle_active: function () {
            if (this.is_active()) {
                this.save_status('visible');
            } else {
                this.save_status('active_visible');
            }
        },

        is_active: function () {
            var status = this.get('status');
            return (status === 'active' || status === 'active_visible') ? true : false;
        },

        bind_body_el: function () {
            //SHOULD BE OVERWRITTEN BY SUBCLASSES
        },

        bind_set: function (attr, fn) {
            //attr can be single value or array
            if (!_.isArray(attr)) { attr = [attr]; }
            var trigger_now = false;

            _.each(attr, function (attr_name) {
                this.on('change:' + attr_name, fn);
                if (this.get(attr_name)) { trigger_now = true; }
            }, this);

            //run the bound event now if any of the elements are present
            if (trigger_now) {
                var onetimeevent_name = Math.uuid();
                this.on(onetimeevent_name, fn);
                this.trigger(onetimeevent_name);
            }
        },


        save_status: function (status) {
            require('Modules').get_module('course').save_item_statuses([this], status);
        },

        //pass in a report key and receive a dictionary of {username:value} results
        //for the current session (can be overridden with custom session)
        report_data: function (report_key, session) {
            session = session || this.get('current_session');
            return this.get('reports')[report_key].data[session];
        }
    });

    Cocktail.mixin(ModuleItem, FolderInsertMixin);
    return ModuleItem;
});
