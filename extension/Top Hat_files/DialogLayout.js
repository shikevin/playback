define([
    'layouts/edumacation/LayoutCollection',
    'util/Browser'
], function (
    layouts,
    Browser
) {
    'use strict';
    var DialogLayout = {
        add_view: function (panel) {
            var $el = $(this.get('el'));
            var $pel = panel.get('view').$el;

            $el.append($pel);
            $pel.dialog({
                resizable: false,
                sticky: true,
                modal: true, // TODO: make a panel arg?
                width: panel.get('width'),
                height: panel.get('height'),
                closeOnEscape: false
            });

            // bind Escape
            $pel.on('keydown', function (e) {
                if (e.keyCode === $.ui.keyCode.ESCAPE) {
                    panel.trigger('remove');
                    e.stopPropagation();
                }
            });

            if (!Browser.is_presentation_tool()) {
                $('#wrapper').css({position: 'fixed'});
            }
            panel.bind('remove', function () {
                $pel.off('resize', recenter);
                $(window).off('resize', recenter);

                $pel.remove();
                if (
                    !window.panels.where({
                        layout: layouts.get('dialog')
                    }).length &&
                    !Browser.is_presentation_tool()
                ) {
                    $('#wrapper').css({position: 'absolute'});
                }
            });

            var recenter = function () {
                $pel.dialog('option', 'width', panel.get('width'));
                $pel.dialog('option', 'position', 'center');
            };

            $pel.on('resize', recenter);
            $(window).on('resize', recenter);
            recenter();
        }
    };

    return DialogLayout;
});
