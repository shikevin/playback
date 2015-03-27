/* global define, Backbone, _ */
define([
    'models/NotificationResponse',
    'views/NotificationView',
    'models/Notification2',
    'text!templates/notification/ncentrenode.html'
], function (NotificationResponse, NotificationView, Notification2, ncentrenodeTemplate) {
    'use strict';

    var NotificationResponseView = Backbone.View.extend({
        initialize: function (options) {
            this.options = options || {};
        },
        /**
         * Returns the class name of the icon to be used given an icon_id
         * available on the notification model.
         *
         * @param  {Integer} icon_id the specific id of icon from notification
         * @return {String}          the class name associated with the icon
         */
        getIconClass: function(icon_id) {
            return [
                'THM-logov', // top hat
                'caution', //caution
                'question', //question
                'chat', //discussion
                'demo', //demo
                'bookmark', //tournament
                'attendance', //attendance
                'b-open', //activated
                'b-open', // show
                'gradebook', //homework
                'b-mark', //review
                'closed'
            ][icon_id] || 'THM-logov';
        },


        /**
         * Template function for rendering view.
         * @type {Function}
         */
        template: _.template(ncentrenodeTemplate),

        /**
         * Events that can be triggered by interacting with the view.
         * @type {Object}
         */
        events: {
            'click .ncentre-node': 'activate',
            'keypress .ncentre-node': 'activate_key',
            'click .close-notif-node': 'kill'
        },

        /**
         * Determines whether or not the ncentre notification should be
         * rendered or not. Specifically, system notifications for changes
         * in a course should not be rendered if the recipient is currently
         * in the course.
         */
        should_auto_respond: function() {
            var notif = this.model;
            var public_code = window.site_data.settings.COURSE_PUBLIC_CODE;
            // refer to notifications2/models.py, Notification Type CONSTANTS
            // auto_clear_types are Notification types which should be responded
            // to automatically  if you are in the course it is for
            var auto_clear_types = [2, 3, 6, 7];
            if(auto_clear_types.indexOf(notif.get('type')) !== -1) {
                if(public_code && notif.get('public_code') === public_code) {
                    // don't show the notification (immediately respond), then
                    // remove it from the collection
                    this.kill();
                    return true;
                }
            }
            return false;
        },

        /**
         * Renders the view.
         * @return {undefined} undefined
         */
        render: function () {
            if(!this.should_auto_respond()){
                this.$el.html(this.template({
                    content: this.model.get('content'),
                    url: this.model.get('url'),
                    icon: this.getIconClass(this.model.get('icon')),
                    notifid: _.uniqueId('notif-')
                }));
            }
            return this;
        },

        /**
         * Remove the notification view and respond to the notification.
         * @return {undefined}
         */
        kill: function() {
            this.model.collection.remove(this.model);
            this.model.respond({ responded: true });
        },

        /**
         * Activate a notification via click in the notification centre.
         * @return {undefined}
         */
        activate: function() {
            this.model.collection.remove(this.model);
            // If the notification is a NPS notification
            if(this.model.get('url')) {
                // will open url
                $('#ncentre').qtip().hide(); // hide notification centre view
                this.model.respond({ responded: true });
            }
            else if(this.model.get('type') === 1) {
                $('#ncentre').qtip().hide(); // hide notification centre view
                this.model.set('patch', true);
                this.model.set('response_id', this.model.get('response_id'));
                this.options.notifications2.add(this.model);
                this.off();
                this.remove();
                return;
            }
            else if(this.model.get('type') === 5) {
                // Announcement. Just close it.
                this.model.respond({ responded: true });
            }
            else if(this.model.get('type') > 1 && this.model.get('course_id')) {
                $('#ncentre').qtip().hide(); // hide notification centre view
                this.model.respond({ responded: true });
                window.location.href = this.model.get('public_code');
            }
            // not NPS and no URL
            else if(this.model.get('type') !== 1 && !this.model.get('url')) {
                // should just close.
                this.model.respond({ responded: true });
            }
            this.off();
            this.remove();
        },

        activate_key: function(event) {
            //interact with notification on enter or space bar keys
            if (event.which === $.ui.keyCode.ENTER || event.which === $.ui.keyCode.SPACE) {
                this.activate();
            }
        }
    });

    return NotificationResponseView;
});
