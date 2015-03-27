/* global publisher, Houdini, FireBreath, _, panels */
define([
    'modules/Module',
    'models/Demo',
    'views/ModuleControl',
    'util/daedalus',
    'text!templates/demo/manual_installer.html',
    'text!templates/demo/upload_html5_demo.html',
    'layouts/edumacation/LayoutCollection',
    'util/Browser'
], function (
    Module,
    DemoItem,
    DemoControlView,
    Daedalus,
    installer_html,
    upload_html,
    layouts,
    Browser
) {
    'use strict';
    var DemoModule = Module.extend({
        defaults: _.extend({}, Module.prototype.defaults, {
            model: DemoItem,
            id: 'demo',
            name: 'Demos',
            order: 3,
            color: 'orange',
            control_view: DemoControlView
        }),

        initialize: function () {
            Module.prototype.initialize.call(this);
            if (!window.monoclegl_initialize) {
                // hack to make IE work with monocleGL
                window.monoclegl_initialize = undefined;
            }
            Houdini.on('demo:update_report', function(args) {
                var item = this.get('items').get(args.demo_id);
                if (item) {
                    // report data has weird requirements
                    // TODO: plz refactor update_report_data
                    item.update_report_data(args.questions);
                }
            }.bind(this));
            this.client_side_variables = window.site_data.settings.DEMO;
            this.update_installer_links();
        },

        thm_demo_source: {},
        flash_file_load_complete_timer_id_dict: {},
        flash_file_reload_timer_id_dict: {},
        current_form: undefined,
        client_side_variables: {},

        //checks if the plugin is installed and up-to-date; when check has completed, returns callback
        //requires 'el', which is dom element in which thm installation/update details can be placed
        thm_plugin_installed: false,
        thm_plugin_installer_run: false,
        check_java_version: function() {
            var i = 0;
            var length = navigator.plugins.length;
            // Iterate over navigator plugin array to check for Java plugin
            for (; i < length; i++) {
                // Check each plugin's name. This is sadly the most reliable way to test if a plugin is installed.
                if (navigator.plugins[i].name.indexOf('Java') !== -1) {
                    return true;
                }
            }
            // User does not have Java Plugin active
            return false;
        },
        check_plugin_version: function() {
            var min_req_version = this.client_side_variables ? this.client_side_variables.min_js_plugin_version : 0;

            if( !window.FireBreath ) {
                return false;
            }

            if (!FireBreath.isPluginInstalled('monocleGL')) {
                // Applet must be deployed
                return true;
            }

            // Sometimes firebreath returns the version in isPluginInstalled
            var plugin_version = FireBreath.getPluginVersion('monocleGL') || FireBreath.isPluginInstalled('monocleGL');
            var version_tuple = plugin_version.split('.');
            var version_int = parseInt(version_tuple[0], 10) * 10000 +
                parseInt(version_tuple[1], 10) * 100 +
                parseInt(version_tuple[2], 10);
            if (version_int < min_req_version) {
                // Applet must be deployed
                return true;
            }

            return false;
        },
        show_manual_installer: function(el, callback) {
            var data =  {
                'manual_download_windows': this.client_side_variables.manual_download_windows,
                'manual_download_mac': this.client_side_variables.manual_download_mac,
                'MEDIA_URL': window.site_data.settings.MEDIA_URL
            };
            var manual_installer = $(_.template(installer_html)(data));

            if (Browser.is_mac()) {
                manual_installer.find('.mac_install_steps').show();
            } else {
                manual_installer.find('.win_install_steps').show();
            }
            $(el).empty().append(manual_installer);
        },
        check_thm_plugin: function(el, callback) {
            // Check that plugin is installed and up-to-date
            if (this.check_plugin_version() === true) {
                this.show_manual_installer(el, callback);
            } else {
                callback();
            }
        },

        update_installer_links: function() {
            if (Browser.is_mac()) {
                $('.mac_install_steps .download_installer').attr('href', this.client_side_variables.manual_download_mac);
            } else {
                $('.win_install_steps .download_installer').attr('href', this.client_side_variables.manual_download_windows);
            }
        },

        launch_demo: function(tree, item)
        {
            var id = $(item).attr('id');
            require('Modules').get_module('demo').get('items').get(id).set({ opened: true });
        },


        //----------- FLASH PRELOADER -----------

        //ADDING DEMOS
        add_item: function()
        {
            //generate args for dialog
            var cancel_func = function() {
                var add_demo_dialog = panels.find_el('dialog', 'demo', 'add_demo_elem');
                add_demo_dialog.remove();
            };
            var ok_func = function() {
                //get all demos selected in list
                var tree = publisher.get_tree('demo','add_demo_elem');
                var selected_demos = tree.get_selected_items();

                //if more than 0 demos selected
                if( selected_demos.length > 0 )
                {
                    //change buttons in dialog box
                    publisher.run_command( 'demo', 'update_property', 'dialog', 'add_demo_elem', '', 0,
                                        { 'body' : $('#loading_template').html() });
                    publisher.run_command( 'demo', 'update_property', 'dialog', 'add_demo_elem', '', 0,
                                        { 'buttons' : {'Ok': cancel_func } });

                    var demo_names = [];
                    selected_demos.each( function(e){
                        //ensure demo not already added
                        var desired_demo_name = $(this).find('.thm_tree_table_text').text();
                        var is_name_unique = true;
                        panels.find_el('control', 'demo', 'demo_control_div').find('.thm_tree_list').children().each( function(){
                            if( $(this).find('.thm_tree_table_text').text() === desired_demo_name )
                            {
                                is_name_unique = false;
                            }
                        });

                        if (is_name_unique) {
                            demo_names.push( $(this).attr('id') );
                        }
                    });

                    var folder_id = require('Modules').get_module('demo').get_folder_id_to_insert_into();

                    //add demos
                    publisher.post( 'demo', 'add_demo', '', { 'demo_name' : demo_names, 'folder': folder_id }, function(data,args){
                        //if last one, add final message
                        _.each(demo_names, function(element, index, list){
                            var properties = {
                                moduleItemId: element.split('_')[5]
                            };
                            Daedalus.track('added demo', properties);
                            Daedalus.increment('numDemosAdded');
                            Daedalus.set_property('lastDemoAdded', new Date());
                        });
                        publisher.run_command( 'demo', 'update_property', 'dialog', 'add_demo_elem', '', 0,
                                            { 'body' : '<div class="thm_panel_content_title">All unique demos successfuly added.</div>', 'buttons': {'Close':cancel_func} });
                    });
                }
            };

            //setup dialog args
            var args_first = { 'width':330, 'title':'Add Demo','color':'blue', 'minimize':false,
                        'footer_style':'max', 'buttons':{'Cancel': cancel_func, 'Ok': ok_func} };
            var data_first = $('#loading_template').html();
            publisher.create_dialog_box_command( 'demo', 'add_demo', 'dialog', 'add_demo_elem', data_first, '0', args_first );

            //add content to dialog
            publisher.post( 'demo', 'get_demo_list_dialog', '', { }, function(data, args){
                //create dialog
                publisher.run_command( 'demo', 'update_property', 'dialog', 'add_demo_elem', '', 0, { body : args.result });

                var add_demo_dialog = panels.find_el('dialog', 'demo', 'add_demo_elem');

                //bind on change function for demo filtering
                //bind update events for filter changes

                $('#add_demo_elem select').unbind('change').on('change', function(){
                    //get selected item text
                    var selected = '';
                    $(this).find('option:selected').each(function() {
                        selected += $(this).text() + ' ';
                    });

                    //set contents of tree to be a spinner
                    var current_tree = publisher.get_tree('demo','add_demo_elem');
                    $(current_tree.root).children().hide();

                    var loading_template = $($('#loading_template').html());
                    $(add_demo_dialog).find('.thm_tree').hide();
                    $(add_demo_dialog).find('#module_items_div').append(loading_template);

                    //get demos that match the category
                    publisher.post( 'demo', 'get_filtered_items', '', {'subject':selected}, function(data,args){
                        //update tree content
                        loading_template.remove();
                        $(add_demo_dialog).find('.thm_tree').show();

                        current_tree.auto_order = false;

                        //remove all current items
                        current_tree.get_all_items().each( function(e){
                            current_tree.delete_item( $(this) );
                        });

                        //add new tree demo items
                        var filtered_items = args.result;
                        _.each(filtered_items, function (item) {
                            current_tree.add_item( item.item_text, item.id, '', item, 'preview_demo' );
                        });

                        current_tree.auto_order = true;
                        current_tree.order();
                    });
                });

                // It hurts that this is even necessary
                publisher.send({
                    module: 'demo',
                    command: 'get_subjects',
                    success: function (data, args) {
                        var subjects_element = $(add_demo_dialog).find('.thm_panel_toolbar select');
                        _.each(args.subjects, function(subject) {
                            subjects_element.append('<option>'+subject+'</option>');
                        });
                    }
                });

                //bind upload custom demo links
                $(add_demo_dialog).find('#flash_demo_dialog_callback').unbind('click').unbind('mousedown').bind('mousedown', function (){
                    var demo_module = require('Modules').get_module('demo');
                    demo_module.upload_new_demo(add_demo_dialog);
                });

                $(add_demo_dialog).find('#thm_demo_dialog_callback').unbind('click').unbind('mousedown').bind('mousedown', function (){
                    var demo_module = require('Modules').get_module('demo');
                    demo_module.upload_new_js_demo(add_demo_dialog);
                });

                $(add_demo_dialog).find('#html5_demo_dialog_callback').unbind('click').unbind('mousedown').bind('mousedown', function (){
                    var demo_module = require('Modules').get_module('demo');
                    demo_module.upload_new_html5_demo(add_demo_dialog);
                });


            });
        },

        upload_new_demo: function(add_demo_dialog) {
            var $dialog = panels.find_el('dialog', 'demo', 'add_demo_elem');
            var $data = $('<div></div>');
            //update the dialog box with the template, must do this before form conversion
            publisher.run_command( 'demo', 'update_property', 'dialog', 'add_demo_elem', '', 0, { body : $data });

            var new_demo_form = $data.composer([
                {
                    id: 'demo_display_name',
                    type: 'text',
                    tooltip: 'Enter the display name for the demo',
                    validation: ['not_empty'],
                    label: 'Demo Title'
                },
                {
                    id: 'demo_description',
                    type: 'textarea',
                    tooltip: 'Enter demo description',
                    label: 'Demo Description',
                    validation: ['not_empty']
                },
                {
                    id: 'subject',
                    tooltip: 'Select the subject matter of this demo for categorization',
                    label: 'Subject',
                    type: 'select'
                },
                {
                    id: 'flash_file_key',
                    tooltip: 'Upload flash file',
                    type: 'upload',
                    mime_types: 'application/x-shockwave-flash',
                    label: 'Flash File',
                    validation: ['not_empty', 'upload_completed']
                }
            ]);

            // It hurts that this is even necessary
            publisher.send({
                module: 'demo',
                command: 'get_subjects',
                success: function (data, args) {
                    new_demo_form.get('subject').set({ options: args.subjects });
                    new_demo_form.get('subject').value(args.subjects[0]);
                }
            });

            var cancel_func = function() {
                $dialog.remove();
            };

            var ok_func = function () {
                //validate to ensure all required fields are filled in, if not than return
                if (!new_demo_form.is_valid()) { return false; }
                var args =  new_demo_form.values();
                if (!args) { return; }

                publisher.run_command( 'demo', 'update_property', 'dialog', 'add_demo_elem', '', 0, { body : $('#loading_template').html() });

                //send command to publisher
                publisher.post( 'demo', 'upload_new_demo', '', args, function(args,data){
                    publisher.run_command( 'demo', 'update_property', 'dialog', 'add_demo_elem', '', 0, { body : '<div class="thm_panel_content_title">Demo uploaded successfuly</div>' });

                    publisher.run_command( 'demo', 'update_property', 'dialog', 'add_demo_elem', '', 0,
                                            { 'buttons' : {'Ok': cancel_func } });
                });
            };

            //finally, update the buttons so that they reflect the next actions
            publisher.run_command( 'demo', 'update_property', 'dialog', 'add_demo_elem', '', 0,
                                    { 'buttons' : {'Cancel': cancel_func, 'Ok': ok_func } });
        },

        upload_new_js_demo: function(add_demo_dialog) {
            var $el = $('<div></div>');
            publisher.run_command( 'demo', 'update_property', 'dialog', 'add_demo_elem', '', 0, { body : $el });
            var form_elements = [
                {
                    id: 'demo_display_name',
                    type: 'text',
                    label: 'Display name',
                    validation: ['not_empty']
                },
                {
                    id: 'demo_description',
                    type: 'text',
                    label: 'Demo description (optional)',
                    validation: ['not_empty']
                },
                {
                    id: 'subject',
                    type: 'select',
                    label: 'Subject',
                    tooltip: 'Select the subject matter of this demo so that it can be categorized appropriately.'
                }
            ];
            if (window.user.get('username') === 'admin') {
                form_elements = form_elements.concat([{
                    id: 'supports_magnify',
                    type: 'checkbox',
                    label: 'Supports magnification'
                }]);
            }
            form_elements = form_elements.concat([
                {
                    id: 'object_id',
                    type: 'text',
                    label: 'Object id',
                    validation: ['not_empty']
                },
                {
                    id: 'js_source',
                    type: 'textarea',
                    label: 'Javascript source',
                    validation: ['not_empty']
                },
                {
                    id: 'is_timed',
                    type: 'checkbox',
                    label: 'Timer Enabled'
                },
                {
                    id: 'time_limit',
                    type: 'text',
                    is_numeric: true,
                    label: 'Timer in seconds',
                    tooltip: 'Time before demo is deactivated'
                },
                {
                    id: 'correctness_score',
                    type: 'text',
                    is_numeric: true,
                    label: 'Correctness score'
                },
                {
                    id: 'participation_score',
                    type: 'text',
                    is_numeric: true,
                    label: 'Participation score'
                }
            ]);
            var new_demo_form = $el.composer(form_elements);

            // It hurts that this is even necessary
            publisher.send({
                module: 'demo',
                command: 'get_subjects',
                success: function (data, args) {
                    new_demo_form.get('subject').set({ options: args.subjects });
                    new_demo_form.get('subject').value(args.subjects[0]);
                }
            });

            add_demo_dialog.dialog('option', 'width', 400);
            add_demo_dialog.dialog('option', 'position', 'center');

            var cancel_func = function() {

                add_demo_dialog.remove();
            };

            var ok_func = function () {
                //validate to ensure all required fields are filled in, if not than return.
                //uses the jquery validation plugin found at http://bassistance.de/jquery-plugins/jquery-plugin-validation/
                //and http://docs.jquery.com/Plugins/Validation/Validator
                //does validation of the fields of a form based off of the css classes of the input fields in the form
                if (!new_demo_form.is_valid() ) { return; }
                publisher.post( 'demo', 'upload_new_demo', '', new_demo_form.values() );

                //finally close off the dialog box

                add_demo_dialog.remove();
            };

            //finally, update the buttons so that they reflect the next actions
            publisher.run_command( 'demo', 'update_property', 'dialog', 'add_demo_elem', '', 0,
                                    { 'buttons' : {'Cancel': cancel_func, 'Add': ok_func } });
        },


        upload_new_html5_demo: function(add_demo_dialog) {
            var upload_js_demo_html = $(upload_html);
            publisher.run_command('demo', 'update_property', 'dialog', 'add_demo_elem', '', 0, { body : upload_js_demo_html });
            upload_js_demo_html = panels.find_el('dialog', 'demo', 'add_demo_elem');

            add_demo_dialog.dialog('option', 'width', 400);
            add_demo_dialog.dialog('option', 'position', 'center');

            var cancel_func = function() {

                add_demo_dialog.remove();
            };

            var ok_func = function () {
                //validate to ensure all required fields are filled in, if not than return.
                //uses the jquery validation plugin found at http://bassistance.de/jquery-plugins/jquery-plugin-validation/
                //and http://docs.jquery.com/Plugins/Validation/Validator
                //does validation of the fields of a form based off of the css classes of the input fields in the form
                var form = publisher.get_form( 'demo', 'add_demo_elem' );
                if (!form || !form.validate_form() ) { return; }
                var formdata = (form.serialize_form());
                formdata.source = '';
                formdata.demotype = 'html5';
                publisher.post( 'demo', 'upload_new_demo', '', formdata );

                //finally close off the dialog box

                add_demo_dialog.remove();
            };

            //finally, update the buttons so that they reflect the next actions
            publisher.run_command( 'demo', 'update_property', 'dialog', 'add_demo_elem', '', 0,
                                    { 'buttons' : {'Cancel': cancel_func, 'Add': ok_func } });

        },

        is_demo_display_name_unique: function( item_value, callback_func ) {
            //cannot do client side validation since demos are cross-course
            publisher.post( 'demo', 'is_demo_display_name_unique', '',
                    { demo_display_name : item_value }, function(data, args){
                        callback_func(args.error);
                    });
            return ''; //return valid until ajax call comes back and says otherwise, or this will mess up form submit validation
        },


        preview_demo: function preview_demo(tree, item) {
            var demo_key = $(item).attr('id');
            var demo_mi = new DemoItem({'id': demo_key});
            var panel = panels.add({
                id: 'demo_preview',
                layout: layouts.get('dialog'),
                module: 'demo',
                color: demo_mi.get('module_color'),
                title: 'Preview',
                body: '',
                width: 520,
                footer_buttons: { 'Close': 'remove' }
            });

            var DemoDetailsView = require('views/demo/details');
            var details_view = new DemoDetailsView({ model: demo_mi });

            if (demo_mi.is_visible()) {
                panel.$b().html('This demo is already visible. Visible demos cannot be previewed.');
            } else {
                panel.$b().html(details_view.render().el);
            }
        },

        log_js_demo_exception: function(msg) {
            publisher.post('demo', 'log_js_demo_exception', {'message':msg}, {}, undefined);
        },

        submit_demo_quiz_answer: function(demo_name, quiz_name, is_correct){
            /*
            * This is called by the flash object when the student submits an answer, and sends the correct/incorrect value to the server
            * to be recorded.  Flash demos now handle resubmitting answers
            */

            publisher.send({
                'module': 'demo',
                'command': 'student_submit_demo_question_answer',
                'args': {
                    'demo_name' : demo_name,
                    'question_name' : quiz_name,
                    'is_correct' : is_correct
                },
                success: function() {
                    var demo_id = demo_name.replace('demo_target_', '');
                    var module_item = this.items().get(demo_id);
                    if( module_item ) {
                        module_item.set({'answered': true});
                    }
                }.bind(this),
                failure: function() {
                    this.send_answered_received_to_demo('', {
                        'demo_name': demo_name,
                        'is_flash': true,
                        'is_correct': is_correct,
                        'question_name': quiz_name
                    });

                    publisher.footer_message('Error sending demo submission. Please retry', 'red');
                }.bind(this),
                timeout_handling: publisher.TOH.retry
            });
        },

        send_answered_received_to_demo: function(data, args) {
            /*
            * This is called by the server to send an acknowledgement to the flash demo that the answer to the student received has been
            * received and recorded by the server, must be kept in sync with the function demo.embedSWFObject as this right now
            * relies on having the 'id' of the swfobject as the demo_name
            */

            //cannot use jquery selector in this case, demo_name MUST be the 'id' of the swf object
            //as per the JS function embedSWFObject
            if (((typeof args.is_mobile_client) !== 'undefined') && (args.is_mobile_client === true)) {
                document.location = 'gap://monocleGLPlugin.answerReceived/' + args.question_name + '/' + args.is_correct;
            }

            if (((typeof args.is_flash) !== 'undefined') && (args.is_flash === true)) {
                document[args.demo_name].sendToFlash(args.question_name, args.is_correct);
            } else {
                window.thmDemo.js_onQuizSubmit(args.question_name, args.is_correct);
            }
        },

        update_student_question_list: function (data, args) {
            var demo_mi = require('Modules').get_module_item(args.demo_key);
            demo_mi.set({student_answers: args.student_answers});
        }
    });

    return DemoModule;
});
