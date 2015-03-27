/*globals define, Backbone, _*/
define([
    'views/NotificationsList',
    'text!templates/sidebar.html'
], function (NotificationsListView, html) {
    'use strict';
    var SidebarView = Backbone.View.extend({
        template: _.template(html),
        events: {
            'click #minimize_sidebar': 'toggle_sidebar'
        },
        initialize: function (options) {
            this.options = options || {};
            this.notifications_list = new NotificationsListView({
                collection: this.options.collection
            });
        },
        render: function () {
            this.$el.html(this.template());
            this.$('.notification_view').append(this.notifications_list.el);
            this.notifications_list.render();
            this.auto_visibility();
            this.listenTo(this.options.collection, 'add', this.auto_visibility, this);
        },
        toggle_sidebar: function (e) {
            e.preventDefault();
            this.minimize_sidebar();
        },
        minimize_sidebar: function(minimized, delay) {
            if(_.isUndefined(delay)) {
                delay = 0;
            }
            if(this.minimize_timeout) {
                clearTimeout(this.minimize_timeout);
            }
            this.minimize_timeout = setTimeout(function() {
                if(minimized === undefined) {
                    minimized = $('body').hasClass('sidebar_minimized');
                    minimized = !minimized;
                }
                $('body').toggleClass('sidebar_minimized', minimized);
                if (minimized) {
                    $('#minimize_sidebar').html('&laquo;');
                } else {
                    $('#minimize_sidebar').html('&raquo;');
                }
                this.toggle_tip(minimized);
                // oh god why
                var el = $('#course_content')[0];
                if (el) {
                    el.style.display='none';
                    el.style.display='block';
                }

                // since the content area has changed size, trigger this
                // mainly for files annotations at the moment
                $(window).trigger('resize');

            }.bind(this), delay);
        },
        toggle_tip: function(minimized) {
            if(minimized) {
                var num = this.options.collection.length;
                $('#minimize_sidebar').qtip('destroy').removeData('qtip');
                if(num > 0) {
                    $('#minimize_sidebar').qtip({
                        content: {
                            text: ''+num
                        },
                        position: {
                            my: 'bottom-right',
                            at: 'top-center',
                            viewport: true,
                            target: $('#minimize_sidebar'),
                            adjust: {
                                screen: true
                            }
                        },
                        show: {
                            event: false, // Don't specify a show event...
                            ready: true, // ... but show the tooltip when ready
                            delay: 400
                        },
                        hide: false,
                        style: {
                            classes: 'notifications-tip'
                        }
                    });
                }
            } else {
                $('#minimize_sidebar').qtip('destroy');
            }
        },
        auto_visibility: function() {
            $('body').toggleClass('sidebar_visible', false);
            var visible = this.options.collection.length > 0;
            $('body').toggleClass('sidebar_visible', visible);

        }
    });
    return SidebarView;
});