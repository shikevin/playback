/*global window, define*/
define([
    // 'underscore',
    // 'backbone',
    'views/invite/Scheduler',
    'collections/Invites',
    'views/invite/PendingList',
    'text!templates/invite/pending.html'
], function (SchedulerView, InviteCollection, PendingInviteCollectionView, html) {
    "use strict";

    var PendingInviteView = Backbone.View.extend({
        className: "pending",
        template: _.template(html),
        events: {
            'click th.email': 'sort_by_email',
            'click th.message-count': 'sort_by_message_count',
            'click th.active': 'sort_by_active',
            'click th.student_id': 'sort_by_student_id'
        },
        defaults: {
            sort : {
                email: {
                    direction: true,
                    filter: function (item) {
                        return item.get('email').toLowerCase();
                    }
                },
                message_count: {
                    direction: true,
                    filter: function (item) {
                        return item.get('messages_sent');
                    }
                },
                active: {
                    direction: true,
                    filter: function (item) {
                        return item.get('active');
                    }
                },
                student_id: {
                    direction: true,
                    filter: function (item) {
                        return $.trim(item.get('student_id')).toLowerCase();
                    }
                }
            }
        },
        initialize: function (options) {
            this.options = _.defaults(options || {}, this.defaults);
            this.fetching = false;
            this.scheduler_view = new SchedulerView();
            this.invite_list = new InviteCollection();
            this.col_view = new PendingInviteCollectionView({
                source_collection: this.invite_list,
                collection: new InviteCollection()
            });
            this.listenTo(this.col_view, 'refresh', this.get_invites, this);
            // bubbling add event from empty view
            this.listenTo(this.col_view, "add", this.trigger_add, this);
            Houdini.on("student_enrolled invite_created", this.get_invites, this);
        },
        trigger_add: function () {
            this.trigger("add");
        },
        remove: function () {
            Houdini.off("student_enrolled invite_created", this.get_invites, this);
            this.stopListening(this.col_view);
            this.scheduler_view.remove();
            this.col_view.remove();
            Backbone.View.prototype.remove.apply(this, arguments);
        },
        render: function () {
            this.$el.html(this.template());
            this.col_view.render();
            this.scheduler_view.render();
            this.$(".pending_box").append(this.col_view.$el);
            this.$(".scheduler_box").append(this.scheduler_view.$el);

            this.get_invites();
        },
        get_invites: function () {
            if (this.fetching) {
                return; // there can only be one
            }
            this.fetching = true; // this model feels pretty good about itself
            if (!window.course.get("course_data")) {
                this.listenTo(course, "change:course_data", _.once(this.get_invites), this);
                return;
            }
            var course_id = window.course.get("course_data").get("id"),
                fetching = this.invite_list.fetch({
                    data: {
                        course: course_id,
                        limit: 0
                    },
                    remove: false
                });

            fetching.done(function () {
                this.col_view.trigger('list_loaded');
            }.bind(this)).always(function () {
                this.fetching = false;
            }.bind(this));
        },
        sort_by: function (which) {
            this.col_view.current_sort = which + this.options.sort[which].direction;
            function make_comparator(fieldfn, order) {
                return function (item1, item2) {
                    var val1 = fieldfn(item1),
                        val2 = fieldfn(item2);
                    if (val1 === val2) {
                        return 0;
                    }
                    return (val1 > val2) === order ? -1 : 1;
                };
            }
            this.invite_list.comparator = make_comparator(this.options.sort[which].filter, this.options.sort[which].direction);
            this.invite_list.sort();
            this.options.sort[which].direction = !this.options.sort[which].direction;

            this.col_view.trigger("sort", which, this.options.sort[which].direction);
        },
        sort_by_student_id: function (event) {
            this.sort_by('student_id');
            event.preventDefault();
        },
        sort_by_email: function (event) {
            this.sort_by("email");
            event.preventDefault();
        },
        sort_by_message_count: function (event) {
            this.sort_by("message_count");
            event.preventDefault();
        },
        sort_by_active: function (event) {
            this.sort_by("active");
            event.preventDefault();
        }
    });

    return PendingInviteView;
});
