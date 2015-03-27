/*globals define, Backbone, _*/
define(['models/Notification'], function (Notification) {
    'use strict';
    var Notifications = Backbone.Collection.extend({
        urlRoot: '/api/v1/notifications/',
        model: Notification,
        set: function (models, options) {
            if (models.objects) {
                this.set(models.objects, options);
                return;
            }
            if (_.isArray(models)) {
                _.each(models, function (model) {
                    this.set(model, options);
                }.bind(this));
                return;
            }
            var item;
            if (models instanceof Backbone.Model) {
                item = models;
            } else {
                item = new Notification(models);
            }

            // check if the item already exists in the collection
            var unique = true;
            var object= item.get('activity').object_id;

            var existing_items = this.filter(function(n2) {
                return item.get('activity').course && n2.get('activity').course && item.get('activity').course.resource_uri === n2.get('activity').course.resource_uri;
            });

            if(existing_items.length > 0 && item.get('activity').course) {
                unique = false;

                var notification = existing_items[0];
                var count = notification.get('count') || 1;
                var activity = notification.get('activity');

                // put the object into the notification's object list
                var grouped_objects = activity.grouped_objects || (activity.grouped_objects = [activity.object_id]);

                if(_.indexOf(grouped_objects, object) === -1) {
                    activity.grouped_objects.push(object);
                    notification.set({
                        count: ++count
                    });
                    notification.get('activity').body = count + ' items activated for ' + notification.get('activity').course.course_name;
                    notification.trigger('aggregate');
                }
            }

            // check to see if we're adding it to the current course
            if(item.get('activity').course && item.get('activity').course.public_code === window.site_data.settings.ROUTE) {
                item.set({ is_read: true });
                item.save();
                unique = false;
            }

            if(unique) {
                Backbone.Collection.prototype.set.apply(this, [item]);
                item.bind('change:is_read', function() {
                    this.remove(item);
                }, this);
            }
        },
        mark_as_read_by_object: function(item) {
            var objects = item.get('activity').objects;
            if(objects === undefined) {
                objects = [item.get('activity').object_id];
            }
            var matches = new Notifications(this.filter(function(notification) {
                return _.indexOf(objects, notification.get('activity').object_id) !== -1;
            }));
            this.mark_as_read(matches);
        },
        mark_as_read_by_course: function(public_code) {
            var matches = new Notifications(this.filter(function(notification) {
                return notification.get('activity').course && (notification.get('activity').course.public_code === public_code);
            }));
            this.mark_as_read(matches);
        },
        mark_as_read: function(notifications) {
            notifications.each(function(match) {
                match.set({ is_read: true });
                match.save();
            });
        },
        mark_one_as_read: function(notification){
            notification.set({ is_read: true });
            notification.save();
        }
    });
    return Notifications;
});