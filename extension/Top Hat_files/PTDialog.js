define([
    'layouts/edumacation/DialogLayout'
], function (
    DialogLayout
) {
    'use strict';
    var PTDialogLayout = $.extend({}, DialogLayout, {
        add_view: function (panel) {
            var $window = $(window);
            var width = $window.width();
            var resize_triggered = panel.get('width') > width ? true : false;
            if (resize_triggered) {
                require('lobby/PresentationTool').resize_pt(panel.get('width'), $window.height());
            }
            // call the DialogLayout's add command
            DialogLayout.add_view.apply(this, [panel]);
            // if panel width is changed, recalculate sizing
            panel.bind('change:width', function () {
                var resize_triggered = panel.get('width') > $window.width() ? true : false;
                if (resize_triggered) {
                    require('lobby/PresentationTool').resize_pt(panel.get('width'), $window.height());
                }
            });
            // if panel is removed, reset to original size
            panel.bind('remove', function () {
                require('lobby/PresentationTool').resize_pt(width, $window.height());
            });
        }
    });
    return PTDialogLayout;
});