/* global _, Backbone */
define([
    'models/User',
    'models/CourseSettings',
    'modules/Course',
    'controllers/Notifications',

    'views/AlertList',
    'views/header/NavbarItems',
    'views/header/ConnectionStatus',
    'views/header/CourseList',

    'course/NavUtils',
    'text!templates/header/header_layout.html',

    'bootstrap-dropdown'
], function (
    User,
    CourseSettings,
    CourseModule,
    NotificationsController,

    AlertListView,
    NavbarItemsView,
    ConnectionStatusView,
    CourseListView,

    NavUtils,
    header_layout_html
) {
    'use strict';

    var Header = Backbone.Marionette.Layout.extend({
        tagName: 'header',
        defaults: {
            display_back_arrow_and_logo: false,
            display_conn_status: false,
            display_nav_items: true,
            display_skip2main: false,
            course: null,
            course_settings: null,
            nav_items: []
        },
        active_modules: [],
        model: User,
        modelEvents: {
            sync: 'render'
        },
        ui: {
            back_arrow: '.navbar-back'
        },
        regions: {
            conn_status: '.connection-status-region',
            alerts: '#region-alerts',
            navbar_items: '.navbar-item-region',
            course_list: '.course-list-region'
        },
        events: {
            'click @ui.back_arrow': '_back_arrow_click'
        },

        initialize: function (options) {
            this.options = _.defaults(options || {}, this.defaults);

            NotificationsController.initialize_data();

            if (this.options.course && !this.options.course_settings) {
                this.options.course_settings = CourseSettings.findOrCreate({
                    resource_uri: CourseSettings.resource_uri_from_id(
                        this.options.course.get('course_id')
                    )
                });
            }
            if (this.options.display_nav_items) {
                this._set_nav_items();
            }
        },

        _set_nav_items: function (refetch_course_settings) {
            if (this._is_fetching_course_settings) {
                return;
            }
            this._is_fetching_course_settings = true;
            this.nav_items = this.options.nav_items.slice(0);
            if (
                refetch_course_settings || this.options.course_settings &&
                this.options.course_settings.isNew()
            ) {
                this.options.course_settings.fetch({
                    success: this._set_nav_items_after_fetching_course_settings.bind(this)
                });

                var header_tabs = NavUtils.header_tabs(
                    this.model, this.options.course, this.options.course_settings);
                this._push_header_tabs_to_nav_items(header_tabs, false);
            } else {
                this._set_nav_items_after_fetching_course_settings();
            }
        },

        _set_nav_items_after_fetching_course_settings: function () {
            this.nav_items = this.options.nav_items.slice(0);
            var header_tabs = NavUtils.header_tabs(
                this.model, this.options.course, this.options.course_settings);
            this._push_header_tabs_to_nav_items(header_tabs, true);

            if (this.navbar_items_view) {
                this.navbar_items_view.nav_items = this.nav_items;
                this.navbar_items_view.render();
            }

            this._is_fetching_course_settings = false;
        },

        _push_header_tabs_to_nav_items: function (header_tabs, have_course_settings) {
            var nav_items = this.options.nav_items.slice(0);
            _.each(header_tabs, function (tab) {
                var tab_authorized = tab.is_authorized ? tab.is_authorized() : true;
                if (
                    tab_authorized &&
                    (tab.enabled && !tab.requires_course_settings ||
                     tab.requires_course_settings && have_course_settings)
                ) {
                    nav_items.push(tab);
                }
            });
            this.nav_items = nav_items;
        },

        _render_navbar_items_region: function () {
            if (this.options.display_nav_items) {
                this.navbar_items_view = new NavbarItemsView({
                    nav_items: this.nav_items
                });
                this.navbar_items.show(this.navbar_items_view);
            }
        },

        onRender: function () {
            this._render_navbar_items_region();
            if (this.options.display_conn_status) {
                this.conn_status.show(new ConnectionStatusView());
            }

            if (this.options.display_skip2main) {
                //add skip-to-main link (helps accessibility navigation)
                var skip2main_el = $('<div id="skip2main"><a href="#course_content">Skip to Main Content</a></div>');
                this.$el.prepend(skip2main_el);
            }

            this.alerts.show(new AlertListView({
                collection: NotificationsController.alerts
            }));

            this.course_list.show(new CourseListView({
                course: this.options.course,
                user: this.model
            }));

            if (this.options.course && NotificationsController.notifications) {
                NotificationsController.notifications.mark_as_read_by_course(
                    this.options.course.get('public_code'));
            }

            if (this.model.get('resource_uri')) {
                if (!this._has_fetched_notifications) {
                    this._has_fetched_notifications = true;
                    NotificationsController.fetch_notifications();
                } else {
                    NotificationsController.render_notification_list_view();
                }
            }

        },

        reRender: function () {
            this._set_nav_items(true);
        },

        _back_arrow_click: function (event) {
            event.preventDefault();
            if (!_.isUndefined(window.contentRouter)) {
                window.contentRouter.navigate('', {trigger: true});
            }
            var active_app = NavUtils.get_active_app();
            if (
                active_app === NavUtils.APPS.ACCOUNTS ||
                active_app === NavUtils.APPS.SANDBOX ||
                active_app === NavUtils.APPS.INSTADMIN
            ) {
                window.location.href = '/';
            }
        },

        template: function (serialized_data) {
            return _.template(header_layout_html, serialized_data);
        },

        serializeData: function () {
             return {
                MEDIA_URL: window.site_data.settings.MEDIA_URL,
                user: this.model,
                display_back_arrow_and_logo: this.options.display_back_arrow_and_logo
            };
        }
    });
    return Header;
});
