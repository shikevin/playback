/*global window, define, Backbone, _, Houdini*/
define([
    // 'underscore',
    // 'backbone',
    'text!templates/invite/home.html',
    'views/invite/StudentMembershipList',
    'collections/StudentMemberships',
    'util/daedalus'
], function (html, StudentMembershipCollectionView, StudentMembershipCollection, Daedalus) {
    'use strict';
    var InviteHomeView;

    InviteHomeView = Backbone.View.extend({
        className: 'home',
        template: _.template(html),
        events: {
            'keyup .student-list-filter': 'filter_list',
            'mouseover tr.student_membership': 'popup',
            'click .refresh': 'fetch_data'
            // 'mouseout tr.student_membership': 'popdown'
        },
        initialize: function () {
            this.fetching = false;
            this.student_list = new StudentMembershipCollection();
            this.student_list_view = new StudentMembershipCollectionView({
                source_collection: this.student_list,
                collection: new StudentMembershipCollection()
            });
            // This feature dun got killed
            // this.lockview = new RestrictAccessView();

            // Manually bubbling event from empty view on collection
            this.listenTo(this.student_list_view, 'add', this.trigger_add, this);
            this.listenTo(this.student_list_view, 'saved_all', this.fetch_data, this);
            this.listenTo(window.course, 'change:num_online', this.fetch_data, this);
            Houdini.on('student_enrolled invite_created', this.fetch_data, this);

            this.fetch_data();
        },
        trigger_add: function () {
            this.trigger('add');
        },
        remove: function () {
            this.student_list_view.remove();
            Houdini.off('student_enrolled invite_created', this.fetch_data, this);
            Backbone.View.prototype.remove.apply(this, arguments);
        },
        render : function () {
            // this.lockview.render();
            this.student_list_view.render();
            this.$el.html(this.template());
            this.$('#class_list').html(this.student_list_view.$el);
            // this.$('.lock_holder').html(this.lockview.$el);
        },
        fetch_data: function () {
            if (this.fetching) {
                return;
            }
            this.fetching = true;
            this.$('.refresh_button_holder').addClass('refreshing');
            if (window.course.get('course_data') === undefined) {
                window.course.listenTo(this, 'change:course_data', _.once(this.fetch_data), this);
                return;
            }
            var fetching = this.student_list.fetch({
                data: {
                    limit: 0,
                    course: window.course.get('course_data').get('id')
                },
                remove: false
            });
            fetching.done(function () {
                this.$('.refresh_button_holder').removeClass('refreshing');
                this.student_list_view.trigger('list_loaded');
            }.bind(this)).always(function () {
                this.fetching = false;
            }.bind(this));
        },
        filter_list: function (event) {
            filtering_called();
            var query_string = $(event.target).val().toLowerCase();
            this.student_list_view.set_filter(query_string);
        }
    });
    var filtering_called = _.once(function () {
        Daedalus.track('SM - Prof filtered enrolled list');
    });
    return InviteHomeView;
});
