/*global define, $, _ */
define([
    'util/fullscreen',
    'bootstrap-popover'
], function (
    Fullscreen
) {
    'use strict';

    /**
     * options
     *   popover.btn: Button element that triggered the popover.
     *   popover.namespace: Unique namespace that is used to bind/unbind document click event for opening/closing popover.
     *   popover.container: Selector of element to attach popover to (i.e. popover.container: '#popover-course-20').
     *   popover.placement: How to position the popover - 'top' | 'bottom' | 'left' | 'right' | 'auto'.
     *   popover.classes: CSS classes to add to .popover element.
     *   popover.heading
     *     false: Does not add a heading container to popover.
     *     true: Adds a heading container to popover with cancel button.
     *     string: Adds a heading container to popover with title and cancel button.
     *   popover.adjust: Adjusts popover position to fit the container's height
     */
    var MixinPopover = {
        events: {
            'click #btn-close': 'on_close_popover'
        },

        is_popover_open: false,

        default_popover_options: {
            placement: 'auto',
            classes: '',
            adjust: false,
            heading: false
        },

        initialize: function (options) {
            this.options = options || {};
            this.options.popover = this.options.popover || {};
            _.defaults(this.options.popover, this.default_popover_options);
        },

        on_blur_popover: function(e) {
            var btn = this.options.popover.btn;
            if (!$(btn).is(e.target) && $(btn).has(e.target).length === 0 && $('.popover').has(e.target).length === 0) {
                // If event target is not popover's button then remove popover.
                this.remove();
            }
        },

        on_close_popover: function() {
            this.remove();
        },

        remove: function() {
            var that = this;
            var $popover_button = $(this.options.popover.btn);
            $popover_button.on('hidden.bs.popover', function () {
                // Remove namespaced click event handler from document.
                $(document).off('click.' + that.options.popover.namespace);
            });

            // Toggle button (off) that opened the popover.
            if ($popover_button.hasClass('active')) {
                $popover_button.button('toggle');
            }
            // Destroy popover.
            $popover_button.popover('destroy');

            // Set popover as closed.
            this.is_popover_open = false;
        },

        /**
         * Render the popover.
         * @return {[type]} [description]
         */
        render: function() {
            // Toggle button as active.
            $(this.options.popover.btn).button('toggle');

            // Add animation class (handle animation ourselves instead of letting tooltip do it)
            this.options.popover.classes = this.options.popover.classes + ' fader';

            // Inst. popover options.
            var options = {
                placement: this.options.popover.placement || 'auto',
                animation: false,
                html : true,
                content: this.$el,
                container: this.options.popover.container,
                template: '<div class="popover ' + this.options.popover.classes + '"><div class="arrow"></div><div class="popover-inner"><h3 class="popover-title"></h3><div class="popover-content"><p></p></div></div></div>'
            };
            var cancel_btn_html = '<button type="button" id="btn-close" class="pull-right btn btn-link text">Cancel</button>';

            if (typeof(this.options.popover.heading) === 'string') {
                // Add heading container to popover with title and cancel button.
                options.title = '<span>' + this.options.popover.heading + '</span>' + cancel_btn_html;
            } else if (this.options.popover.heading === true) {
                // Adds heading container to popover with cancel button.
                options.title = '&nbsp;' + cancel_btn_html;
            }

            // Init the popover.
            $(this.options.popover.btn).popover(options);

            var that = this;
            $(this.options.popover.btn).on('shown.bs.popover', function () {
                // Add namespaced click event handler to document.
                $(document).on('click.' + that.options.popover.namespace, that.on_blur_popover.bind(that));
            });

            // Show the popover.
            $(this.options.popover.btn).popover('show');
            if (this.options.popover.adjust) {
                this.adjust_to_container();
            }

            // Set popover as open.
            this.is_popover_open = true;
        },
        adjust_to_container: function () {
            // This checks to see if we are full screen, if so we
            // need to change the container here as full screen
            // seems to destroy the properties of it
            var popover_container = $(this.options.popover.container);
            if (Fullscreen.is_fullscreen()) {
                popover_container = $('#course_wrapper');
            }
            var popover = this.$el.closest('.popover'),
                offset = popover.offset(),
                height = this.$el.height(),
                container = popover_container,
                container_height = container.height(),
                container_offset = container.offset(),
                y1 = offset.top + height,
                y2 = container_height,
                excess_height = y1 - y2;

            // never go below the bottom of the container
            if (excess_height > 0) {
                offset.top -= excess_height;
            }

            // never go above the top of the container
            if (offset.top < container_offset.top) {
                offset.top = container_offset.top;
            }

            popover.offset(offset);
        }
    };

    return MixinPopover;
});
