/* global panels, _, google */
define([
    'views/feedback/student',
    'layouts/edumacation/LayoutCollection',
    'lobby/PresentationTool',
    'util/Browser',
    'text!templates/feedback/teacher.html'
], function (
    StudentFeedbackView,
    layouts,
    PresentationTool,
    Browser,
    TeacherFeedbackViewTemplate
) {
    'use strict';

    var InstructorFeedbackView = StudentFeedbackView.extend({
        tagName: 'tr',
        panel_id: 'instructor_feedback',
        panel_template: '<table id="feedback_items" class="magnify_scale_font" magnify_max_font="40"></table>',
        initialize: function () {
            StudentFeedbackView.prototype.initialize.call(this);
            this.listenTo(window.course, 'change:sms_enabled', this.render, this);
            this.listenTo(this.model, 'change:data', this.render, this);
        },
        get_shared_panel: function() {
            var panel, magnify, demagnify;
            panel = panels.get(this.panel_id);
            if (!panel) {
                magnify = function () {
                    // Reuse the magnification code in the ModuleItem model.
                    this.model.button_callbacks.Magnify.callback(this.model);
                }.bind(this);

                demagnify = function () {
                    // TODO: This code seems to be unused.
                    if (Browser.is_presentation_tool()) {
                        // stolen from module_items.js
                        //determine if the layout is currently magnified; this may happen if
                        //another module item triggered the magnify process for the layout
                        //should eventually be refactored to listen for a 'magnify' or 'demagnify' event
                        //on the layout and change the buttons accordingly
                        var layout = this.get('layout');
                        if (layout.is_magnified) {
                            layout.is_magnified = false;
                            PresentationTool.resize_pt(window.prev_width, window.prev_height, true, true);
                        }
                    } else {
                        try {
                            this.get('view').$el.dialog('destroy'); //close dialog
                        } catch(e) {} //mobile site does not use dialogs, so this will fail

                        this.get('view').$el.trigger('destroy');
                        this.get('view').$el.show(); //destroying dialog will cause panel to be hidden

                        this.set({
                            layout: layouts.get('content')
                        }, {silent: true});

                        this.get('layout').add(this);
                        this.unbind('redo_magnify');
                        this.get('view').$el.trigger('magnifydestroy'); //inform any listeners that magnification has been ended
                    }
                    this.set({
                        footer_buttons: {
                            'Magnify': {
                                icon: 'magnify',
                                callback: magnify.bind(this)
                            }
                        }
                    });
                };

                panel = panels.add({
                    id: this.panel_id,
                    layout: layouts.get('content'),
                    module: 'feedback',
                    title: 'Feedback',
                    minimize: true,
                    body: this.panel_template,
                    color: 'green'
                });

                panel.set({
                    footer_buttons: {
                        'Magnify': {
                            icon: 'magnify',
                            callback: magnify.bind(panel)
                        }
                    }
                });

                panel.get('view').$el.resize(function () {
                    this.$('.graph').empty();
                    this.$('tr').trigger('redraw');
                }.bind(panel.get('view')));


                if (window.user.is_teacher()) {
                    panel.$('.thm_panel_bottom').css('text-align', 'left');
                }
            }
            return panel;
        },
        render: function() {
            var data = this.model.get('data') ? this.model.get('data') : [0];
            var label = _.last(data);
            var sms_key_str = window.course.get('sms_enabled') && this.model.get('sms_key') ? '<span class="sms_code">' + this.model.get('sms_key') + '</span>' : '';

            var html = _.template(TeacherFeedbackViewTemplate, {
                title: this.model.get('title'),
                sms_key: sms_key_str,
                id: this.model.get('id'),
                data: data,
                label: label,
                max: _.max(data)
            });

            this.$el.html(html);
            this.$el.attr('id', this.model.get('id'));
            if( window.google ) {
                if( google.visualization ) {
                    this.$el.on('redraw', this.render_chart.bind(this));
                    this.render_chart();
                } else {
                    google.load('visualization', '1', {
                        'packages':['corechart'],
                        'callback': $.proxy(function() { this.render_chart(); }, this)
                    }); //required by feedback; can't be dynamically loaded or stored in cache (bug?)
                }
            }
            if (window.is_magnified) {
                // we need to resize when we add a new item
                $(window).trigger('resize');
            }
        },

        render_chart: function() {
            if(!window.google || !google.visualization || !google.visualization.DataTable) { return; }

            var data = this.model.get('data') ? this.model.get('data') : [0];
            var dt = new google.visualization.DataTable();
            var dd = _.map(data, function(item) { return ['', item]; });
            dt.addColumn('string', '');
            dt.addColumn('number', 'Votes');
            dt.addRows( dd );

            var graph_el = this.$('.graph')[0];

            if( graph_el ) {
                var chart = new google.visualization.AreaChart( graph_el );
                var bl = _.max(data) + 0.1;
                chart.draw(dt, {
                    legend: 'none',
                    hAxis: {'textPosition':'none'},
                    vAxis: {'textPosition':'none', baseline: bl, baselineColor: 'none'},
                    chartArea: { left: 0, top: 0, width: '100%', height: '100%' }
                });

                google.visualization.events.addListener(chart, 'onmouseover', function(e) {
                    var data = this.model.get('data');
                    var value = data[e.row];
                    var mins_ago = data.length - e.row;
                    this.model.get('view').$('.details .amount i').text(mins_ago + ' min ago');
                    this.model.get('view').$('.details .amount b').text(value);
                    return false;
                }.bind(this));
            }

            if( !this.model.get('view') ) { return; }
            this.model.get('view').$('.graph').bind('mouseout', function() {
                var data = this.model.get('data');
                var value = _.last(data);
                this.model.get('view').$('.details .amount i').text('Now');
                this.model.get('view').$('.details .amount b').text(value);
            }.bind(this));
        },

        magnify_function: function() {
            // TODO: This code seems to be unused.
            var panel = panels.get(this.panel_id);
            // This is an extreme hack...
            // We want to use the same code as the ModuleItem's magnify and demagnify models, but
            // we are calling it on a panel that does not have an associated module item. we therefore
            // create a temporary module item and associate the panel with it, then call the Magnify or Demagnify
            // commands. Lastly, we store whether the panel is magnified or not (normally stored in the module item)
            var mi = this.model; //new FeedbackItem({"panel": panel});
            mi.set({'panel': panel}, {silent: true});

            if( !panel.is_magnified ) {
                panel.is_magnified = true;
                mi.button_callbacks.Magnify.callback(mi);
                panel.set({
                    footer_buttons: {
                        'Demagnify': $.proxy(this.magnify_function, this)
                    }
                });
            } else {
                panel.is_magnified = false;
                mi.button_callbacks.Demagnify.callback(mi);
                panel.set({
                    footer_buttons: {
                        'Magnify': $.proxy(this.magnify_function, this)
                    }
                });
            }

            //ugh, another hack...
            //module items are shown in a table, so all of the graphs must be cleared at once in order for width to be
            //reset from the fixed graph width; we do this before we re-render any graphs
            $(panel.get('view').el).find('tbody .graph').html('');

            //misery loves company; here's another janky hack that gets the views of all visible feedback items
            //and re-draws their graphs
            var visible_feedback_items = require('Modules').get_module('feedback').items().filter(function(item) { return item.is_visible(); });
            _.each(visible_feedback_items, function(item) {
                item.get('view').render_chart();
            });

            mi.set({'panel': undefined}, {silent: true});
            return false;
        }
    });

    return InstructorFeedbackView;
});
