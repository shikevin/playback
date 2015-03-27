/* globals Backbone, publisher, _ */
define([
    'text!templates/publisher/panel_view.html',
    'text!templates/publisher/toolbar_filter_form.html'
], function (panel_view_html, html) {
    'use strict';
    var PanelView = Backbone.View.extend({
        // tagName: "li",
        className: 'thm_panel',
        events: {
            'click .thm_panel_header.minimize': 'minimize',
            'keyup .thm_panel_header.minimize': 'keyup'
        },
        initialize: function() {
            this.listenTo(this.model, 'change:minimize', this.render_header);
            this.render();
        },
        render_body: function() {
            //generate the body of the panel
            //we do not pass in the body as a string variable to the template, as some panels pass in DOM representations of an element
            // //(e.g. a fuly initialized DataTable). If we were to convert this into a string, it would loose it's JS bindings
            var body = this.model.get('body');
            if (_.isArray(body))
            {
                //if we are passed an array of elements [[id, title, body],[id,title,body]], we create tabs with them
                var combined_body = publisher.generate_tab_panel(); //setup container
                _.each(body, function (elem_array) {
                    if (elem_array.length >= 3) {
                        publisher.add_tab(elem_array[0], elem_array[1], elem_array[2], $(combined_body), false);
                    }
                });
                body = combined_body;
            }
            $(this.el).find('.thm_panel_body').html(body);

            //set up tabs
            if (this.$('.thm_tabbed_panel').length > 0) {
                var model = this.model;
                publisher.tabs_dict[this.$('.thm_tabbed_panel').attr('id')] = this.$('.thm_tabbed_panel').tabs({
                    select: function () {
                        setTimeout(function () {
                            model.trigger('redo_magnify');
                        }, 0);
                    }
                });
            }

            // When a tab is selected in the panel, trigger the tabsshow and tabsselect events on the panel
            // This allows us to bind for tab change events before the panel's body has been set
            this.$('.thm_tabbed_panel').bind('tabsshow', $.proxy(function() {
                this.model.trigger('tabsshow');
            }, this));

            this.$('.thm_tabbed_panel').bind('tabsselect', $.proxy(function(evt, ui) {
                this.model.trigger('tabsselect', ui.index);
            }, this));
        },
        render_footer: function() {
            if( this.model.get('footer_style') ) {
                $(this.el).find('.thm_panel_footer').addClass('thm_panel_footer_' + this.model.get('footer_style'));
            }

            if( this.model.get('footer_buttons') ) {
                publisher.update_buttons_command( this.el, this.model.get('footer_buttons') );
                this.$('.thm_panel_body').removeClass('thm_panel_bottom');
                this.$('.thm_panel_footer').addClass('thm_panel_bottom');
            } else {
                this.$('.thm_panel_footer').removeClass('thm_panel_bottom');
                this.$('.thm_panel_body').addClass('thm_panel_bottom');
            }

        },
        render_toolbar: function() {
            var toolbar_visible = false; //we are sometimes passed args["toolbar"] values of {}, which evaluate as tru
            if( this.model.get('toolbar') )
            {
                _.each(this.model.get('toolbar'), function (func, button) {
                    //add button or filter to toolbar
                    if( button === 'filter' )
                    {
                        //add filter form
                        this.$('.thm_panel_toolbar').prepend(html);
                    }
                    else
                    {
                        var icons = {
                            'add_button': 'add_button button',
                            'delete_button': 'delete_button icon',
                            'folder_button': 'folder_button icon add-folder'
                        };
                        var alt_titles = {
                            'panel_add_folder': 'Add folder',
                            'delete_items': 'Delete selected items',
                            'add_item': 'Add item'
                        };
                        var function_name = this.model.get('toolbar')[button];
                        var title_name = alt_titles[function_name] || function_name.replace(/_/gi,' '); //add title so that buttons have tooltips
                        //var $btn = $('<div class="toolbar_button"><span class="text_label"></span></div>');
                        var $btn = $('<button type="button" class="btn btn-primary toolbar_button"></button>');
                        $btn.addClass(icons[button]);
                        $btn.attr('title', title_name);
                        $btn.attr('function_name', this.model.get('toolbar')[button]);

                        if(button === 'add_button'){
                            //$btn.find('span').html('Create');
                            $btn.text('Create');
                        }
                        //var $btn = $('<div class="toolbar_button '+button+'" title="' + title_name + '" function_name="'+ this.model.get('toolbar')[button] +'"><span class="text_label"></span></div>' );

                        this.$('.thm_panel_toolbar').prepend($btn);
                    }
                    toolbar_visible = true;
                }, this);
            }

            if( toolbar_visible ) {
                this.$('.thm_panel_toolbar').addClass('toolbar_active');
            }
        },
        render_header: function() {
            $(this.el).attr('module_id', this.model.get('module'));
            $(this.el).attr('element_id', this.model.get('id'));
            $(this.el).attr('role', this.model.get('role'));
            if (this.model.get('role') === 'navigation') {
                this.$('.thm_panel_header').attr('tabindex', '0');
            }
            $(this.el).attr('aria-label', this.model.get('aria_label'));

            if (this.model.get('role') === 'dialog'){
                $(this.el).attr('aria-describedby', this.model.get('id') + '_body');
            }

            $(this.el).addClass(this.model.get('color'));

            if( this.model.get('small_header') ) {
                this.$('.thm_panel_header').addClass('thm_panel_header_small');
            }

            this.$('.thm_panel_header .buttons .minimize_button').remove();
            if( this.model.get('minimize') ) {
                this.$('.thm_panel_header').addClass('minimize');
                this.$('.thm_panel_header').attr('aria-expanded', 'true');
                this.$('.thm_panel_header .buttons').append('<div title="Minimize" class="minimize_button icon"></div>');
            }
            if( this.model.get('close') ) {
                this.$('.thm_panel_header .buttons .close_button').remove();
                this.$('.thm_panel_header .buttons').append('<div title="Close" class="close_button"></div>');
                this.$('.thm_panel_header .buttons .close_button').click(function() {
                    this.remove();
                }.bind(this));
            }
        },

        render: function() {
            var template_data = this.model.toJSON();
            var rendered_panel_view = _.template(
                panel_view_html,
                template_data
            );
            this.$el.html(rendered_panel_view);
            this.render_header();
            this.render_toolbar();
            this.render_footer();
            this.render_body();
            return this;
        },
        minimize: function (e) {
            if (this.$el.hasClass('thm_panel_hidden')) {
                // log how long it was minimized for
                var dt = new Date() - this.minimized_at;
                var data = {
                    module_id: this.model.get('module'),
                    minimized_duration: dt/1000  // seconds are preferred
                };
                this.$('.thm_panel_header').attr('aria-expanded', 'true');
                window.Daedalus.track('expanded_panel', data);
            } else {
                this.$('.thm_panel_header').attr('aria-expanded', 'false');
                this.minimized_at = new Date();
            }
            this.$el.toggleClass('thm_panel_hidden');
        },
        keyup: function (e) {
            if (e.which === $.ui.keyCode.ENTER) {
                this.minimize(e);
            }
        }
    });
    return PanelView;
});
