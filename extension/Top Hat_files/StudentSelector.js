/*globals define, _, Backbone*/
define([
    'views/Loading',
    'views/NoResults',
    'collections/StudentMemberships',
    'text!templates/student_selector.html',
    'text!templates/student_selector_row.html'
], function (LoadingView, NoResultsView, StudentMembershipCollection, student_selector_html, student_selector_row_html) {
    'use strict';

    // hack until the lobby uses requirejs fully
    var Marionette;
    if (typeof window.Marionette === 'undefined') {
        Marionette = require('marionette');
    } else {
        Marionette = window.Marionette;
    }

    var StudentSelectorItemView = Backbone.Marionette.ItemView.extend({
        tagName: 'tr',
        template: _.template(student_selector_row_html),
        selected: false,
        events: {
            'change input': 'toggle_selected'
        },
        toggle_selected: function () {
            this.selected = this.$('input').prop('checked');
            this.trigger('change:selected', this.selected);
        }
    });

    var StudentSelectorView = Backbone.Marionette.CompositeView.extend({
        template: _.template(student_selector_html),
        itemView: StudentSelectorItemView,
        itemViewContainer: 'tbody',
        emptyView: NoResultsView,
        events: {
            'change input.filter': 'update_filter',
            'click .show_unanswered': 'toggle_unanswered',
            'click .show_all': 'toggle_unanswered',
            'click .cancel': 'remove',
            'click .submit': 'submit',
            'change input.select_all': 'toggle_select_all'
        },
        default_options: {
            unanswered: true
        },
        toggle_unanswered: function (e) {
            var $el = $(e.target);
            if ($el.hasClass('show_unanswered')) {
                this.options.unanswered = true;
            } else {
                this.options.unanswered = false;
            }
            this.render_unanswered();
            this.update_select_all();
            this.filter();
        },
        toggle_select_all: function () {
            if (this.$('tbody input:checkbox:not(:checked)').length === 0) {
                // all boxes are already checked, so uncheck them all
                this.$('tbody input:checkbox').prop('checked', false).change();
            } else {
                // not all are checked yet, so check them all
                this.$('tbody input:checkbox').prop('checked', 'checked').change();
            }
        },
        update_select_all: function () {
            if (this.$('tbody input:checkbox:not(:checked)').length === 0) {
                this.$('input.select_all').prop('checked', 'checked');
            } else {
                this.$('input.select_all').prop('checked', false);
            }
        },
        filter_anon: function (item) {
            return !item.get('student').is_anonymous_account;
        },
        filter_unverified: function (item) {
            return item.get('student').verified;
        },
        filter_input: function (item) {
            if (this.filter_val) {
                var item_text = JSON.stringify(item.toJSON()).toLowerCase();
                return item_text.indexOf(this.filter_val) !== -1;
            }
            return true;
        },
        filter_unanswered: function (item) {
            if (this.options.unanswered) {
                return this.options.answered_students.indexOf(item.get('student').username) === -1;
            }
            return true;
        },
        update_filter: function () {
            this.filter_val = this.$('input.filter').val().toLowerCase();
            this.filter();
        },
        filter: function () {
            var models = this.options.master_collection.models;
            models = _.filter(models, this.filter_anon, this);
            models = _.filter(models, this.filter_unverified, this);
            models = _.filter(models, this.filter_unanswered, this);
            models = _.filter(models, this.filter_input, this);
            this.collection.reset(models);
        },
        initialize: function (options) {
            this.options = options || {};
            this.options = _.extend({}, this.default_options, this.options);
            this.collection = new Backbone.Collection();
            this.on('childView:change:selected', this.update_select_all, this);
            this.filter();
        },
        render: function () {
            Marionette.CompositeView.prototype.render.apply(this, arguments);
            this.render_unanswered();
        },
        render_unanswered: function () {
            this.$('h3.unanswered_msg').toggle(this.options.unanswered);
            this.$('.show_unanswered')
                .toggleClass('btn-default')
                .toggleClass('btn-legacy');
            this.$('.show_all')
                .toggleClass('btn-default')
                .toggleClass('btn-legacy');
        },
        remove: function () {
            Marionette.CompositeView.prototype.remove.apply(this, arguments);
            this.trigger('destroy');
        },
        submit: function () {
            var selected = _.map(this.children.filter(function (child) {
                return child.selected;
            }), function (child) {
                return child.model.get('student').id;
            });

            var status = this.$('[name=status_radio]:checked').val();
            var active = status.indexOf('active') !== -1;
            var visible = status.indexOf('visible') !== -1;
            var review = status.indexOf('review') !== -1;

            function save_student_group() {
                return $.ajax({
                    url: '/api/v2/student_groups/',
                    contentType: 'application/json',
                    type: 'POST',
                    data: JSON.stringify({
                        students: selected,
                        course_id: window.course.get('course_data').get('id'),
                        name: 'Custom status group'
                    })
                });
            }

            var view = this,
                items = this.options.items;


            function save_status_group(response_data, http_status, xhr) {
                var group_id = xhr.getResponseHeader('location').split('/')[6];
                var objects = _.map(items, function status_group_data(item) {
                    return {
                        item_id: item.get_id(),
                        student_group_id: group_id,
                        active: active,
                        visible: visible,
                        review: review
                    };
                });
                return $.ajax({
                    url: '/api/v2/status_groups/',
                    contentType: 'application/json',
                    type: 'PATCH',
                    data: JSON.stringify({
                        objects: objects
                    })
                });
            }

            save_student_group().then(save_status_group).then(function () {
                view.remove();
            });
        }
    });
    return StudentSelectorView;
});
