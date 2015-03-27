define([], function () {
    'use strict';
    var PagesLayout = {
        panel_width: 0,
        panel_margin: 0,
        current_page: 0,
        empty_template: '<p>This course currently has no visible items.</p>',
        add_view: function (panel) {
            var $pel = panel.get('view').$el;
            var that = this;
            var panel_position = this.panels.indexOf(panel);
            //remove leftover pills for this element, if there are any
            this.$el('.pills li#' + panel.get('id')).remove();
            var pill_html = '<li id=\'' + panel.get('id') + '\'><span></span></li>';
            var num_panels = this.$el('.panels').children().length;
            //starts at 1
            //if the position is 0, add to the beginning (highest priority)
            if (!panel_position || panel_position === 0) {
                this.$el('.panels').prepend($pel);
                this.$el('.pills').prepend(pill_html);
            } else if (num_panels < panel_position + 1) {
                //num_panels 1-based, panel_position 0-based
                this.$el('.panels').append($pel);
                this.$el('.pills').append(pill_html);
            } else {
                var next_panel_el = this.$el('.panels').children().eq(panel_position);
                next_panel_el.before(panel.get('view').el);
                var next_pill_el = this.$el('.pills').children().eq(panel_position);
                next_pill_el.before(pill_html);
            }
            var pill = this.$el('.pills li#' + panel.get('id'));
            pill.click(function () {
                that.focus(panel.get('id'), true);
            });
            this.handle_empty_template();
            panel.bind('remove', function () {
                //refocus the layout
                var visible_panel_id = that.$el('.pills li.focus').attr('id');
                pill.remove();
                $(panel.get('view').el).remove();
                if (visible_panel_id === panel.get('id')) {
                    that.focus('left');
                } else {
                    that.focus(visible_panel_id);
                }
                that.handle_empty_template();
            });
            $pel.on('focus_panel', function () {
                that.$el('.pills li').removeClass('focus');
                pill.addClass('focus');
            });
            //rather than focus on the current panel, we'll focus on the first panel
            //we do this becuase panel orders are based partially on time, so as new items are added
            //they will naturally be positioned first. however, if batches of items are added at once,
            //they may be added to the layout in random orders; focusing on the first element will always
            //focus on the first in the batch, regardless of when it was added in relation to the rest of
            //the batch
            this.focus(0);
            this.resize_panels();
        },
        handle_empty_template: function (force_hide) {
            //shows or hides empty template based on content
            if (force_hide !== true && this.$el('.panels').children().length === 0) {
                this.$el('.pills_controller').hide();
                this.$el('.empty_template').show();
                this.$el('.empty_template').html(this.empty_template);
            } else {
                this.$el('.pills_controller').show();
                this.$el('.empty_template').hide();
            }
        },
        initialize: function () {
            this.$el().attr('render_class', 'pages');
            this.$el().html('<div class=\'pills_controller\'><span class=\'pills_previous\'><b>Previous</b></span><ul class=\'pills\'></ul><span class=\'pills_next\'><b>Next</b></span></div><ul class=\'panels\'></ul><div class=\'empty_template\'></div>');
            var that = this;
            function pillsNextClickHandler(e) {
                $(this).addClass('loading');
                that.$el('.panels').addClass('loading');
                that.focus('right', true, function () {
                    $(this).removeClass('loading');
                    that.$el('.panels').removeClass('loading');
                }.bind(this));
            }
            function pillsPreviousClickHandler(e) {
                $(this).addClass('loading');
                that.$el('.panels').addClass('loading');
                that.focus('left', true, function () {
                    $(this).removeClass('loading');
                    that.$el('.panels').removeClass('loading');
                }.bind(this));
            }
            if ($().tap) {
                this.$el('.pills_next').tap(pillsNextClickHandler);
                this.$el('.pills_previous').tap(pillsPreviousClickHandler);
            } else {
                this.$el('.pills_next').bind('click', pillsNextClickHandler);
                this.$el('.pills_previous').bind('click', pillsPreviousClickHandler);
            }
            $('body').bind('loadingStart', function () {
                that.handle_empty_template(true);
            });
            $('body').bind('loadingEnd', function () {
                that.handle_empty_template();
            });
            $(this.get('el').parents('div[data-role=page]')).bind('pageshow', function () {
                this.resize_panels();
            }.bind(this));
            this.handle_empty_template();
        },
        focus: function (id, show_animation, callback) {
            switch (id) {
            case 'right':
                this.current_page += 1;
                break;
            case 'left':
                this.current_page -= 1;
                break;
            default:
                if (typeof id === 'number') {
                    this.current_page = id;
                } else {
                    var panel = this.$el('.panels').children('#' + id);
                    if (panel.length) {
                        this.current_page = panel.prevAll().length;
                    }
                }
            }
            if (this.current_page < 0) {
                this.current_page = 0;
            }
            if (this.current_page >= this.$el('.panels').children().length - 1) {
                this.current_page = this.$el('.panels').children().length - 1;
            }
            this.resize_panels(show_animation, callback);
            this.current_panel_el().trigger('focus_panel');
        },
        is_active: function () {
            return this.get('el').is(':visible') ? true : false;
        },
        current_panel_el: function () {
            return $(this.$el('.panels').children()[this.current_page]);
        },
        resize_panels: function (show_animation, callback) {
            this.$el('.panels').children().css('visibility', 'visible');
            //re-visiblizing for animation purposes
            callback = callback ? callback : function () {
            };
            this.panel_width = this.$el().width();
            this.$el('.panels').children().width(this.panel_width - this.panel_margin);
            //resize panels
            var left = this.panel_width * this.current_page * -1;
            jQuery.easing.def = 'easeInOutQuint';
            var that = this;
            if (show_animation) {
                this.$el('.panels').animate({ 'left': left }, {
                    'duration': 300,
                    'complete': function () {
                        callback();
                        that.$el('.panels').children().css('visibility', 'hidden');
                        that.current_panel_el().css('visibility', 'visible');
                    }
                });
            } else {
                this.$el('.panels').css('left', left + 'px');
                callback();
                this.$el('.panels').children().css('visibility', 'hidden');
                this.current_panel_el().css('visibility', 'visible');
            }
        },
        clear: function () {
            this.current_page = 0;
            this.$el('.pills').html('');
            this.resize_panels();
        }
    };

    return PagesLayout;
});