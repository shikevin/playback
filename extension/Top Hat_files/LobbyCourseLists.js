/*global define, Backbone, _ */
define([
    'models/inst_admin/Announcement',
    'collections/Courses',

    'views/lobby/CourseList',
    'views/inst_admin/AnnouncementListCreateBtn',
    'views/course/CourseCreate',
    'views/course/CourseAdd',
    'views/header/Header',

    'text!templates/lobby/lobby_course_lists.html',

    'bootstrap-button',
    'bootstrap-tooltip'
], function (
    Announcement,
    Courses,
    CourseListView,
    AnnouncementListCreateBtnView,
    CourseCreateView,
    CourseAddView,
    Header,
    html
) {
    'use strict';
    var LobbyCourseLists = Backbone.View.extend({
        template: _.template(html),
        className: 'lobby_course_lists',
        events: {
            'change input[name=list-filter]': 'on_change_filter'
        },
        initialize: function (options) {
            this.options = options || {};
            this.listenTo(this.options.courses_owned, 'change:available', this.update_available, this);
            if (window.user.is_student()) {
                this.initialize_student();
            } else {
                this.initialize_teacher();
            }
        },
        initialize_student: function () {
            this.enrolled_courses_list = new CourseListView({
                collection: this.options.enrolled_courses
            });
            this.show_filter = false;
            this.current_courses_list_view = this.enrolled_courses_list;
            this._render_header();
        },
        initialize_teacher: function () {
            this.available_owned = new Courses();
            this.unavailable_owned = new Courses();
            this.available_courses_list_view = new CourseListView({
                collection: this.available_owned
            });
            this.unavailable_courses_list_view = new CourseListView({
                collection: this.unavailable_owned
            });
            this.current_courses_list_view = this.available_courses_list_view;

            if (window.user.has_perm('read_org_courses')) {
                this.available_org = new Courses();
                this.unavailable_org = new Courses();
                this.available_org_courses_list_view = new CourseListView({
                    collection: this.available_org
                });
                this.unavailable_org_courses_list_view = new CourseListView({
                    collection: this.unavailable_org
                });
                this.current_org_courses_list_view = this.available_org_courses_list_view;
            }

            this.update_available();
            this.show_filter = true;

            this.current_org_courses_list_view = this.available_org_courses_list_view;
            this._render_header();
        },
        _render_header: function () {
            var header_view = new Header();

            header_view.render();
            $('#region-navbar').html(header_view.el);
        },
        update_available: function () {
            // Filter courses owned by available/unavailable.

            this.available_owned.reset(this.options.courses_owned.where({
                available: true,
                owned: true
            }));

            this.unavailable_owned.reset(this.options.courses_owned.where({
                available: false,
                owned: true
            }));
            if (window.user.has_perm('read_org_courses')) {
                this.available_org.reset(this.options.courses_owned.where({
                    available: true,
                    owned: false
                }));
                this.unavailable_org.reset(this.options.courses_owned.where({
                    available: false,
                    owned: false
                }));
            }
        },

        on_change_filter: function(e) {
            e.preventDefault();
            var filter = e.target.getAttribute('id');
            if (filter === 'filter-available') {
                this.$('#label-unavailable').tooltip('hide');
                this.current_courses_list_view = this.available_courses_list_view;
                this.current_org_courses_list_view = this.available_org_courses_list_view;
                this._render_list();
            }
            else if (filter === 'filter-unavailable') {
                this.$('#label-unavailable').tooltip('show');
                this.current_courses_list_view = this.unavailable_courses_list_view;
                this.current_org_courses_list_view = this.unavailable_org_courses_list_view;
                this._render_list();
            }
        },

        render: function () {
            // Render template.
            this.$el.html(this.template({
                orgname: window.org_data.orgname,
                user: window.user,
                show_filter: this.show_filter
            }));
            this.$('.disclaim-enrolled').toggle(window.user.is_student());
            // Init tooltip.
            this.$('#label-unavailable').tooltip({
                container: '.list-filter-wrapper',
                trigger: 'manual'
            });

            // Insert nested announcement create view.
            window.user.has_perm('add_announcement_org', {
                permitted: function() {
                    var announcement_list_create_btn_view = new AnnouncementListCreateBtnView({
                        popover: {
                            placement: 'bottom',
                            classes: 'fixed-wide'
                        },
                        id: 'popover-org-' + window.org_data.id,
                        btn_classes: 'btn-default btn-lg'
                    });
                    $('#org-actions').append(announcement_list_create_btn_view.el);
                    announcement_list_create_btn_view.render();
                }
            });
            // Show create course button.
            window.user.has_perm('add_course', {
                permitted: function() {
                    var course_create_view = new CourseCreateView();
                    $('#org-actions').append(course_create_view.el);
                    course_create_view.render();
                }
            });
            // Show add course button.
            window.user.has_perm('add_coursemembership', {
                permitted: function() {
                    var course_add_view = new CourseAddView();
                    $('#org-actions').append(course_add_view.el);
                    course_add_view.render();
                }
            });
            // Render list.
            // TODO stevo: This should be a nested view. Use backbone.layoutmanager instead of Marionette.
            this._render_list();
        },
        _has_owned_and_unowned: function () {
            if (!window.user.has_perm('read_org_courses')) {
                return false
            }
            // Returns whether or not this user crosses the boundary between admin and teacher
            //  notably, if they don't, we can remove some cues from the ui

            var owned_count = this.unavailable_owned.length + this.available_owned.length;
            var org_count = this.unavailable_org.length + this.available_org.length;
            return owned_count > 0 && org_count > 0;
        },
        _render_list: function() {
            this.$('.disclaim-course-category').toggle(
                window.user.is_teacher() &&
                this._has_owned_and_unowned()
            );
            // Render current courses list.
            if (
                window.user.is_student() ||
                this.unavailable_owned.length + this.available_owned.length > 0
            )  {
                this.$('.courses_list').empty();
                this.current_courses_list_view.setElement(this.$('.courses_list'));
                this.current_courses_list_view.render();
            }
            if (
                window.user.has_perm('read_org_courses') &&
                this.unavailable_org.length + this.available_org.length > 0
            ) {
                this.$('.org_courses_list').empty();
                this.current_org_courses_list_view.setElement(this.$('.org_courses_list'));
                this.current_org_courses_list_view.render();
            }

        },

        display_callback: function() {
            $('#sidebar').prependTo(this.$el);
        }
    });
    return LobbyCourseLists;
});
