/* global _, Backbone */
define([
    'models/Notification2',
    'collections/Notifications',
    'collections/Notifications2',
    'collections/NotificationResponses',
    'collections/Alerts',

    'views/NotificationResponsesView',
    'views/NotificationListView',

    'jquery.qtip'
], function (
    Notification2Model,
    NotificationCollection,
    Notification2Collection,
    NotificationResponses,
    Alerts,

    NotificationResponsesView,
    NotificationListView
){
    'use strict';
    var NotificationsController = Backbone.Marionette.Controller.extend({
        ncentre_menu: null,
        ncentrenotifs: null,
        notification_responses: null,
        notifications: null,
        top_bar_notifs: null,
        alerts: null,

        /**
         * "initialize" isn't used because we want control over when the
         * controller is initialized.
         */
        initialize_data: function () {
            this.notifications = new NotificationCollection();
            this.top_bar_notifs = new Notification2Collection();
            this.ncentrenotifs = new NotificationResponses();

            this.notification_responses = new NotificationResponsesView({
                collection: this.ncentrenotifs,
                notifications2: this.top_bar_notifs
            });
            this.alerts = new Alerts();

            if (!_.isUndefined(window.Houdini)) {
                window.Houdini.off('fetch_notification');
                window.Houdini.on(
                    'fetch_notification',
                    this.fetch_notifications,
                    this
                );
            }
        },

        render_notification_list_view: function () {
            new NotificationListView({
                collection: this.top_bar_notifs,
                el: $('#nps2'),
                ncentrenotifs: this.ncentrenotifs
            }).render();
        },

        /**
         * Fetches Notifications2 from the rest API.
         */
        fetch_notifications: function () {
            new Notification2Collection().fetch({
                data: {},
                success: this.on_fetch_notifications_success.bind(this)
            });
        },

        /**
         * After Notifications2 are fetched, each notification is parsed and
         * will be added to the collection that it is associated with.
         * These collections are already associated with views, so they will
         * be rendered accordingly.
         *
         * The 2 views/collections are ncentrenotifs (the bell icon notifs) and
         * top_bar_notifs (top 1/4 of the screen). Notifications2 have a
         * "level" associated with them that correspond to these collections.
         *
         * @param {Backbone.Collection} collection
         *        The Notification2 collection returned from collection.fetch().
         * @param {Object} response
         *        The raw server responses returned from collection.fetch().
         */
        on_fetch_notifications_success: function (collection, response) {
            // Clear the notification centre list
            this.ncentrenotifs.reset();
            this.top_bar_notifs.reset();

            var NOTIF_LEVEL_FULLSCREEN = 1;
            var NOTIF_LEVEL_TOP_BAR = 2;
            var NOTIF_LEVEL_NOTIF_CENTRE = 3;

            var notifs = response.objects;
            var public_code = Backbone.history.fragment;

            var auto_clear_types = [
                NOTIF_LEVEL_TOP_BAR,
                NOTIF_LEVEL_NOTIF_CENTRE,
                6,
                7
            ];
            var that = this;
            _(notifs).each(function (cur_notif) {
                if (cur_notif.level === NOTIF_LEVEL_FULLSCREEN) {
                    // FULL SCREEN NOTIFICATIONS NOT IMPLEMENTED
                } else if (cur_notif.level === NOTIF_LEVEL_TOP_BAR) {
                    if (cur_notif.response_id) {
                        that.ncentrenotifs.add(cur_notif);
                    } else {
                        that.top_bar_notifs.add(cur_notif);
                    }
                } else if (cur_notif.level === NOTIF_LEVEL_NOTIF_CENTRE) {
                    if (auto_clear_types.indexOf(cur_notif.type) !== -1) {
                        if (public_code && cur_notif.public_code === public_code) {
                            // don't show the notification (immediately respond)
                            var n = new Notification2Model(cur_notif);
                            n.respond({responded: true});
                        } else {
                            that.ncentrenotifs.add(cur_notif);
                        }
                    } else {
                        that.ncentrenotifs.add(cur_notif);
                    }
                }
            });

            this._create_ncentre_menu();
            this.notification_responses.render();
            var qtip_api = this.ncentre_menu.qtip('api');
            if (qtip_api !== null) {
                qtip_api.set('content.text', this.notification_responses.el);
                this.render_notification_list_view();
            }
        },

        _create_ncentre_menu: function () {
            var qtip_api, autofocus = false;

            this.ncentre_menu = $('#ncentre').qtip({
                content: {
                    text: function () {
                    }
                },
                position: {
                    my: 'top right',
                    at: 'bottom center',
                    target: $('#ncentre .icon')
                },
                style: {
                    width: 320,
                    classes: 'tooltip-light settings-qtip qtip-notifs',
                    tip: {
                        height: 10,
                        width: 20,
                        offset: 0,
                        border: 1
                    }
                },
                show: false,
                hide: 'unfocus',
                events: {
                    visible: function(event, api) {
                        if (autofocus === true) {
                            var centre_node = $('.ncentre-node');
                            if (centre_node.length !== 0) {
                                centre_node.eq(0).focus();
                            } else {
                                $('.empty-notifs').focus();
                            }
                            autofocus = false;
                        }

                        // hide menu on detection of escape key
                        $(document).on( "keyup", function(event) {
                            if (event.which === $.ui.keyCode.ESCAPE) {
                                qtip_api.hide();
                                $('.ncentreicon').focus();
                                $(this).off(event);
                            }
                        });
                    }
                }
            });

            qtip_api = this.ncentre_menu.qtip('api');

            //show notifications menu on mouse click
            $('#ncentre').click( function() {
                qtip_api.show();
            });
            //show notifications menu on keydown (enter and space only)
            //   Also, change focus to menu to aid keyboard navigation
            $('.ncentreicon').keydown( function(event) {
                if (event.which === $.ui.keyCode.ENTER || event.which === $.ui.keyCode.SPACE) {
                    qtip_api.show();
                    autofocus = true;
                }
            });
        }
    });

    // Use a single controller instance for the whole app
    return new NotificationsController();
});
