/* global
    _, Modernizr, Houdini, publisher, panels, Daedalus, mpmetrics, course */
define([
    'modules/Module',
    'publisher/MissingChromeFrameView',
    'publisher/UnsupportedBrowserView',
    'controllers/Notifications',
    'layouts/edumacation/LayoutCollection',
    'models/CourseData',
    'text!templates/publisher/toolbar_filter_form.html',
    'text!templates/publisher/footer_message.html',
    'util/Browser'
], function (
    Module,
    MissingChromeFrameView,
    UnsupportedBrowserView,
    NotificationsController,
    layouts,
    CourseData,
    html,
    footer_html,
    Browser
) {
    'use strict';
    var create_command_callback_wrapper = function (callback_function, error_callback) {
        return function (data, args) {
            if (!_.isUndefined(args.error_msg)) { //args.error_msg defines whether there is an error or not
                if (!_.isUndefined(error_callback)) {
                    error_callback(data, args);
                } else {
                    // standard error callback
                    var msg = 'An error has occured: ' + args.error_msg;
                    window.publisher.footer_message(msg, 'red');
                }
            } else {
                if (!_.isUndefined(callback_function)) {
                    callback_function(data, args);
                }
            }
        };
    };

    var Publisher = Module.extend({
        current_form: undefined,
        defaults: _.extend({}, Module.prototype.defaults, {
            id: 'publisher',
            hidden_module: true,
            connection_status: 'disconnected',
            sending: false
        }),

        connected: false, //tracks the overall status of the connection to server; updated via 'update_connection_status'
        status_changed_callback: undefined, //function () { $("body").trigger("connection"); };
        status: 'disconnected', //updated automatically - can be: sending, connected_streaming, connected, connecting, disconnected
        pause_level: 0,
        publisher_url: '/epublisher/',
        commands_to_send: {}, //dictionary of commands that have not yet been sent or sent AND not responded to by the server yet; key is command UUID
        callbacks: {}, //dictionary of uuids and the callbacks assigned to them, if any
        server_response_count: 0, //tracks the number of successful responses from the server; used, among other things, for positioning
        last_server_communication_unix_time: 0,
        num_sequential_command_timeouts: 0, //incremented when a server request times out, reset when a response is received for a server request
        TOH: {
            'retry' : 'retry', //will attempt to re-send message to server if timed out
            'fail' : 'fail', //will silently remove the command uuid if timed out, preventing response from being run
            'error' : 'error' //will trigger the callback's error function, sending it an error message
        },

        connection_type: 'poll', //can be 'poll' or 'socket'
        command_timeout_seconds: 20,

        templates: {}, //dictionary holding all the html templates for all the modules
        tabs_dict: {}, //dictionary for holding references to all tab objects from Jquery UI
        form_dict: {}, //dictionary used to hold reference to forms inside of panels
        initialize: function () {
            Module.prototype.initialize.call(this);
            window.publisher = this;
            Houdini.on('version_check', function (data) {
                var new_version = data.new_version,
                    current_version = window.site_data.settings.VERSION;
                if (new_version > current_version) {
                    // prompt the user to refresh
                    var dialog_args = {
                        'width':350,
                        'title':'Refresh Required',
                        'color':'blue',
                        'minimize':false,
                        'footer_style':'max',
                        'buttons':{
                            'Refresh': function () {
                                window.location.reload();
                            }
                        }
                    };

                    publisher.create_dialog_box_command('adminface',
                        'site_update',
                        'dialog',
                        'site_update',
                        'There has been a critical site update. You must refresh the page to continue using Top Hat Monocle.',
                        '0',
                        dialog_args
                    );
                }
            });
            Houdini.on('registered', function () {
                this.set_connection_status('socket');
            }, this);
            Houdini.on('disconnected', function () {
                this.set_connection_status('disconnected');
            }, this);
            Houdini.on('heartbeat', function () {
                this.socket_heartbeat();
            }, this);
            Houdini.on('poll', function () {
                if (this.connection_type !== 'socket') {
                    this.set_connection_status('poll');
                }
            }, this);
        },
        check_requirements: function () {
            var required_attributes, optional_attributes, failed, panel, view;

            required_attributes = ['fontface', 'canvas', 'svg'];

            // todo: something with optional attributes?
            optional_attributes = ['websockets', 'input.placeholder'];

            failed = _.filter(required_attributes, function (attr) {
                return !Modernizr[attr];
            });

            if (window.missing_chromeframe === true) {
                _.defer(function () {
                    // defer because old browsers are glitchy
                    panel = window.panels.add({
                        id: 'missing_chromeframe',
                        width:640,
                        layout: layouts.get('dialog'),
                        title: 'Unsupported browser',
                        footer_buttons: {
                            'I\'ll risk it': {
                                bt_class: 'affirmative',
                                callback: 'remove'
                            }
                        }
                    });
                    view = new MissingChromeFrameView({
                        failed: failed,
                        panel: panel
                    });
                    panel.set({
                        body: view.el
                    });
                    view.render();
                });
                // don't complain about IE's lack of other features yet
                return;
            }

            if (failed.length) {
                _.defer(function () {
                    // defer because old browsers are glitchy
                    panel = window.panels.add({
                        id: 'unsupported_browser',
                        width:640,
                        layout: layouts.get('dialog'),
                        title: 'Unsupported browser',
                        footer_buttons: {
                            'I\'ll risk it': {
                                bt_class: 'affirmative',
                                callback: 'remove'
                            }
                        }
                    });
                    view = new UnsupportedBrowserView({
                        failed: failed,
                        panel: panel
                    });
                    panel.set({
                        body: view.el
                    });
                    view.render();
                });
            }
        },
        post: function (module_id, command_id, data, args, callback, timeout_handling, retry_count) {
            this.send({
                module: module_id,
                command: command_id,
                data: data,
                args: args,
                success: callback,
                timeout_handling: timeout_handling,
                retry_count: retry_count
            });
        },
        send: function (options) {
            var defaults = {
                module: '',
                command: '',
                args: '',
                success: function () {},
                // The failure callback is called if the server responds with
                // an error message.
                failure: null,
                // The fatal callback is called if the AJAX request fails.
                fatal: null,
                timeout_handling: this.TOH.fail,
                retries: 3,
                uuid: Math.uuid(),
                data: ''
            };
            options = _.extend({}, defaults, options);

            // set up command's callback function
            var callback_fn = options.success;
            if (options.failure !== null) {
                callback_fn = create_command_callback_wrapper(
                    options.success, options.failure);
            }
            this.callbacks[options.uuid] = callback_fn;

            // add event to commands_to_send array
            var event = new this.EventToSend(options.module, options.command, options.uuid, options.data, options.args);
            this.commands_to_send[options.uuid] = new this.EventRecord(
                event, false, undefined,
                options.timeout_handling, options.retries, options.fatal);

            this._send();
        },
        pause: function () {
            //pausing is temporarily a 1-level thing (on, off); by uncommenting this, we can have layers of pause/play, but that might
            //cause a lot of ugly bugs
            this.pause_level++;
        //    this.pause_level = 1;
        },
        play: function (ignore_pause_level) {
            if (this.pause_level > 0) {
                this.pause_level--;
            }
            if (ignore_pause_level) {
                this.pause_level = 0;
            }
            this._send();
        },
        _send: function () {
            //will attempt to send all queued messages
            //this is an internal function - it should only be caused by publisher.play() or publisher.send()
            if (!this.has_unsent_commands()) {
                return true;
            }
            if (this.pause_level > 0) {
                return false;
            }
            this.pause_level = 0;

            //package data so that it is ready to be sent in JSON format over the wire to the server
            var event_json = [];
            _.each(this.commands_to_send, function (event_record) {
                if (event_record.is_sent ) {
                    return;
                }

                event_json.push(event_record.event_to_send);
                event_record.is_sent = true;
                event_record.send_time = (new Date()).getTime()/1000.0; //strictly speaking not a fully accurate timestamp
            });

            var data = JSON.stringify(event_json);

            $.post(this.publisher_url + '?module='+event_json[0].module_id+'&command='+event_json[0].command_id, {data : data}, function (return_data) {
                publisher.server_callback(return_data);
                publisher.update_connection_status();
            }).fail(function (jq_xhr, text_status, error_thrown) {
                _.each(this.commands_to_send, function (event_record) {
                    if (event_record.fatal_callback) {
                        event_record.fatal_callback(
                            jq_xhr, text_status, error_thrown);
                    }
                });
            }.bind(this));
            return true;
        },
        has_unsent_commands: function () {
            return _.detect(this.commands_to_send, function (command) { return command.is_sent === false; }) ? true : false;
        },
        EventRecord: function (
            event_to_send, is_sent, send_time,
            timeout_handling, retry_count, fatal_callback) {
            this.event_to_send = event_to_send;
            this.is_sent = is_sent;
            this.send_time = send_time;
            this.timeout_handling = timeout_handling;
            this.retry_count = retry_count;
            this.fatal_callback = fatal_callback;
        },
        EventToSend: function (module_id, command_id, command_uuid, data, args) {
            this.module_id = module_id;
            this.command_id = command_id;
            this.command_uuid = command_uuid;
            this.timestamp = (new Date()).getTime()/1000.0;
            this.data = data;
            this.args = args;
        },
        server_callback: function (event_list) {

            if (typeof event_list === 'string') {
                event_list = $.parseJSON(event_list);
            }

            if (!event_list) {
                return false;
            }

            this.server_response_count += 1;
            this.last_server_communication_unix_time = (new Date()).getTime();
            this.num_sequential_command_timeouts = 0;

            var func_list = [];
            _.each(event_list, function (e) {
                //create a closure to pass into schedule (below) as a no arg function
                var func = function ( event, server_response_count ) {
                    var f = function () {

                        if (event.command_id === 'user_not_authenticated') {
                            Daedalus.track('user_not_authenticated publisher callback');
                            // Student mobile really doesn't need any publisher commands.
                            if (Browser.is_web() || Browser.is_presentation_tool()) {
                                panels.add({
                                    module: 'course',
                                    layout: layouts.get('dialog'),
                                    title: 'Logged out',
                                    body: '<p>You have been logged out of the system. Click "Ok" to re-enter.</p>',
                                    footer_buttons: {
                                        Ok: function () { window.location.reload(); }
                                    }
                                });
                            }
                        } else if (!this.is_command_uuid_active(event.command_uuid) ) {
                            return false;
                        } else if (event.args.status === 'error') {
                            //meant to be used for failed POSTs or user-initiated GETs; run the error callback with a standard error message
                            var error_msg = event.args.error_msg ? event.args.error_msg : 'Whoops, an error has occured, please try again';
                            this.exception_wrapper(function () { this.run_callback(event.command_uuid, '', { error_msg : error_msg } ); });
                            this.remove_command( event.command_uuid );
                            return false;
                        }

                        this.process_server_command(event, server_response_count);

                        return true;
                    };
                    return f;
                };
                func_list.push( func(e, this.server_response_count) );
            }, this);

            _.each(func_list, function (func) {
                func.apply(this);
            }, this);
        },
        exception_wrapper: function (fn) {
            return fn.apply(this);
        },
        process_server_command: function (event, server_response_count) {
            //Takes an event sent from the server and runs it (be it a response, a module_js_command, or a publisher command)
            switch( event.command_id ) {
                case 'module_js_command':
                    var module = require('Modules').get_module(event.module_id);
                    if (module && module[event.args.module_command_id]) {
                        this.exception_wrapper(function () { module[ event.args.module_command_id ](event.args, event.args, server_response_count); });
                    }
                    break;
                case 'response':
                    //called at the end of an event's command set
                    this.exception_wrapper(function () { this.run_callback( event.command_uuid, event.data, event.args ); });
                    this.remove_command( event.command_uuid );
                    break;
                default:
                    this.exception_wrapper(function () {
                        this.run_command(
                            event.module_id,
                            event.command_id,
                            event.category_id,
                            event.element_id,
                            event.data,
                            event.priority,
                            event.args,
                            server_response_count);
                    });
            }
        },
        remove_command: function (command_uuid) {
            delete this.commands_to_send[command_uuid];
            delete this.callbacks[command_uuid];
        },
        is_command_uuid_active: function (command_uuid) {
            return this.commands_to_send[command_uuid] ? true : false;
        },
        run_callback: function ( command_uuid, data, args ){
            if (!_.isEmpty(command_uuid))  {
                var callback = this.callbacks[command_uuid];
                if (callback) {
                    callback(data, args, command_uuid);
                    delete this.callbacks[command_uuid];
                }
            }
        },
        log_demo_error: function (sys, ogl_ver, ogl_ext, max_frames, avg_frames, min_frames, log, scrot, demo) {
            // JS demo has encountered an error, log it!
            this.post('publisher', 'store_demo_log', '', {
                system : sys,
                opengl_version : ogl_ver,
                opengl_extensions : ogl_ext,
                max_framerate : max_frames,
                average_framerate : avg_frames,
                min_famerate : max_frames,
                log_dump : log,
                screenshot : scrot,
                demo: demo
            });
        },
        update_connection_status: function () {
            //determine if publisher is connected
            if (this.num_sequential_command_timeouts > 0) {
                this.connected = false;
            } else if (this.connection_type === 'poll') {
                var last_update_secs_ago = ((new Date()).getTime() - this.last_server_communication_unix_time) / 1000;
                this.connected = last_update_secs_ago < this.command_timeout_seconds;
            }

            // determines connection status: sending, connected_streaming, connected, connecting, disconnected
            var connection_status = this.get('connection_status');
            var sending = _.detect(this.commands_to_send, function (command) { return command.is_sent === true; }) !== undefined;

            if (!this.connected) {
                connection_status = this._connecting ? 'connecting' : 'disconnected';
            } else {
                connection_status = this.connection_type === 'socket' ? 'connected_streaming' : 'connected';
            }

            this.set({connection_status: connection_status, sending: sending});
        },
        reconnect: function () {
            //send a message to the server - we do this mainly because the command list might be empty
            //(all the messages timed out and removed), so we need to ensure a command is ready to be sent
            this._connecting = true;
            this.update_connection_status();
            this.play(true);
        },
        set_connection_status: function (status) {
            switch (status) {
                case 'socket':
                    publisher.last_server_communication_unix_time = (new Date()).getTime();
                    publisher.connected = true;
                    publisher.socket_heartbeat();
                    break;
                case 'poll':
                    publisher.last_server_communication_unix_time = (new Date()).getTime();
                    publisher.connected = true;
                    break;
                case 'disconnected':
                    publisher.connected = false;
            }
            var previous_connection_type = publisher.connection_type;
            if (previous_connection_type === 'socket' && status !== 'socket') {
                // we lost the socket connection
                // there are probably some houdini resources listening for this event
                $(window).trigger('socket_disconnected');
            }
            publisher.connection_type = status;
            publisher.update_connection_status();
        },
        socket_heartbeat: function () {
            publisher.connection_type = 'socket';
            publisher.connected = true;
            publisher.update_connection_status();
            if (this.socket_timeout_countdown) {
                clearTimeout(this.socket_timeout_countdown);
            }
            this.socket_timeout_countdown = setTimeout(this.socket_timeout.bind(this), 30000);
        },
        socket_timeout: function () {
            this.set_connection_status('disconnected');
        },
        generate_element: function generate_element( parent, data, args, no_generate_tabs ) {
            //TODO: refactor with publisher.create_dialog_box_command
            var combined_data;
            if (_.isArray(data)) {
                //setup container
                combined_data = publisher.generate_tab_panel();

                //add each tab in correct order
                _.each(data, function (elem_array) {
                    publisher.add_tab(elem_array[0], elem_array[1], elem_array[2], $(combined_data), false);
                });
            } else {
                combined_data = data;
            }

            this.generate_element_with_data( parent, combined_data, args );

            //create tabs in dialog function
            if (!no_generate_tabs) {
                publisher.tabs_dict[$(parent).find('.thm_tabbed_panel').attr('id')] = $(parent).find('.thm_tabbed_panel').tabs();
            }
        },
        create_tab_array: function create_tab_array(tab_id, tab_label, tab_data) {
            return [tab_id, tab_label, tab_data];
        },
        add_tab: function add_tab(tab_id, tab_label, tab_data, thm_tabbed_panel, is_update) {
            //add tab to html
            var new_div = document.createElement('div');
            new_div.setAttribute('id', tab_id);
            $(new_div).append( tab_data );
            thm_tabbed_panel.append( new_div );

            if (!is_update ) {
                thm_tabbed_panel.find('.thm_tab_list').append( '<li><a href="#' + tab_id + '">' + tab_label + '</a></li>' );
            }
        },
        generate_tab_panel: function generate_tab_panel() {
            var combined_data = document.createElement('div');
            combined_data.setAttribute('class', 'thm_tabbed_panel');
            combined_data.setAttribute('id', 'thm_tabbed_panel' + Math.random().toString().replace('.', ''));
            $(combined_data).append( document.createElement('ul') );
            $(combined_data).find('ul').attr('class', 'thm_tab_list');

            return $(combined_data);
        },
        generate_element_with_data: function generate_element( parent, data, args ) {
            var el = $('<div class="thm_panel">' +
                        '<div class="thm_panel_header thm_panel_top"><div class="buttons"></div></div>' +
                        '<div class="thm_panel_toolbar app-styles"></div>' +
                        '<div class="thm_panel_body"></div>' +
                        '<div class="app-styles thm_panel_footer thm_panel_footer_' + args.footer_style + '"></div>' +
                    '</div>');
            el.find('.thm_panel_body').append(data);
            if (args.color) {
                el.addClass(args.color);
            }
            if (args.title) {
                el.find('.thm_panel_header').prepend('<span title="' + args.title + '">' + args.title + '</span>');
            }
            if (args.minimize) {
                el.find('.thm_panel_header .buttons').append('<div title="Minimize" class="minimize_button"></div>');
            }
            if (args.close) {
                el.find('.thm_panel_header .buttons').append('<div title="Close" class="close_button"></div>');
            }
            if (args.buttons) {
                this.update_buttons_command( el, args.buttons );
            }
            if (args.footer_style === 'max') {
                el.find('.thm_panel_footer').addClass('thm_panel_bottom');
            } else {
                el.find('.thm_panel_body').addClass('thm_panel_bottom');
            }

            var toolbar_visible = false; //we are sometimes passed args["toolbar"] values of {}, which evaluate as true
            if (args.toolbar) {
                _.each(args.toolbar, function (val, button) {
                    //add button or filter to toolbar
                    if (button === 'filter' )
                    {
                        //add filter form
                        el.find('.thm_panel_toolbar').prepend( html );
                    }
                    else
                    {
                        var title_name = args.toolbar[button].replace(/_/gi,' '); //add title so that buttons have tooltips
                        el.find('.thm_panel_toolbar').prepend( '<div class="toolbar_button '+button+'" title="' + title_name + '" function_name="'+ args.toolbar[button] +'"></div>' );
                    }
                    toolbar_visible = true;
                });
            }

            if (toolbar_visible) {
                el.find('.thm_panel_toolbar').addClass('toolbar_active');
            }

            if (args.small_header) {
                el.find('.thm_panel_header').addClass('thm_panel_header_small');
            }

            //append data to the body
            $(parent).append(el);

            //set time_stamp, cannot put in bind standard events since it will cause problems with update
            if (args.time_stamp) {
                $(parent).attr('time_stamp', args.time_stamp);
            }
        },
        update_body_command: function update_body_command (jquery_element, args) {
            /*
             * Updates the body of the given element
             * Strictly speaking, this should be a protected command, but in JS there is no actual access protection so no difference between
             * putting it in the class/function declaration and using the prototype object
             *
             * jquery_element: jquery object of the element that needs to be updated
             * args: data to go into body. parameters can be passed in a number of ways (who should I hate for coming up with this? - Marc):
             *  - as a straight text file  "Hello world"
             *  - as a tab's properties {id: id, label: label, data: data}
             *  - or as an array of tabs [[id, label, data], [id, label, data]]
             */
            var panel = panels.get_from_dom_element(jquery_element);
            if (!panel ) {
                return;
            }

            var panel_body;
            if ((args.tab_id === undefined) && ((args.tabs === undefined) || (typeof(args.tabs) === 'function')) ) {
                panel_body = args;
            } else {
                panel_body = panel.get('body');
                if (!_.isArray(panel_body) ) { panel_body = []; }
                var tabs = ( args.tabs === undefined ) ? [[args.tab_id, args.tab_label, args.data]] : args.tabs;
                _.each(tabs, function (tab) {
                    //check to see if the panel_body has a tab with matching id (e.g. panel_body = [['preview','Preview','Preview text'],...] and tab = ['preview', 'Modified',...
                    var tab_position = _.indexOf( _.pluck(panel_body, 0), tab[0] );
                    if (tab_position > -1 ) {
                        panel_body[tab_position] = tab; //update existing tab
                    } else {
                        panel_body.push(tab); //.. or add tab to the end

                        publisher.add_tab(tab[0], tab[1], tab[2], panel.$el('.thm_tabbed_panel'), true); //manually add tab
                        panel.$el('.thm_tabbed_panel').tabs('add', '#' + tab[0], tab[1]);
                    }
                });
            }

            //et the panel instance from the DOM element, and update its body
            panel.set({body: ''}); //quick hack to prevent _.isEmpty underscore bug in Firefox; should remove 'body' set commands in the future
            panel.set({body: panel_body});
        },
        update_buttons_command: function update_buttons_command (el, buttons) {
            this.remove_button_command(el);
            _.each(buttons, function (button, button_string) {
                var button_callback, button_class, icon;
                // button_callback is either an object, string, or function
                if (_.isObject(button) && !_.isFunction(button)) {
                    button_callback = button.callback;
                    button_class = button.bt_class;
                    icon = button.icon;
                } else {
                    button_callback = button;
                }
                this.add_button_command( el, button_string, button_callback, button_class, icon );
            }, this);
        },
        add_button_command: function add_button_command (el, button_string, button_callback, button_class, icon) {
            // Find footer in element
            if ($(el).children('.thm_panel').length ) { el = $(el).children('.thm_panel'); }
            var $footer = $(el).children('.thm_panel_footer');

            // Check if button already exists
            var $button = $footer.children('.btn').filter(function(){
                return $(this).text() === button_string;
            }).first();
            if (!$button.length ) {
                // Lowercaseify the button string
                var slug = 'footer_button_' + button_string.toLowerCase();
                // Replaceify the spaces with strings
                slug = slug.replace(/ /g, '_');
                // If button does not exist, create it and append to footer element
                //$button = $('<a href="#" class="btn panelbtn ' + slug + '"><span>'+button_string+'</span></a>');
                $button = $('<button href="#" class="btn btn-legacy ' + slug + '"><span>'+button_string+'</span></button>');
                if(button_class) {
                    $button.addClass(button_class);
                }
                if(icon) {
                    $('span', $button).addClass('icon-'+icon);
                }
                $footer.append( $button );
            }

            var clickHandler;

            $button.unbind('click');
            $button.bind('click', function (e) {
                e.preventDefault();
                clickHandler();
            });

            var panel_id;
            if (button_callback === '__close__' ) {
                panel_id = $(el).attr('id');
                clickHandler = _.debounce(function (e) {
                    var panel = panels.get(panel_id);
                    panel.remove();
                }, 500, true);
            } else if (_.isString(button_callback)) {
                panel_id = $(el).attr('id');
                clickHandler = _.debounce(function (e) {
                    var panel = panels.get(panel_id);

                    if (panel) {
                        //check if the panel has a module and the module has a function with the callback name
                        //if so, call it
                        var panel_module = panel.get('module');
                        if (panel_module && require('Modules').get_module(panel_module) && require('Modules').get_module(panel_module)[button_callback] ) {
                            require('Modules').get_module(panel_module)[button_callback](panel);
                        }

                        panel.trigger(button_callback);
                    } else {
                        // sometimes we get phantom panels. The modal bg will disappar.
                        el.remove();
                    }
                }, 500, true);
            } else {
                // Button callback is a function, add callback
                clickHandler = _.debounce(function (e) {
                    button_callback(el);
                    $(el).trigger(button_string);
                }, 500, true);
            }
        },
        remove_button_command: function remove_button_command (el, button_string) {
            /* removes button named 'button_string' from the element. If no button_string passed, removes all buttons */
            if ($(el).children('.thm_panel').length ) { el = $(el).children('.thm_panel'); }
            var $buttons = $(el).children('.thm_panel_footer').find('.btn');
            if (button_string ) {
                $buttons = $buttons.filter(':contains("' +button_string + '")');
            }
            $buttons.remove();
        },

        replace_button_command: function replace_button_command (el, old_button_string, new_button_string, button_callback) {
            /* functions like a combination of remove_button_command + add_button_command,
             * but retains the positioning of the old button, rather then appending the new button to the end of the list
             */
            if ($(el).children('.thm_panel').length ) { el = $(el).children('.thm_panel'); }
            var $button = $(el).children('.thm_panel_footer').find('.btn:contains("' + old_button_string + '")');
            if ($button.length ) {
                $button.text(new_button_string).unbind('click').bind('click', function (e){ button_callback(el); });
            } else {
                this.add_button_command(el, new_button_string, button_callback);
            }
        },

        get_element_body: function get_element_body (category_id, module_id, element_id) {
            var jquery_element = panels.find_el(category_id, module_id, element_id);
            return jquery_element.find('.thm_panel_body');
        },

        bind_toolbar_button_events: function bind_toolbar_button_events (module_id, buttom_item) {
            $(buttom_item).unbind('click').bind('click', function (e){
                var module = require('Modules').get_module(module_id);
                module[ $(this).attr('function_name') ].call(module, $(this).parents('li') );
            });
        },

        add_course_mobile: function (e) {
            var panel = panels.add({
                layout: layouts.get('dialog'),
                id: 'enter_course_code',
                module: 'course',
                title: 'Enter course code',
                body: '<p>Enter the 6-digit code associated with the course you wish to enter.</p> <input type="text" placeholder="Six digit code (eg. 123456)" id="course_code" />',
                footer_buttons: {
                    'Cancel': function () {
                        panels.get('enter_course_code').remove();
                        // $.mobile.changePage("#course_list_page");
                        return false;
                    },
                    'Enter': function () {
                        var course_code = panel.get('view').$('#course_code').val();
                        window.location.href='/e'+course_code; // TODO: convert mobile to backbone router
                    }
                }
            });
        },

        run_command: function (module_id, command_id, category_id, element_id, data, priority, args, server_response_count) {
            //perform function based on the type of command
            var command_function = this[command_id + '_command'];
            if (command_function ) {
                command_function (module_id, command_id, category_id, element_id, data, priority, args, server_response_count);
            }
        },

        create_dialog_box_command: function (module_id, command_id, category_id, element_id, data, priority, args) {
            publisher.add_command( module_id, command_id, 'dialog', element_id, data, priority, args );
        },

        create_message_dialog_box_command: function create_message_dialog_box_command (module_id, element_id, title, data, callback_function, box_width) {
            var callback = callback_function;
            var ok_func = function () {
                var dialog_box = panels.find_el('dialog', module_id, element_id);

                dialog_box.remove();
                if (callback) {
                    callback();
                }
            };

            var width = 250;
            if (box_width) {
                width = box_width;
            }

            var args = { 'width':width, 'title':title,'color':'blue', 'minimize':false,
                          'footer_style':'max', 'buttons':{'Ok': ok_func} };

            //create dialog
            publisher.create_dialog_box_command( module_id, undefined, 'dialog', element_id, data, '0', args );
        },

        update_property_command: function update_property_command (module_id, command_id, category_id, element_id, data, priority, args) {
            var jquery_element = panels.find_el( category_id, module_id, element_id );

            //for properties that must be updated before drawing the tree
            //add time_stamp
            if (data.time_stamp ) {
                jquery_element.attr('time_stamp', data.time_stamp);
            }

            _.each(args, function (value, property) {
                publisher['update_' + property + '_command'](jquery_element, value);
                /*publisher.bind_standard_events( jquery_element, module_id, category_id, element_id);*/ //TODO: re-implement this
            });
        },

        delete_command: function delete_command (module_id, command_id, category_id, element_id, data, priority, args) {
            var jquery_element = panels.find_el( category_id, module_id, element_id );
            jquery_element.trigger('delete'); //run any events that were bound for element deletion
            jquery_element.remove();
        },

        minimize_command: function minimize_command (module_id, command_id, category_id, element_id, data, priority, args) {
            var element = panels.find_el( category_id, module_id, element_id );
            //TODO: this ugly shit
            if (!$('html').hasClass('ui-mobile')) {
                element.addClass('thm_panel_hidden');
            }
            element.find('.thm_panel_header').addClass('rounded_bottom');
        },

        maximize_command: function maximize_command (module_id, command_id, category_id, element_id, data, priority, args) {
            var element = panels.find_el( category_id, module_id, element_id );
            element.removeClass('thm_panel_hidden');
            element.find('.thm_panel_header').removeClass('rounded_bottom');
        },

        footer_message: function footer_message (msg, color) {
            var args = {};
            if (msg ) {
                args.message = msg;
            }
            if (color ) {
                args.color = color;
            }
            publisher.footer_message_command('publisher', 'footer_message', 'footer', 'footer', '', 0, args);
        },

        footer_message_command: function footer_message_command (module_id, command_id, category_id, element_id, data, priority, args) {
            if (args.message ) {
                var message = $(footer_html);
                message.find('.thm_footermsg_middle').text( args.message );
                if (args.color ) {
                    message.find('.thm_footermsg_middle').css('color',args.color);
                }
                while( $('#footer div.thm_footermsg_div').length > 5 ) {
                    $('#footer div.thm_footermsg_div:first').remove();
                }
                message.hide();
                $('#footer').append( message );
                message.show('slide');
                message.find('.thm_footermsg_right').unbind('click').bind('click', function (e){
                    $('#footer div.thm_footermsg_div:last').hide( 500, function (){$('#footer div.thm_footermsg_div:last').remove();});
                });
            }
        },
        add_command: function (module_id, command_id, category_id, element_id, data, priority, args, server_response_count) {
            var panel;
            if (category_id === 'div' ) {
                $('#' + element_id).html(data);
            }
            else {
                panel = panels.in_layout(category_id).in_module(module_id).get(element_id);
                if (!panel ) {
                    var layout = layouts.get(category_id);
                    if (!layout ) {
                        return false;
                    }

                    panels.add({
                        id: element_id,
                        module: module_id,
                        layout: layout,

                        color: args.color,
                        title: args.title,
                        close: args.close,
                        minimize: args.minimize,
                        footer_style: args.footer_style,
                        footer_buttons: args.buttons,
                        priority: priority,
                        toolbar: args.toolbar,
                        small_header: args.small_header,

                        //dialog-specific values; TODO: make it so that these can be set after initialization
                        height: args.height,
                        width: args.width,

                        //this property is used to calculate positioning
                        server_response_count: server_response_count
                    });
                    panel = panels.get(element_id);
                }

                if (!_.isString(data) && !_.isElement(data) && !_.isArray(data)) {
                    data = data[0];
                } //handle situations where jquery selector passed
                panel.set({body: data});
            }
            return panel;
        },

        track_analytics_event: function track_analytics_event (category, action, label, value) {
        //    if (typeof(_gaq) == "object" )
        //        _gaq.push(['_trackEvent', category, action, label, value]);
            if (typeof(mpmetrics) === 'object' ) {
                mpmetrics.track(action);
            }
        },

        /*
         * Gets the js THMTree object for the given element
         */
        get_trees: function (module_id, element_id) {
            /* returns a dictionary of trees; the key is either the tree's "name" attribute or a counter */

            var result = {};

            var panel = panels.in_module(module_id).get(element_id);
            if (panel ) {
                var trees = panel.$('.thm_tree');
                $(trees).each(function (index, item) {
                    var identifier = $(item).attr('name') || index;
                    result[identifier] = $(item).data('tree');
                });
            }

            return result;
        },

        get_tree: function (module_id, element_id) {
            /* can return three values:
             *
             * false: no tree found in panel
             * tree object: one tree found, returns object
             * dictionary of tree objects: multiple trees found
             *
             * in general, this is a bad idea; we should deprecate this and move towards get_trees, which always returns a dictionary
             */

            var trees = this.get_trees(module_id, element_id);
            var num_trees = _.isEmpty(trees) ? 0 : _.size(trees);

            if (num_trees === 0 ) {
                return false;
            } else if (num_trees === 1) {
                return _.values(trees)[0];
            } else {
                return trees;
            }
        },

        /*
         * Gets the js THMForm object for the given element
         */
        get_form: function (module_id, element_id) {
            return this.form_dict[module_id + '_' + element_id];
        },

        course_unavailable_response: function course_unavailable_response (data, args) {
            publisher.create_message_dialog_box_command( 'publisher', 'error_dialog', 'Course unavailable', '<div class="thm_panel_content_title">Course is no longer available</div>',
                    function (){ window.location = window.site_data.settings.BASE_URL; }, 300);
        },

        course_membership_deleted: function course_membership_deleted (data, args) {
            publisher.create_message_dialog_box_command(
                'publisher',
                'error_dialog',
                'Removed from course',
                '<div class="thm_panel_content_title">You have been removed from this class.</div>',
                    function (){ window.location = window.site_data.settings.BASE_URL; }, 300);
        },

        post_message_with_new_password_for_course: function post_message_with_new_password_for_course (data, args) {
            publisher.create_message_dialog_box_command( 'publisher', 'error_dialog', 'Course password has changed', '<div class="thm_panel_content_title">' + args.message + '</div>',
                    function (){ window.location = window.location.href; }, 300 );
        },

        /*
        * Strictly speaking should be a public method
        *
        * Is called when courses are changed to tell all the currently running modules that the course has changed and to let them
        * do what they need to do
        */
        enter_course: function (public_code) {
            //clear all panels
            layouts.clear();
            var course_data = new CourseData({public_code: public_code});
            course.set({
                course_data: course_data
            });
            course_data.fetch({
                success: function () {
                    // sets the course list at the top of the lobby
                    if (window.course_picker) {
                        window.course_picker.$el.select2('val', public_code);
                    }

                    course_data.busted = false; // Hack to prevent polling

                    // get a new queue
                    Houdini.subscribe();
                    var settings = course_data.get('settings');
                    settings.on('change:active_modules', function () {
                        window.course.set_local_active_modules(settings.get('active_modules'));
                    });
                    window.course.set_local_active_modules(settings.get('active_modules'));
                    var online_users = course_data.get('online_users');

                    // set the course settings
                    require('Modules').get_module('course').set({
                        available: course_data.get('available'),
                        phone_number: settings.get('phone_number'),
                        num_online: online_users.num_online,
                        num_students: online_users.num_students,
                        sms_enabled: settings.get('sms_participation')
                    });

                    publisher.auto_create_sessions = settings.get('auto_create_sessions');
                    course.set_profiles(settings.get('profiles'));

                    // if we are changing into a newly added a new course, we must remove the creation dialog box
                    // the dialog box cannot be removed by a callback function, because the list of active commands is flushed during the course change
                    var get_name_dialog = panels.find_el('dialog', 'course', 'add_course_elem');
                    if (get_name_dialog) {
                        get_name_dialog.remove();
                    }

                    // Update the footer accordingly
                    if (window.views && window.views.footer){
                        window.views.footer.update_freemium_display();
                    }
                    if (Browser.is_mobile()){
                        var name = course_data.get('course_name');
                        document.title = name;
                        $('h1[role=heading]').text(name);
                    }
                },
                error: function () {
                    this.play();
                }
            });
        },

        //this function is a close button for a dialog
        close_dialog: function (panel) {
            if (!_.isUndefined(panel)) {
                panel.remove();
            }
        }
    });
    return Publisher;
});
