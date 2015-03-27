/* global _, Backbone */
define([
    'panels/Panel',
    'layouts/edumacation/LayoutCollection'
], function (
    Panel,
    layouts
) {
    /* filtering, sorting, and adding panels */
    'use strict';
    var Panels = Backbone.Collection.extend({
        idAttribute: 'id',
        model: Panel,
        add : function(models, options) {
            //replaces backbone's built-in collection, returning the instances
            //of the newly added models
            var result = [];
            var existing;
            var panel;
            if (_.isArray(models)) {
                for (var i = 0, l = models.length; i < l; i++) {
                    // remove any other panels with that id
                    existing = this.get(models[i].id);
                    if (existing !== undefined) {
                        existing.remove();
                    }
                    panel = this._prepareModel(models[i], options);
                    result.push(panel);
                    Backbone.Collection.prototype.add.call(this, panel, options);
                }
            } else {
                // remove any other panels with that id
                existing = this.get(models.id);
                if (existing !== undefined) {
                    existing.remove();
                }
                panel = this._prepareModel(models, options);
                result = panel;
                Backbone.Collection.prototype.add.call(this, panel, options);
            }
            return result;
        },
        in_layout: function(layout_name)
        {
            if( layout_name == undefined ) { return this; }
            var layout = layouts.get(layout_name);
            var filtered_panels = this.filter(function(panel) {
                return panel.get('layout') == layout;
            });
            return new Panels(filtered_panels);
        },
        in_module: function(module)
        {
            if( module == undefined ) { return this; }
            var filtered_panels = this.filter(function(panel) {
                return panel.get('module') == module;
            });
            return new Panels(filtered_panels);
        },
        find: function( category_id, module_id, element_id )
        {
            /*
             * Convenient shortcut to find elements by category, module, or element_id
             * returns a list of panel instances
             */

            if( element_id )
            {
                var panel = panels.get( element_id );
                return panel ? new Panels( panel ) : undefined;
            }

            var filtered_panels = new Panels(panels.toArray());

            if( category_id ) {
                filtered_panels = filtered_panels.in_layout(category_id);
            }

            if( module_id ) {
                filtered_panels = filtered_panels.in_module(module_id);
            }

            return filtered_panels;
        },
        find_el: function( category_id, module_id, element_id )
        {
            var filtered_panels = panels.find( category_id, module_id, element_id );
            if( !filtered_panels ) {
                return $([]);
            } else {
                return $(filtered_panels.map(function(panel) { return panel.get('view').el; }));
            }
        },
        get_from_dom_element: function( el )
        {
            /*
             * Takes in a DOM element that represents a THM Panel, and returns the matching panel object instance
             */

            //ensure the element matches the PanelView's class (simple check to make sure we're analyzing the right element)
            if( !$(el).hasClass('thm_panel') ) {
                return false;
            }

            return this.find( undefined, $(el).attr('module_id'), $(el).attr('element_id')).first();
        }
    });
    return Panels;
});
