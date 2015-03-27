/* global _, Backbone, Magnify */
define([
], function (
) {
    'use strict';

    var Layout = Backbone.Model.extend({
        idAttribute: 'id',
        add_view: function (panel) {
            var $el = $(this.get('el'));
            var $pel = panel.get('view').$el;
            var panel_position = this.panels.indexOf(panel);
            var next_panel_el = $el.children().eq(panel_position);
            if( next_panel_el.length ) {
                next_panel_el.before($pel);
            } else {
                $el.append($pel);
            }

            panel.bind('remove', function () {
                $pel.remove();
            });

            // When the `redo_magnify` event is triggered, redo magnification
            panel.bind('redo_magnify', function () {
                var el = panel.get('view').$el.find('.thm_panel_body');
                // Get current scroll height so that it can be reset once elements have been magnified
                var scroll_pos = $('#course_wrapper').scrollTop();
                Magnify.reset($(el));
                if (window.is_fullscreen) {
                    Magnify.magnify($(el), $(window).height() - 140, $(el).width());
                    $('#course_wrapper').scrollTop(scroll_pos);
                }
            });
        },
        add: function (panel) {
            var result = this.panels.add(panel);
            this.add_view(panel);
            return result;
        },
        set_render_class: function (render_class) {
            $(this).extend(this, render_class);
            this.initialize();
            return this;
        },
        initialize: function () {
            this.panels = new Backbone.Collection();
            this.panels.comparator = function (panelA, panelB) {
                var p1 = panelA.priority(), p2 = panelB.priority();
                //If either priority is undefined, then the defined one ranks ahead
                if (p1 === undefined || p2 === undefined)  {
                    if (p1 !== undefined) {
                        return -1;
                    } else if (p2 !== undefined) {
                        return 1;
                    } else {
                        return 0;
                    }
                }

                //sort by the order value (smallest value goes first)
                if (p1.order !== p2.order) {
                    return p1.order < p2.order ? -1 : 1;
                }
                // next, order by last_activated (may be undefined)
                if (p1.last_activated_at > p2.last_activated_at) {
                    return -1;
                } else if (p1.last_activated_at < p2.last_activated_at) {
                    return 1;
                }
                // next by tree index (may be undefined)
                if (p1.index < p2.index) {
                    return -1;
                } else if (p1.index > p2.index) {
                    return 1;
                }
                // finally, give priority to what is defined
                if (p1.last_activated_at !== undefined || p1.index !== undefined) {
                    return -1;
                } else if (p2.last_activated_at !== undefined || p2.index !== undefined) {
                    return 1;
                } else {
                    return 0;
                }
            };
        },
        clear: function () {},
        $el: function (selector) {
            var jq = $(this.get('el'));
            if (selector) {
                return jq.find(selector);
            } else {
                return jq;
            }
        }
    });

    return Layout;
});
