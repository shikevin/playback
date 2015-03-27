/*global define, Backbone, _ */
define([
    'backbone.cocktail',
    'mixins/Popover',
    'models/Alert',
    'models/inst_admin/Announcement',
    'collections/inst_admin/Announcements',
    'views/inst_admin/AnnouncementList',
    'views/inst_admin/AnnouncementEdit',
    'controllers/Notifications',
    'text!templates/inst_admin/announcement_popover.html'
], function (
    Cocktail,
    MixinPopover,
    Alert,
    Announcement,
    Announcements,
    AnnouncementListView,
    AnnouncementEditView,
    Notifications,
    html
) {
    'use strict';

    var AnnouncementPopoverView = Backbone.View.extend({
        template: _.template(html),
        events: {
            'click #btn-new-announcement': 'on_new_announcement',
            'click #btn-close-announcement': 'on_close_announcement'
        },

        /**
         * [initialize description]
         * @param  {[type]} options announcements_query_params = { 'course' : 9 }
         * @return {[type]}         [description]
         */
        initialize: function(options) {
            this.options = options || {};
            // Decorate AnnouncementListEditView as a popover. Do this in
            // initialize so its only done once.
            Cocktail.mixin(this, MixinPopover);

            // Init announcements GET params.
            var announcements_query_params = {
                limit: 3
            };
            if (typeof options !== 'undefined') {
                if (typeof options.announcements_query_params !== 'undefined') {
                    _.extend(announcements_query_params, options.announcements_query_params);
                }
            }
            var announcements = new Announcements();

            // Init course_resource_uri.
            this.course_resource_uri = undefined;
            if (typeof options !== 'undefined') {
                if (typeof options.course_resource_uri !== 'undefined') {
                    this.course_resource_uri = options.course_resource_uri;
                }
            }

            // Fetch new announcements.
            announcements.fetch({ data : announcements_query_params });

            // Init announcement list view.
            this.announcement_list_view = new AnnouncementListView({
                collection: announcements
                //className: 'container'
            });

            // Create new announcement.
            var announcement = new Announcement();

            // Init announcement edit view.
            var that = this;
            this.announcement_edit_view = new AnnouncementEditView({
                model: announcement,
                course_resource_uri: this.course_resource_uri,
                on_save_success: function() {
                    // Remove edit view.
                    this.remove();

                    // Remove list edit view.
                    that.remove();

                    // TODO stevo: The lobby SPA stores alerts in the window object where every other SPA stores alerts in the App object.
                    // Since the AnnouncementEditView can be used in any SPA, the caller must pass the view the alerts collection.
                    // Once all SPAs have been combined, use alerts stored in App object.
                    // Display danger alert.
                    Notifications.alerts.add(
                        new Alert({
                            msg: 'Announcement sent!',
                            level: 'success'
                        })
                    );
                },
                on_save_error: function() {
                    // Remove edit view.
                    this.remove();

                    // Remove list edit view.
                    that.remove();

                    // TODO stevo: The lobby SPA stores alerts in the window object where every other SPA stores alerts in the App object.
                    // Since the AnnouncementEditView can be used in any SPA, the caller must pass the view the alerts collection.
                    // Once all SPAs have been combined, use alerts stored in App object.
                    // Display danger alert.
                    Notifications.alerts.add(
                        new Alert({
                            msg: 'Sorry, an error occurred when trying to send your announcement. Hang tight, we\'re working on it.',
                            level: 'danger'
                        })
                    );
                },
                on_fetch_courses_error: function() {
                    // TODO stevo: The lobby SPA stores alerts in the window object where every other SPA stores alerts in the App object.
                    // Since the AnnouncementEditView can be used in any SPA, the caller must pass the view the alerts collection.
                    // Once all SPAs have been combined, use alerts stored in App object.
                    // Display danger alert.
                    Notifications.alerts.add(
                        new Alert({
                            msg: 'Sorry, an error occurred when trying to prepare the courses available for your announcement. If this error persists, contact <a href="mailto:support@tophat.com">support@tophat.com</a>.',
                            level: 'danger'
                        })
                    );
                }
            });
        },

        on_new_announcement: function(e) {
            e.preventDefault();

            // Hide new announcement button.
            this.$('#btn-new-announcement').hide();

            // Hide list announcements title.
            this.$('#view-title-list').hide();
            // Show create announcements title.
            this.$('#view-title-create').show();

            // Remove announcement list view.
            this.announcement_list_view.remove();

            // Show close announcement button.
            this.$('#btn-close-announcement').show();

            // Render announcement edit view.
            this.$el.append(this.announcement_edit_view.el);
            this.announcement_edit_view.render();
        },

        on_close_announcement: function(e) {
            e.preventDefault();
            this.remove();
        },

        render: function () {
            this.$el.html(this.template());

            // Hide close announcement button.
            this.$('#btn-close-announcement').hide();

            // Hide create announcements title.
            this.$('#view-title-create').hide();

            // Render announcement list view.
            this.$el.append(this.announcement_list_view.el);
            this.announcement_list_view.render();
        },
        remove: function () {
            this.announcement_edit_view.remove();
            this.announcement_list_view.remove();
            Backbone.View.prototype.remove.apply(this);
        }
    });

    return AnnouncementPopoverView;
});