/* global Backbone, panels, layouts, publisher, _, ThmForm */
define([
    'modules/Module',
    'views/admin/CourseDuplitron',
    'tree/views/Tree',
    'text!templates/adminface/event_browser.html',
    'text!templates/adminface/create_users_dialog.html',
    'text!templates/adminface/sales_report_dialog.html',
    'text!templates/adminface/impersonate_user.html',
    'text!templates/adminface/fix_tree.html',
    'text!templates/adminface/fix_demo_questions_template.html',
    'layouts/edumacation/LayoutCollection',
    'models/LongTask',
    'views/LongTask'
], function (
    Module,
    CourseDuplitronView,
    TreeView,
    event_browser,
    create_users_dialog,
    sales_report_dialog,
    impersonate_user_template,
    fix_tree_template,
    fix_demo_questions_template,
    layouts,
    LongTask,
    LongTaskView
) {
    'use strict';
    var FixTreeView, ImpersonateUserView;
    var Adminface = Module.extend({
        defaults: {
            'id': 'adminface',
            'color': 'blue',
            'order': 1
        },
        create_users_variables: {
            'organiations': [],
            'subscription_types': []
        },
        current_form: undefined,

        initialize_control_panel: function(options) {
            //initialize control panel
            var panel = panels.add({
                id: this.get('id') + '_control_panel',
                module: this.get('id'),
                layout: layouts.get('control'),

                title: 'Admin',
                body: '<div class="cpp"></div>',

                color: this.get('color'),
                priority: this.get('order'),
                minimize: true
            });

            //initialize control panel tree view
            var tree = this.get('tree');
            var tree_view = new TreeView({ model: tree, sortable: false, empty_message: 'No items here...' });
            tree_view.render();
            var el = panel.$('.cpp');
            $(el).html( tree_view.el );

            var folders = [
                {
                    'title': 'Create',
                    'item_type': 'folder',
                    'selectable': false,
                    'children': [
                        { 'title': 'Create Org', 'item_type': 'item', 'click': $.proxy(function() { this.create_org(); }, this) },
                        { 'title': 'Create Users', 'item_type': 'item', 'click': $.proxy(function() { this.create_users(); }, this) },
                        { 'title': 'Generate Subscription Codes', 'item_type': 'item', 'click': $.proxy(function() { this.create_subscriptions(); }, this) },
                        { 'title': 'Generate Coupons', 'item_type': 'item', 'click': $.proxy(function() { this.create_coupons(); }, this) },
                        { 'title': 'Course Duplitron', 'item_type': 'item', 'click': $.proxy(function() { this.course_duplitron(); }, this) },
                        { 'title': 'Import Third Party Licenses', 'item_type': 'item', 'click': $.proxy(function() { this.import_licenses(); }, this) }
                    ]
                },
                {
                    'title': "Manage",
                    "item_type": "folder",
                    "selectable": false,
                    "children": [
                        { "title": "Django admin", "item_type": "item", "click": $.proxy(function() { this.django_admin(); }, this) },
                        { "title": "User Search", "item_type": "item", "click": $.proxy(function() { this.user_search(); }, this) },
                        { "title": "Edit course subjects", "item_type": "item", "click": $.proxy(function() { this.edit_course_subjects(); }, this) },
                        { "title": "Subscription stats", "item_type": "item", "click": $.proxy(function() { this.subscription_stats(); }, this) },
                        { "title": "Demo Editor", "item_type": "item", "click": $.proxy(function() { this.demo_editor(); }, this) },
                        { "title": "Fix demo questions", "item_type": "item", "click": $.proxy(function() { this.fix_demo_questions(); }, this) },
                        { "title": "Log browser", "item_type": "item", "click": $.proxy(function() { this.log_browser(); }, this) },
                        { "title": "Flush Memcache", "item_type": "item", "click": $.proxy(function() { this.flush_memcache(); }, this) },
                        { "title": "Impersonate User", "item_type": "item", "click": $.proxy(function() { this.impersonate_user(); }, this) },
                        { "title": "Fix Tree", "item_type": "item", "click": $.proxy(function() { this.fix_tree(); }, this) }
                    ]
                },
                {
                    'title': 'Report',
                    'item_type': 'folder',
                    'selectable': false,
                    'children': [
                        { 'title': 'User browser', 'item_type': 'item', 'click': $.proxy(function() { this.user_browser(); }, this) },
                        { 'title': 'Event browser', 'item_type': 'item', 'click': $.proxy(function() { this.event_browser(); }, this) },
                        { 'title': 'User Timeline', 'item_type': 'item', 'click': $.proxy(function() { this.user_timeline(); }, this) },
                        { 'title': 'Sales report', 'item_type': 'item', 'click': $.proxy(function() { this.sales_report(); }, this) }
                    ]
                }
            ];
            tree.deserialize({ 'children': folders });
        },
        fix_tree: function () {
            var panel = panels.add({
                id: 'fix_tree',
                layout: layouts.get('dialog'),
                body: $('#loading_template').html(),
                title: 'impersonate_user',
                width: 500,
                footer_buttons: {
                    'Cancel': 'remove'
                }
            });
            var view = new FixTreeView({model: panel});
            view.render();
        },
        impersonate_user: function () {
            var panel = panels.add({
                id: 'impersonate_user',
                layout: layouts.get('dialog'),
                body: $('#loading_template').html(),
                title: 'impersonate_user',
                width: 500,
                footer_buttons: {
                    'Cancel': 'remove'
                }
            });
            var view = new ImpersonateUserView({model: panel});
            view.render();
        },
        course_duplitron: function () {
            if (panels.get('course_duplitrong')) {
                // only one
                window.alert('only one course duplitron may be open at a time.');
                return;
            }
            var panel = panels.add({
                id: 'course_duplitron',
                layout: layouts.get('dialog'),
                width: 450,
                title: 'Course Duplitron',
                body: $('#loading_template').html(),
                footer_buttons: {
                    'Cancel': 'remove'
                }
            });
            var view = new CourseDuplitronView({el: panel.$b()});
            view.render();
        },
        set_subscription_variables: function(data, args)
        {
            this.create_users_variables = {
                    'organizations' : args.organizations,
                    'subscription_types' : args.subscription_types
            };
        },

        set_create_users_variables: function(data, args)
        {
            //the form's organization and subscription_types are referenced in some form event callbacks
            //(such as the subscription type filter that occurs when the admin specifies the user type), and so must be stored outside the function
            this.set_subscription_variables(data,args);

            var create_users_dialog = publisher.get_element_body('dialog','adminface','create_users_dialog');

            //get the organization selector form element and empty it, then populate with the list of organizations
            var org_select_element = $(create_users_dialog).find('#organization_key select').html('');
            for (var organization_key in this.create_users_variables.organizations) {
                org_select_element.append( '<option value=' + organization_key + '>' + this.create_users_variables.organizations[organization_key] + '</option>' );
            }

            //get the organization selector form element and empty it, then populate with the list of organizations
            var subscription_type_select_element = $(create_users_dialog).find('#subscription_user_type select').html('');

            for(var subscription_type_name in this.create_users_variables.subscription_types) {
                subscription_type_select_element.append( '<option>' + subscription_type_name + '</option>' );
            }
        },

        subscription_stats: function(tree, item)
        {
            panels.add({
                id: 'subscription_stats',
                module: 'adminface',
                layout: layouts.get('content'),

                title: 'Subscription Stats',
                body: '__loading__',
                footer_buttons: {Close: 'remove'}
            });

            var p = panels.get('subscription_stats');
            publisher.post('adminface', 'get_subscription_stats', '', {}, function(data, args){
                p.set({body: data});
            });
        },

        event_browser: function(tree, item)
        {
            var load_func = function() {
                var form = publisher.get_form('adminface', 'event_browser');
                var dialog = panels.find_el('dialog', 'adminface', 'event_browser');
                var args = {
                    username: form.get_item_value_by_id('user'),
                    course_name: form.get_item_value_by_id('course')
                };
                publisher.post('adminface', 'get_events', '', args, function(data, result_args) {
                    var template = '<% for (event in events) { %><tr><td><%- event.message %></td><td><% event.created_at %></td></tr><% } %>';
                    dialog.find('table#events tbody').html(_.template(template, result_args));
                    dialog.find('table#events').dataTable({
                        'iDisplayLength':10,
                        'sPaginationType':'full_numbers',
                        'bPaginate': true,
                        'bFilter': true,
                        'bSort': true,
                        'bJQueryUI': true,
                        'sDom': '<"dataTables_controls"fp<"cb">>t<"dataTables_controls"ip<"cb">>'
                    });
                });
            };
            var close_func = function() {
                var create_subs_dialog = panels.find_el('dialog', 'adminface', 'event_browser');
                create_subs_dialog.remove();
            };
            var dialog_args = { 'width':460, 'title':'Event Browser','color':'blue', 'minimize':false,
                                 'footer_style':'max', 'buttons':{'Close': close_func, 'Load': load_func} };
            publisher.create_dialog_box_command( 'adminface', 'event_browser', 'dialog',
                                             'event_browser', event_browser, '0', dialog_args );
        },

        create_users: function(tree, item)
        {
            var data = $(create_users_dialog);
            publisher.post( 'adminface', 'set_create_users_variables', '', {}, function(data, args) {
                var admin_module = require('Modules').get_module('adminface');
                admin_module.set_create_users_variables(data, args);
            } );

            //generate form
            var form = new ThmForm();

            form.handle_subscription_type = function( item_value, callback_func )
            {
                //we show & hide questions that relate to the subscription types
                //if the admin specifies individual or joint subscriptions, we provide the inputs required to create those subscriptions
                //if the admin wishes to use an existing subscription, we provide an input for them to enter the subscription's key
                if (item_value[2]) {
                    //the user has specified they will be adding users into an existing subscription
                    //these questions are required when creating individual or joint accounts, but not when using existing subscriptions
                    $(['subscription_start_date','subscription_duration','subscription_user_type','subscription_max_users']).each(function() {
                        form.hide_item_by_id(this);
                    });

                    //question #s12 is only required when using an existing subscription
                    form.show_item_by_id('subscription_key');
                } else {
                    //the user has specified they will be creating individual subscriptions for each user (item_value[0]) or a joint subscription for all users (item_value[1])
                    //toggle the fields that are required based on the user's choice
                    $(['subscription_start_date','subscription_duration','subscription_user_type','subscription_max_users']).each(function() {
                        form.show_item_by_id(this);
                    });

                    form.hide_item_by_id('subscription_key');

                    if (item_value[0]) {
                        form.hide_item_by_id('subscription_max_users');
                    }
                }

                return '';
            };
            form.handle_user_type = function( item_value, callback_func, form )
            {

                //we filter the list of subscription types every time the admin specifies a user type in the create_users form
                //e.g. if the admin specifies user type of 'Teacher', we show subscription types 'teacher_all_access', 'teacher_limited' but not 'student_all_access'

                var subscription_user_type_select_element = $(form.get_item_by_id('subscription_user_type')).find('select');
                var subscription_user_type_value = subscription_user_type_select_element.val(); //get the current value for the user type; if that option still exists after we filter the list, we will re-select it at the end
                subscription_user_type_select_element.html('');

                //get the user type
                var user_type;
                for(var key in item_value) { user_type = item_value[key].toLowerCase() + '_'; break; } //the name of the radio button contains the string we will be filtering by
                if (!user_type) { return; }

                var admin_module = require('Modules').get_module('adminface');
                for(var subscription_type_name in admin_module.create_users_variables.subscription_types) {

                    if (subscription_type_name.indexOf(user_type) === 0) { //only add subscription types that start with the name of the user type
                        subscription_user_type_select_element.append( '<option>' + subscription_type_name + '</option>' );
                    }
                }

                subscription_user_type_select_element.val(subscription_user_type_value); //attempt to re-set the value for the selector
            };

            form.option_name_width = 80;
            form.option_section_width = 60;
            form.option_item_width = 100;

            form.option_image_path = window.site_data.settings.MEDIA_URL + 'images/edumacation/icons/';
            form.callback_object = form;
            form.convertHtml( $(data).find('.thm_form') );
            form.validate_form();

            var cancel_func= function() {
                var create_users_dialog = panels.find_el('dialog', 'adminface', 'create_users_dialog');
                create_users_dialog.remove();
            };

            var create_func = function() {
                //if the form is not valid we stop the user here
                if (!form.validate_form()) {
                    return false;
                }

                //if we will be creating multiple users, the username must have a numerical placeholder; if no placeholder is present, we append one
                var num_users = form.get_item_value_by_id('num_users');
                var username = form.get_item_value_by_id('username_pattern');
                if ((username.indexOf('$1') === -1) && num_users > 1) {
                    form.set_item_value_by_id('username_pattern', username + '$1');
                }

                //if the user is creating a joint subscription, the subscription's max number of users must be greater then the number of users we wish to create
                var max_users = form.get_item_value_by_id('subscription_max_users');
                if (!parseInt(max_users, 10) || (parseInt(max_users, 10) < parseInt(num_users, 10))) { //we check parseInt in this situation because the num_user's integer check will be skipped if the num_user question is hidden, allowing for situations in which non-integer values could potentially pass validation
                    form.set_item_value_by_id('subscription_max_users', num_users);
                }

                //if the form passes all JS validations, we submit the info to the server
                //assuming everything checks out on the server, we close the window
                publisher.post( 'adminface', 'create_users', '', form.serialize_form(), function(data) {
                    var create_users_dialog = panels.find_el('dialog', 'adminface', 'create_users_dialog');

                    //check if the response includes an error message. If so, display it. Otherwise, close the dialog box
                    if (data.error_msg) {
                        create_users_dialog.find('#server_side_error').text(data.error_msg);
                    } else {
                        if (data.usernames && data.passwords) {
                            //the JS export_csv helper wraps up csv creation, but requires the calling element to have a tree
                            //the export_csv view requires a command_name, file_name, and item_list
                            var query_str = jQuery.param({
                                'command_name' : 'export_create_users',
                                'file_name' : 'created_users',
                                'item_list' : jQuery.toJSON({'usernames':data.usernames,'passwords':data.passwords})
                            });
                            window.location = window.site_data.urls.export_csv + '?' + query_str;
                        }
                        create_users_dialog.remove();
                    }
                });
            };



            var args = { 'width':430, 'title':'Create Users','color':'blue', 'minimize':false,
                          'footer_style':'max', 'buttons':{'Cancel': cancel_func, 'Create': create_func} };

            //create dialog
            publisher.create_dialog_box_command( 'adminface', 'create_users', 'dialog', 'create_users_dialog', data, '0', args );
        },

        user_timeline: function(tree, item) {
            panels.add({
                id: 'user_timeline',
                layout: layouts.get('content'),
                module: 'adminface',
                title: 'User Timeline',
                minimize: true,
                body: 'User: <input type="text" id="username"> Course: <input type="text" id="course"> <input type="button" id="submit" value="Submit"><div id="result"></div>',
                footer_buttons: { Close: 'remove' },
                color: 'blue'
            });
            var panel = panels.get('user_timeline');
            panel.get('view').$('#submit').click(function() {
                var value = {
                    username: panel.get('view').$('#username').val(),
                    course_name: panel.get('view').$('#course').val()
                };
                publisher.post('adminface', 'user_timeline', '', value, function(data, args) {
                    panel.get('view').$('#result').html(args.result);
                });
            });
        },

        edit_course_subjects: function(tree, item)
        {
            //create dialog box
            var cancel_func= function() {
                var edit_subjects_dialog = panels.find_el('dialog', 'adminface', 'edit_subjects_dialog');
                edit_subjects_dialog.remove();
            };

            var dialog_args = { 'width':350, 'title':'Edit course subjects','color':'blue', 'minimize':false,
                                 'footer_style':'max', 'buttons':{'Cancel': cancel_func} };
            publisher.create_dialog_box_command( 'adminface', 'edit_subjects_dialog', 'dialog',
                                                 'edit_subjects_dialog', '<br/><span>Wait for it...</span><br/><br/>', '0', dialog_args );

            //do call on server
            publisher.post( 'adminface', 'get_subjects_edit_template', '', {}, function(data,args){
                var ok_func= function() {
                    var form = publisher.get_form('adminface', 'edit_subjects_dialog');

                    publisher.post( 'adminface', 'save_course_subjects', '', {'form':form.serialize_form()}, function(data,args){
                        publisher.run_command( 'adminface', 'update_property', 'dialog', 'edit_subjects_dialog', '', 0,
                                               { body : '<div class="thm_panel_content_title">'+args.message+'</div>' });
                        publisher.run_command( 'adminface', 'update_property', 'dialog', 'edit_subjects_dialog', '', 0,
                                               { buttons : {'Ok':cancel_func} });
                    });
                };

                var dialog_data = args.form;

                publisher.run_command( 'adminface', 'update_property', 'dialog', 'edit_subjects_dialog', '', 0,
                                          { body : dialog_data });
                publisher.run_command( 'adminface', 'update_property', 'dialog', 'edit_subjects_dialog', '', 0,
                                          { buttons : {'Cancel':cancel_func, 'Ok':ok_func} });

                //set form content
                var form = publisher.get_form('adminface', 'edit_subjects_dialog');
                form.deserialize_form( {'subjects':args.subjects} );
            });
        },

        create_org: function(tree,item)
        {
            var ok_func = function(){
                //get form
                var form = publisher.get_form('adminface','add_org_dialog');

                //validate form
                if (form.validate_form()) {
                    publisher.run_command( 'adminface', 'update_property', 'dialog', 'add_org_dialog', '', 0,
                                                 { body : $('#loading_template').html() });

                    //call publisher function to create org
                    publisher.post( 'adminface', 'create_org', '', {'form':form.serialize_form()}, function(data,args){
                        //update dialog
                        publisher.run_command( 'adminface', 'update_property', 'dialog', 'add_org_dialog', '', 0,
                                                        { body : '<div class="thm_panel_content_title">Organization created</div>' });
                        publisher.run_command( 'adminface', 'update_property', 'dialog', 'add_org_dialog', '', 0,
                                                        { buttons : {'Ok':cancel_func} });
                    });
                }
            };
            var cancel_func = function(){
                var add_org_dialog = panels.find_el('dialog', 'adminface', 'add_org_dialog');

                add_org_dialog.remove();
            };

            var dialog_args = { 'width':350, 'title':'Add organization','color':'blue', 'minimize':false,
                                 'footer_style':'max', 'buttons':{'Cancel': cancel_func} };
            publisher.create_dialog_box_command( 'adminface', 'add_org_dialog', 'dialog', 'add_org_dialog', $('#loading_template').html(), '0', dialog_args );

            //get form from publisher
            publisher.post( 'adminface', 'get_org_creation_form', '', {}, function(data,args){
                //update body with gotten form
                publisher.run_command( 'adminface', 'update_property', 'dialog', 'add_org_dialog', '', 0,
                                             { body : args.result });
                publisher.run_command( 'adminface', 'update_property', 'dialog', 'add_org_dialog', '', 0,
                                             { buttons : {'Ok':ok_func, 'Cancel':cancel_func} });

            });
        },

        sales_report: function(data, args)
        {
            //create dialog box
            var cancel_func = function() {
                var  sales_report_dialog = panels.find_el('dialog', 'adminface', 'sales_report_dialog');
                sales_report_dialog.remove();
            };

            var ok_func = function() {
                var sales_report_dialog = panels.find_el('dialog', 'adminface', 'sales_report_dialog');

                publisher.run_command( 'adminface', 'update_property', 'dialog', 'sales_report_dialog', '', 0,
                    { buttons : { 'Ok':cancel_func } }
                );

                //grab data from the form
                var form = publisher.get_form('adminface', 'sales_report_dialog');

                //if the form is not valid we stop the user here
                if (!form.validate_form()) {
                    return false;
                }

                //run publisher command to generate report
                var filter_date = form.serialize_form();

                //set loading template
                publisher.run_command( 'adminface', 'update_property', 'dialog', 'sales_report_dialog', '', 0,
                                             { body : $('#loading_template').html() });

                //get report
                publisher.send({
                    'module': 'adminface',
                    'command': 'generate_sales_report',
                    'args': filter_date,
                    'success': function(data, args) {
                        var export_task = new LongTask({
                            id: args.task
                        });

                        var export_task_view = new LongTaskView({
                            model: export_task,
                            el:sales_report_dialog.find('.thm_panel_body')
                        });
                        export_task.fetch(); // in case it already finished
                        export_task_view.render();
                    }
                });

            };

            var dialog_args = { 'width':320, 'title':'Sales report','color':'blue', 'minimize':false,
                                 'footer_style':'max', 'buttons':{'Cancel': cancel_func,'Ok':ok_func} };
            publisher.create_dialog_box_command( 'adminface', 'sales_report_dialog', 'dialog', 'sales_report_dialog',
                                             sales_report_dialog, '0', dialog_args );
        },

        demo_editor: function(tree, item)
        {
            //generate data
            var data_first = '';

            //generate args for dialog
            var cancel_func = function() {
                var edit_demo_dialog = panels.find_el('dialog', 'adminface', 'demo_editor_elem');

                edit_demo_dialog.remove();
            };
            var ok_func = function() {
                //if last one, add final message
                publisher.run_command( 'adminface', 'update_property', 'dialog', 'demo_editor_elem', '', 0,
                                             { 'body' : '<br/><div class="thm_panel_content_title">All unique demos successfuly added.</div>' });
            };

            //setup dialog args
            var args_first = { 'width':300, 'title':'Edit Demos','color':'blue', 'minimize':false,
                         'footer_style':'max', 'buttons':{'Cancel': cancel_func, 'Ok': ok_func} };
            data_first = $('#loading_template').html();
            publisher.create_dialog_box_command( 'adminface', 'demo_editor', 'dialog', 'demo_editor_elem', data_first, '0', args_first );

            //add content to dialog
            publisher.post( 'adminface', 'generate_edit_demos_dialog', '', { }, function(data, args){
                //create dialog
                publisher.run_command( 'adminface', 'update_property', 'dialog', 'demo_editor_elem', '', 0, { body : args.result });

                var edit_demo_dialog = panels.find_el('dialog', 'adminface', 'demo_editor_elem');

                //bind on change function for demo filtering
                //bind update events for filter changes
                $(edit_demo_dialog).find('.thm_panel_toolbar select').change( function(){
                    //get selected item text
                    var selected = '';
                    $(this).find('option:selected').each(function() {
                        selected += $(this).text() + ' ';
                    });

                    //set contents of tree to be a spinner
                    var current_tree = publisher.get_tree('adminface','demo_editor_elem');
                    $(current_tree.root).children().hide();
                    $(edit_demo_dialog).find('#module_items_div').append( $('#loading_template').html() );

                    //get demos that match the category
                    publisher.post( 'demo', 'get_filtered_items', '', {'subject':selected}, function(data,args){
                        //update tree content
                        $(edit_demo_dialog).find('#module_items_div').find('.loading_template').remove();

                        //remove all current items
                        var all_tree_items = current_tree.get_all_items();
                        all_tree_items.each( function(e){
                            current_tree.delete_item( $(this) );
                        });

                        //add new tree demo items
                        var filtered_items = args.result;
                        for(var item_idx in filtered_items) {
                            current_tree.add_item( filtered_items[item_idx].item_text, filtered_items[item_idx].id, '', item_idx, 'generate_demo_instances_dialog' );
                        }

                        //show tree
                        $(current_tree.root).children().show();
                    });
                });
            });
        },

        fix_demo_questions: function (tree, item)
        {
            var panel = panels.add({
                'id': 'fix_demo_questions',
                'module': 'adminface',
                'layout': layouts.get('dialog'),
                'title': 'Fix demo questions',
                'body': $('#loading_template').html(),
                'width': 485,
                'footer_buttons': {
                    'Close': 'remove',
                    'Ok': function() {
                        var dialog = $(panel.get('view').el);
                        if (!dialog) { return false; }

                        if ($(dialog).data('demos')) {
                            $(dialog).data('demos').shift();

                            if ($(dialog).data('demos').length === 0) {
                                panel.remove();
                                return true;
                            }
                        } else {
                            var demos = [];
                            $(dialog).find('#demos_to_fix input:checked').each(function() { demos.push(this.value); });
                            $(dialog).data('demos', demos);
                        }

                        var demo_key = $(dialog).data('demos')[0];
                        var Model = require('Modules').get_module('demo').get('model');
                        var module_item = new Model({ 'id': demo_key });
                        module_item.bind('demo_questions_discovered', function(questions) {
                            publisher.send({
                                'module': 'adminface',
                                'command': 'fix_demo_questions',
                                'args': {'demo_key': demo_key, 'questions':questions}
                            });
                            panel.buttons_trigger('Ok');
                        });
                        module_item.bind_body_el(dialog.find('.thm_panel_body'));
                    },
                    'Force': function() {
                        var dialog = $(panel.get('view').el);
                        var demo_key = $(dialog).data('demos')[0];
                        publisher.send({
                            'module': 'adminface',
                            'command': 'fix_demo_questions',
                            'args': {'demo_key': demo_key, 'questions':[]}
                        });
                        panel.buttons_trigger('Ok');
                    }
                }
            });

            //add content to dialog
            publisher.send({
                'module': 'adminface',
                'command': 'fix_demo_questions_list',
                success: function(data, args) {
                    var html = _.template(fix_demo_questions_template, {'demos': data});
                    panel.set({'body': html});
                }
            });
        },

        generate_demo_instances_dialog: function(tree, item)
        {
            /*
             * callback function when a demo is clicked in the demo editor
             * gets a list of the instances of the demo renders it in the dialog box
             * allows the admin to select the demo instances they wish to change, and posts them back to the server
             */
            publisher.run_command( 'adminface', 'update_property', 'dialog', 'demo_editor_elem', '', 0, { body : $('#loading_template').html() });
            publisher.post( 'adminface', 'generate_demo_instances_dialog', '', { demo_key: item.id }, function(data, args) {
                publisher.run_command( 'adminface', 'update_property', 'dialog', 'demo_editor_elem', '', 0, { body : args.body });

                var dialog = panels.find_el('dialog', 'adminface', 'demo_editor_elem');
                publisher.add_button_command( dialog, 'Ok', function() {

                    var instance_ids = [];
                    var instances = publisher.get_tree('adminface', 'demo_editor_elem').demo_instances.get_selected_items();
                    $(instances).each(function() {  instance_ids.push(this.id); });

                    publisher.run_command( 'adminface', 'update_property', 'dialog', 'demo_editor_elem', '', 0, { body : $('#loading_template').html() });
                    publisher.post('adminface', 'generate_change_demo_files_dialog', '', {'instances': instance_ids});

                    //the generate_change_demo_files_dialog creates a new dialog, so we close this one
                    $(dialog).remove();

                });

                if (!args.demo_public) {
                    publisher.add_button_command( dialog, 'Make public', function() {
                        publisher.post('adminface', 'make_demo_public', '', {demo_key: item.id });

                        //the generate_change_demo_files_dialog creates a new dialog, so we close this one
                        $(dialog).remove();
                    });
                }
            });
        },

        edit_demo_files: function()
        {
            /*
             * called by clicking on the 'Ok' button in the dialog generated on the server-side by generate_change_demo_files_dialog
             * passes in the list of demos to be changed and the fileobj/js demo source to update them with
             * receives a demo preview dialog and renders it
             * calls the demo question function, gets the list of questions, and then updates each demo to be changed with those questions
             *  */

             //send the generate_change_demo_files_dialog form to the server
             var form = publisher.get_form('adminface', 'demo_editor_elem');
             publisher.post('adminface', 'edit_demo_files', '', form.serialize_form(), function(data, args) {
                publisher.run_command( 'adminface', 'update_property', 'dialog', 'demo_editor_elem', '', 0, { body : 'All shiny capn\'n!' });
             });
        },

        edit_demo: function(tree, item)
        {
            /* called by clicking on an individual demo in the demo instances list generated by the generate_demo_instances_dialog command */

            var demo_key = item.get('id');
            var demo_mi = require('Modules').get_module('demo').get('items').get(demo_key);
            if (!demo_mi) {
                var Model = require('Modules').get_module('demo').get('model');
                demo_mi = new Model({'id': demo_key});
            }
            return demo_mi.edit_dialog();
        },


        delete_demos: function()
        {
            /* called by clicking on the delete button in the toolbar of the demo instances list generated by the generate_demo_instances_dialog */
            //get rid of caller dialog
            var settings_dialog = panels.find_el('dialog', 'adminface', 'demo_editor_elem');

            //get course packs selected
            var course_demo_tree = publisher.get_tree('adminface','demo_editor_elem');
            var selected_demos = course_demo_tree.get_selected_items();

            settings_dialog.remove();

            var cancel_func = function() {
                var settings_dialog = panels.find_el('dialog', 'adminface', 'confirm_delete_dialog');

                settings_dialog.remove();
            };

            var yes_func = function() {
                //update dialog with spinner
                publisher.run_command( 'adminface', 'update_property', 'dialog', 'confirm_delete_dialog', '', 0,
                                            { buttons : {'Ok':cancel_func},
                                              body : $('#loading_template').html() });


                //if they're sure then call delete function on publisher with the selected course pack items
                var demo_list = [];
                selected_demos.each( function(e){
                    demo_list.push( course_demo_tree.get_item_id($(this)) );
                });
                publisher.post( 'adminface', 'delete_demos', '', {'demos':demo_list}, function(data,args){
                    //update message
                    publisher.run_command( 'adminface', 'update_property', 'dialog', 'confirm_delete_dialog', '', 0,
                                            { body : '<p class="thm_panel_text">Demos deleted</p>' });
                });
            };

            var dialog_msg = 'Are you sure you would like to delete these demos?(s)?';
            var dialog_buttons = {'Cancel': cancel_func, 'Yes': yes_func};
            if (selected_demos.length === 0)
            {
                dialog_msg = 'You must select at least one demo';
                dialog_buttons = {'Ok': cancel_func};
            }

            //show alert asking if they're sure they want to delete items
            var args = { 'width':200, 'title':'Confirm delete','color':'blue', 'minimize':false,
                          'footer_style':'max', 'buttons':dialog_buttons };

            //create dialog
            publisher.create_dialog_box_command( 'adminface', 'demo_editor_elem', 'dialog', 'confirm_delete_dialog', dialog_msg, '0', args );
        },

        django_admin: function(tree, item)
        {
            //load django admin interacte in iframe
            var data = '<iframe src ="../admin/" width="100%" height="500px">' +
                       '<p>Your browser does not support iframes.</p>' +
                       '</iframe>';

            publisher.add_command( 'adminface', 'add_command', 'content', 'django_admin', data, 0,
                                   {color:'blue', title:'Django admin', minimize:true, footer_style:'max', buttons:{Close:'remove'}} );
        },

        user_search: function(tree, item)
        {
            // this is ugly, but better than more publisher
            var data = '<iframe src ="/admin/superbilling/user_search/" width="100%" height="620px">' +
                       '<p>Your browser does not support iframes.</p>' +
                       '</iframe>';

            publisher.add_command( 'adminface', 'add_command', 'content', 'generate_subscriptioncodes', data, 0,
                                   {color:'blue', title:'Generate Subscription Codes', minimize:true, footer_style:'max', buttons:{Close:'remove'}} );
        },

        create_subscriptions: function(tree, item)
        {
            // this is ugly, but better than more publisher
            var data = '<iframe src ="/admin/superbilling/subscriptioncodes/" width="100%" height="620px">' +
                       '<p>Your browser does not support iframes.</p>' +
                       '</iframe>';

            publisher.add_command( 'adminface', 'add_command', 'content', 'generate_subscriptioncodes', data, 0,
                                   {color:'blue', title:'Generate Subscription Codes', minimize:true, footer_style:'max', buttons:{Close:'remove'}} );
        },

        create_coupons: function(tree, item)
        {
            // this is ugly, but better than more publisher
            var data = '<iframe src ="/admin/superbilling/couponcodes/" width="100%" height="720px">' +
                       '<p>Your browser does not support iframes.</p>' +
                       '</iframe>';

            publisher.add_command( 'adminface', 'add_command', 'content', 'generate_couponcodes', data, 0,
                                   {color:'blue', title:'Generate Coupons', minimize:true, footer_style:'max', buttons:{Close:'remove'}} );
        },

        import_licenses: function(tree, item)
        {
            // this is ugly, but better than more publisher
            var data = '<iframe src ="/admin/superbilling/thirdpartylicenses/" width="100%" height="500px">' +
                       '<p>Your browser does not support iframes.</p>' +
                       '</iframe>';

            publisher.add_command( 'adminface', 'add_command', 'content', 'import_licenses', data, 0,
                                   {color:'blue', title:'Import Third Party Licenses', minimize:true, footer_style:'max', buttons:{Close:'remove'}} );
        },

        user_browser: function(tree, item)
        {
            var panel = panels.add({
                id: 'user_browser',
                module: 'adminface',
                layout: layouts.get('content'),
                body: $('#loading_template').html(),
                title: 'User Browser',
                footer_buttons: {
                    'Close': 'remove'
                }
            });

            var update_panel = function() {
                panel.set({ 'body': $('#loading_template').html() });
                publisher.send({
                    module: 'adminface',
                    command: 'user_browser_list',
                    success: function(data, args){
                        panel.set({'body': ''});
                        panel.set({'body': data});
                        panel.get('view').$('table').dataTable({
                            'sDom': '<"dataTables_controls"f<"cb">>t<"dataTables_controls"ip<"cb">>'
                        });
                        panel.get('view').$('input.verify_user').on('click', function() {
                            publisher.send({
                                'module': 'adminface',
                                'command': 'verify_user',
                                'args': { 'user_key': $(this).attr('id') },
                                'success': function() {
                                    update_panel();
                                }
                            });
                        });
                    }
                });
            };
            update_panel();
        },

        log_browser: function(tree, item)
        {
            var panel = panels.add({
                id: 'log_browser',
                module: 'adminface',
                layout: layouts.get('content'),
                body: $('#loading_template').html(),
                title: 'Log Browser',
                footer_buttons: {
                    'Close': 'remove'
                }
            });



            var update_panel = function() {
                var type = $('#type_filter').val();
                panel.set({ 'body': $('#loading_template').html() });

                publisher.send({
                    module: 'adminface',
                    command: 'log_browser_list',
                    args: {
                        type: type
                    },
                    success: function(data, args){
                        panel.set({'body': ''});
                        panel.set({'body': data});
                        panel.get('view').$('table').dataTable({
                            'sDom': '<"dataTables_controls"f<"cb">>t<"dataTables_controls"ip<"cb">>'

                        });
                        $('#log_filter_button').click(function() {
                            update_panel();

                        });
                    }
                });
            };
            update_panel();

        },

        consistency_check: function(tree, item)
        {

        },

        unit_tests: function(tree, item)
        {

        },

        migration_script: function(tree, item)
        {
            publisher.post('adminface', 'migration_script', '', {}, function () {
                var data = 'Migration Script started.';
                publisher.create_message_dialog_box_command(
                    'publisher',
                    'migration_script_submitted_dialog',
                    'Success',
                    data,
                    undefined,
                    300
                );
            });
        },

        flush_memcache: function(tree, item)
        {
            publisher.post('adminface', 'flush_memcache', '', {}, function () {
                var data = 'Memcache flushed';
                publisher.create_message_dialog_box_command( 'publisher', 'memcache_flushed_dialog', 'Memcache flushed', data,
                        undefined, 300);
            });
        },

        init_callback: function()
        {
            this.initialize_control_panel();

            //change layout to ger rid of the status bar
        //    publisher.render_layout( 1010, 200, 805, 0 );
        },

        destruct_callback: function()
        {

        },

        close_dialog: function() {
            var panel = panels.get('demo_editor_elem');
            panel.remove();
        }

    });

    ImpersonateUserView = Backbone.View.extend({
        events: {
            'click .search': 'search'
        },
        search: function () {
            var username = this.$('input[name=username]').val();
            if (!username) { return; }
            this.$('.results').html($('#loading_template').html());
            publisher.send({
                module: 'adminface',
                command: 'impersonate_user',
                args: {
                    username: username
                },
                success: function (data, args) {
                    var user = args.user;
                    this.$('.results').html('<p>Found user: ' + user.username + ' at ' + user.orgname + '</p>');
                    this.model.set({
                        footer_buttons: {
                            'Cancel': 'remove',
                            'Impersonate': function () {
                                window.location.href = '/impersonate/'+user.id+'/';
                            }
                        }
                    });
                }.bind(this)
            });
        },
        render: function () {
            this.$el.html(impersonate_user_template);
            this.model.set({body: this.el});
        }
    });

    FixTreeView = Backbone.View.extend({
        events: {
            'click .search': 'search'
        },
        fix_it: function (public_code, module) {
            publisher.send({
                module: 'adminface',
                command: 'fix_tree',
                args: {
                    public_code: public_code,
                    module: module
                },
                success: function () {
                    this.model.remove();
                }.bind(this)
            });
        },
        search: function () {
            var public_code = this.$('input[name=public_code]').val();
            if (!public_code) { return; }
            publisher.send({
                module: 'adminface',
                command: 'course_search',
                args: {
                    public_code: public_code
                },
                success: function (data, args) {
                    var course = args.course;
                    this.$('.results').show();
                    this.$('.course_name').text('Found course: ' + course.name + ' at ' + course.orgname);
                    _.each(args.modules, function (module) {
                        this.$('select').append('<option>'+module+'</option>');
                    }.bind(this));
                    this.model.set({
                        footer_buttons: {
                            'Cancel': 'remove',
                            'Fix it!': function () {
                                this.fix_it(public_code, this.$('select').val());
                            }.bind(this)
                        }
                    });
                }.bind(this)
            });
        },
        render: function () {
            this.$el.html(fix_tree_template);
            this.model.set({body: this.el});
        }
    });
    return Adminface;
});
