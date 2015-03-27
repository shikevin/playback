/* globals Backbone, _, publisher, ThmTree, ThmForm, site_data */
define([
    'panels/PanelView',
    'util/accessibility',
    'Modules',
    'util/Browser'
], function (
    PanelView,
    Accessibility,
    Modules,
    Browser
) {
    'use strict';
    var Panel = Backbone.Model.extend({
        idAttribute: 'id',
        defaults: {
            title: '',
            module: null
        },
        // TODO: make Panel a view
        initialize: function() {
            /**
             * Represents a panel UI component in the application.
             * @class Panel
             * @extends Backbone.Model
             * @constructor
             */
            this.set_aria_attributes();
            this.set({
                view: new PanelView({ id: this.id, model: this })
            });

            if( this.get('layout') ) {
                this.get('layout').add(this);
                this.get('layout').trigger('add', this); //this is the only way elemnts will know of an addition to a layout (useful for tutorials, for example)
            }

            //set up the change: event handlers
            this.bind('change:body', function() {
                //if a fixed height is specified, reposition accordingly
                if( this.get('height') ) {
                    var body = $(this.get('view').el).children('.thm_panel_body');

                    //get the height of every element that is not the body
                    var combined_height = 0;
                    body.siblings().each(function() {
                        combined_height += $(this).height();
                    });

                    body.height( this.get('height') - combined_height );
                }
                this.get('view').render_body();
                this.bind_standard_events();
                this.get('view').$el.trigger('resize');
            });
            this.bind('change:footer_buttons', function() {
                this.get('view').render_footer();
            });

            this.bind('change:layout', function() {
                $(this.get('view').el).detach();
                if( this.get('layout') ) {
                    this.get('layout').add(this);
                    this.get('layout').trigger('add', this); //this is the only way elemnts will know of an addition to a layout (useful for tutorials, for example)
                }
            });

            this.bind('change:id', function() { this.get('view').render_header(); });
            this.bind('change:module', function() { this.get('view').render_header(); });
            this.bind('change:title', function() { this.get('view').render_header(); });
            this.bind('change:color', function() { this.get('view').render_header(); });
            this.bind('change:toolbar', function() { this.get('view').render_toolbar(); });

            this.add_panel_user_cue();

            //initialize the change: commands
            if (this.get('body')) {
                this.trigger('change:body');
            }

            var $view_el = this.get('view').$el;
            $view_el.on('remove', function () {
                // If element is removed via jQuery, remove this panel
                this.remove();
            }.bind(this));

            $view_el.on('focus', function () {
                this.trigger('focus');
            }.bind(this));
        },
        $: function(selector) {
            var result = $(this.get('view').el);
            if( selector ) {
                result = result.find(selector);
            }
            return result;
        },
        $b: function(selector) {
            var result = this.$('.thm_panel_body');
            if( selector ) {
                result = result.find( selector );
            }
            _.defer(function () {
                result.trigger('resize');
            });
            return result;
        },
        set_aria_attributes: function () {
            if (this.get('id').indexOf('_control_panel') > 0) {
                // left navigation
                this.set({
                    'aria_label': this.get('title'),
                    'role': 'navigation'
                });
            } else if (this.get('module') === 'publisher') {
                // dialog
                this.set({
                    'aria_label': this.get('title'),
                    'role': 'dialog'
                });
            } else {
                if (this.get('title') === 'Attendance'){
                    this.set('aria_label', 'Attendance');
                } else {
                    this.set('aria_label', this.get('module') + ' ' + this.get('title'));
                }
            }
        },
        bind_standard_events: function() {
            var element = this.get('view').el;
            var module_id = this.get('module');
            var category_id = this.get('layout').id;
            var element_id = this.get('id');
            var len, idx;

            //setup toolbar button
            if( $(element).find('.toolbar_button').length > 0 )
            {
                publisher.bind_toolbar_button_events( module_id, $(element).find('.toolbar_button') );
            }

            var element_body = publisher.get_element_body(category_id, module_id, element_id);

            //generate panelized elements
            var panelized = element_body.find('.thm_internal_panel');
            if( element_body && (panelized.length > 0) && typeof $.fn.mapAttributes === 'function')
            {
                panelized.each( function(){
                    //grab args if any
                    var panel_args = {};
                    var panel_attributes = $(this).mapAttributes();
                    _.each(panel_attributes, function (attr_val, attribute) {
                        if( attribute.search('args_') !== -1 )
                        {
                            var attr_name = attribute.replace('args_','');
                            panel_args[ attr_name ] = attr_val;
                            if( attr_val.indexOf('{') !== -1 ) {
                                panel_args[ attr_name ] = JSON.parse(attr_val);
                            }
                        }
                    });

                    //get panel content and clear internals
                    var content = $(this).html();
                    $(this).children().remove();

                    //add panel with new content
                    publisher.generate_element( $(this), content, panel_args );

                    //setup toobar buttons
                    publisher.bind_toolbar_button_events( module_id, $(this).find('.toolbar_button') );
                });
            }


            //create tree, if tree doesn't exist, will fail silently TODO: efficient silent fail?
            if (element_body && !Browser.is_sandbox_app) {
                len = element_body.find('.thm_tree').length;
                idx = 0;

                element_body.find('.thm_tree').each( function(i, el){
                    var tree = new ThmTree();
                    tree.convertHtml( $(el) );

                    tree.bind('callback', function(callback_string, tree, item) {
                        var module = Modules.get_module(this.get('module'));
                        var func = module[callback_string];
                        if( func ) { func(tree, item); }
                    }.bind(this));
                }.bind(this));
            }

            //generate form elements
            var forms = element_body.find('.thm_form').not('[no_auto_convert]');
            if( element_body && (forms.length > 0) )
            {
                len = forms.length;
                idx = 0;
                publisher.form_dict[module_id + '_' + element_id] = {};

                forms.each( function(){
                    var form = new ThmForm();
                    form.option_image_path = site_data.settings.MEDIA_URL + 'images/edumacation/icons/';
                    form.callback_object = Modules.get_module(module_id);
                    form.convertHtml( $(this) );

                    //add to dictionary of forms
                    if( (len > 1) || $(this).attr('name') )
                    {
                        var name = $(this).attr('name');
                        if( name ) {
                            publisher.form_dict[module_id + '_' + element_id][name] = form;
                        }
                        else {
                            publisher.form_dict[module_id + '_' + element_id][idx] = form;
                        }
                        idx++;
                    }
                    else {
                        publisher.form_dict[module_id + '_' + element_id] = form;
                    }
                });
            }
        },
        add_panel_user_cue: function () {
            if(!this.get('previously_activated')){
                if($(this.get('view').el).parent().parent().attr('id') === 'course_content'){
                    var alert_msg = '';
                    if (this.get('view').model.get('title') === 'Attendance') {
                        alert_msg = 'An attendance item has been presented ';
                    } else {
                        var module_type = this.get('view').model.get('module');
                        alert_msg =  'A ' + module_type +
                        ' item has been presented ';
                    }

                    //get index of newly added panel (human indexing is 1 plus js indexing)
                    var num2string = ['', 'second', 'third'];
                    var posindex = $('#course_content .panels #' + this.attributes.id).index();
                    if (posindex <= 0) {
                        alert_msg += 'at the top of the course content.';
                    } else if (posindex < num2string.length) {
                        alert_msg += num2string[posindex] + ' from the top of the course content.';
                    } else {
                        alert_msg += 'in position ' + (posindex+1) + ' from the top of the course content.';
                    }

                    Accessibility.SR_alert(alert_msg);
                    this.set_panel_focus();
                }
            }
        },
        remove_panel_user_cue: function () {
            // Only trigger alert if the panel is being removed
            // from the course content
            var child_id = '#' + $(this).attr('id');
            if ($(child_id, '#course_content').length === 1) {
                var alert_msg = '';
                if (this.get('view').model.get('title') === 'Attendance') {
                    alert_msg = 'An attendance item has been removed from the course content. ';
                } else {
                    var module_type = this.get('view').model.get('module');
                    alert_msg =  'A ' + module_type +
                    ' item has been removed from the course content. ';
                }
                Accessibility.SR_alert(alert_msg);
            }
        },
        set_panel_focus: function () {
            var focused_element = document.activeElement;
            if (focused_element === null ||
                focused_element.tagName.toLowerCase() === 'body' ||
                focused_element.id === 'course_wrapper' &&
                !this.get('previously_activated')) {
                    $('#course_content').focus();
            }
        },
        priority: function () {
            // sometimes we hard-code the panel priority
            var explicit_priority = this.get('priority'),
                ret;
            if (explicit_priority === undefined) {
                explicit_priority = 100; //set to a high number
            }

            // sorting based only on order
            ret = {
                order: explicit_priority,
                last_activated_at: undefined,
                index: undefined
            };

            // sometimes we have module-based sorting as well
            var module = Modules.get_module(this.get('module'));
            if (module) {
                var tree = module.get('tree');
                var tree_item = tree.get_item(this.get('id'));

                // tree_item is false if tree can't find the item
                if (tree_item) {
                    // concatenate the activation date with the tree index
                    var activated = tree_item.get('last_activated_at');
                    var index = tree.indexOf(tree_item);
                    ret = {
                        order: explicit_priority,
                        last_activated_at: activated,
                        index: index
                    };
                }
            }
            return ret;
        },
        sync: function () {},
        remove: function() {
            if (this.get('removed') !== true) {
                this.set('removed', true);
                this.remove_panel_user_cue();
                this.destroy();
            }
        },
        loading: function() {
            this.$b().html( $('#loading_template').html() );
        },
        tabs: function(/*id, title, body*/) {
            /* usage varies based on properties passed in
             * if nothing passed empty, returns a list of tabs [{id:'',title:'',body:''},{id:'',title:'',body:''}]
             * if id passed in, returns data on tab with matching id {id:'',title:'',body:''}
             * if id + title + body passed in, generates or updates tab (if no tabs present in body, erases content)
             */
             //TODO: refer to publisher_elements.update_body_command
        },
        add_tab: function(id, title, data, index) {
            //TODO: replace with something more consistent
            var id_selector = '#' + id;

            // This will be true/false.  if true, the tab already exists.
            var existing_tab = this.get('view').$('.ui-tabs').find('a[href="' + id_selector + '"]').length > 0;

            if(!existing_tab){
                var html = $('<div></div>').attr('id', id).html(data);
                this.get('view').$('.ui-tabs').append(html);
                this.get('view').$('.ui-tabs').tabs('add', '#' + id, title, index);

                //update the body property
                var ex_body = $.extend([], this.get('body'));
                ex_body.push([id, title, data]);

                this.get('view').$('.ui-tabs').unbind('tabsshow').bind('tabsshow', function () {
                    $(window).trigger('resize');
                });
            }
        },
        remove_tab: function(index) {
            this.get('view').$('.ui-tabs').tabs('remove', index);
        },
        select_tab: function(id) {
            /**
             * Selects a tab by index or by id
             * @method select_tab
             * @param {mixed} id The numerical index or href of the tab to be
             * selected.
             */
            this.get('view').$('.ui-tabs').tabs('select', id);
        },
        update_tab: function(id, body) {
            this.get('view').$('.ui-tabs #' + id).html(body);

            var ex_body = $.extend([], this.get('body'));
            _.each(ex_body, function(data, key) {
                if( data[0] === id ) { ex_body[key][2] = body; }
            });
            // this.set({ body: ex_body }, {silent: true});

            //binding events?
        },
        get_tab_el: function(id) {
            return this.get('view').$('.ui-tabs #' + id);
        },
        $el: function(selector) {
            var jq = $(this.get('view').el);
            if( selector ) {
                return jq.find(selector);
            } else {
                return jq;
            }
        },
        update_from_post: function(module, command_id, data, args) {
            publisher.post(module, command_id, data, args, function(data, args) {
                this.set({body: args.result});
            });
        },
        trees: function() {
            //TODO: why doesn't the old way work for course packs?
            var trees = [];
            this.$el('.thm_tree').each(function() { trees.push($(this).data('tree')); });
            return trees;
        },
        tree: function() {
            //convenience function for .trees(); returns an individual tree object
            var trees = this.trees();
            if (trees.length !== 1) {
                throw 'Don\'t know which tree to get';
            } else {
                return trees[0];
            }
        },
        form: function() {
            return publisher.get_form(this.get('module'), this.get('id'));
        },
        // TODO cForms and cForm don't seem to be used anywhere.
        cForms: function() {
            var forms = [];
            this.$el('.cForm').each(function() {
                forms.push( $(this).data('cForm') );
            });
            return forms;
        },
        cForm: function(id) {
            var forms = this.cForms();
            if( id ) {
                var result;
                _.each(forms, function (form) {
                    if( form.get_id() === id ) {
                        result = form;
                    }
                });
                return result;
            }

            return forms[0];
        },
        //TODO: set up button functions for panel
        //calling panel.set({ footer_buttons: {title1: fn1} }) == panel.buttons.clear(); panel.buttons.add({title1: fn1});
    //    buttons: {
    //        add: function(options) {}, //can pass in (title, fn), or ({ title1: fn1, title2: fn2, ... })
    //        remove: function(options) {}, //can pass in (title), or ([title1, title2, ...])
    //        clear: function() {}, //removes all buttons
    //        replace: function(old_title, new_title, fn) {}, //replaces an old button with a new one
    //        list: function() {}, //returns a list of buttons: [title1, title2, title3, ...]
    //        reorder: function(options) {}, //can pass in (title, index) or ([title1, title3, title2, ...])
    //        disable: function(title, hide) {}, //can disable a button; optional hide button will make it dissapear altogether
    //        enable: function(title) {}
    //    },
        buttons_trigger: function(name) {
            var button = this.get('view').$('.footer_button').filter(function() { return $(this).text() === name; });
            $(button).click();
            return true;
        }
    });
    return Panel;
});
