define([
    'layouts/mobile/Pages'
], function (
    PagesLayout
) {
    'use strict';
    var PTPagesLayout = $.extend({}, PagesLayout, {
        add_view: function (panel) {
            PagesLayout.add_view.apply(this, [panel]);
            //rather than focus on the current panel, we'll focus on the first panel
            //we do this becuase panel orders are based partially on time, so as new items are added
            //they will naturally be positioned first. however, if batches of items are added at once,
            //they may be added to the layout in random orders; focusing on the first element will always
            //focus on the first in the batch, regardless of when it was added in relation to the rest of
            //the batch
            this.focus(0);
            //panel.get("id")
            this.resize_panels();
            // When the PagesLayout changes focus (switches to another item), redo magnification
            panel.bind('focus', function () {
                panel.trigger('redo_magnify');
            });
            // When a tab is selected in the panel, redo magnification
            panel.bind('tabsshow', function () {
                panel.trigger('redo_magnify');
            });
            // When magnification is set to be redone, redo it
            panel.bind('redo_magnify', $.proxy(function () {
                this.magnify_dialog(panel);
            }, this));
        },
        magnify_dialog: function (panel) {
            //don't try to magnify the item
            //if the layout is currently not visible
            if (!this.is_active()) {
                return false;
            }
            var $panel = $(panel.get('view').el);
            //get the currently selected tab or the panel body and magnify it
            var $current_content = $panel.find('.thm_panel_body .ui-tabs-panel:not(.ui-tabs-hide)');
            if ($current_content.length === 0) {
                $current_content = $panel.find('.thm_panel_body');
            }
            var extra_height = $('.pills_controller').outerHeight() + $('#pt_header').outerHeight();
            var panel_chrome_height = $panel.outerHeight() - $current_content.outerHeight();
            panel_chrome_height += 10;
            //give ourselves a little padding for the buttons
            var height = $(window).height() - extra_height - panel_chrome_height;
            var width = $(window).width();
            Magnify.reset($panel);
            Magnify.magnify($current_content, height, width);
        }
    });
    return PTPagesLayout;
});
