/*globals Backbone*/
define([], function () {
    'use strict';
    var SwappableContentView = Backbone.View.extend({
        el: undefined,
        router: undefined,
        routing: false,
        current_view: null,

        initialize: function() {
            this.router = new Backbone.Router();
        },

        add: function(route, view) {
            arguments.route = route;
            this.router.route(route, 'test', function() {
                this.display(view, arguments);
            }.bind(this));
        },

        display: function(view, data) {
            $(window).trigger('exit_fullscreen');

            // omgwtf
            var sidebar = $('#sidebar');
            this.$el.contents().detach();
            sidebar.prependTo($('#wrapper'));

            if ($.fn.qtip) {
                $('.qtip.ui-tooltip-red').qtip('destroy');
            }

            this.$el.append(view.el);

            if( this.current_view &&
                typeof this.current_view.hide_callback === typeof function () {}) {
                this.current_view.hide_callback();
            }
            this.current_view = view;

            view.render.apply(view, data);

            if(view.display_callback) {
                view.display_callback();
            }

            $(window).trigger('resize');
        },

        navigate: function(url_fragment) {
            this.router.navigate(url_fragment, { trigger: true });
        }
    });

    return SwappableContentView;
});
