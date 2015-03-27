define([
    'layouts/edumacation/LayoutCollection'
], function (
    layouts
) {
    'use strict';
    var MagnifyDialogLayout = {
        add_view: function(panel) {
            var $el = $(this.get('el'));
            var $pel = panel.get('view').$el;
            $el.append($pel);

            $pel.dialog({
                resizable: false,
                sticky: true,
                modal: true, //TODO: make a panel arg?
                width: $(window).width() * 0.9,
                closeOnEscape: false
            });

            var recenter = function () {
                $pel.dialog('option', 'position', 'center');
            };

            $pel.resize(recenter);
            $(window).resize(recenter);
            recenter();

            $('#wrapper').css({position: 'fixed'});
            panel.bind('remove', function () {
                if (panels.where({layout: layouts.get('magnify_dialog')}).length === 0) {
                    $('#wrapper').css({position: 'relative'});
                }
            });

            this.initialize_magnify_panel(panel);
        },
        initialize_magnify_panel: function(panel) {
            $(panel.get('view').el).width('auto');

            // When a tab is selected in the panel, redo magnification
            panel.bind('tabsshow', function() {
                panel.trigger('redo_magnify');
            });

            // When the `redo_magnify` event is triggered, redo magnification
            panel.bind('redo_magnify', function () {
                this.magnify_dialog(panel);
            }.bind(this));

            $(panel.get('view').el).bind('destroy', function() {
                Magnify.reset(panel.get('view').el);
            });

            var minimize = panel.get('minimize');
            panel.set({minimize: false});
            $(panel.get('view').el).bind('Demagnify', function() {
                panel.set({minimize: minimize});
            });

            this.magnify_dialog(panel);
        },
        magnify_dialog: function(panel, current_content) {
            var el = panel.get('view').$el.find('.thm_panel_body');
            Magnify.reset($(el));
            if (window.is_fullscreen) {
                Magnify.magnify($(el), $(window).height() - 140);
            }
            return;
        }
    };

    return MagnifyDialogLayout;
});
