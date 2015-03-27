/* global Backbone */
define([
    'collections/StudentMemberships',
    'views/invite/StudentMembershipRow',
    'text!templates/invite/membership_table.html',
    'text!templates/invite/nobody_in_class.html',
    'models/invite/ClassInvite',
    'text!templates/invite/enrollment_count.html',
    'text!templates/invite/alerts.html',
    'course/NavUtils',
    'layouts/edumacation/LayoutCollection'
], function (
    StudentMembershipCollection,
    StudentMembershipRowView,
    html,
    empty_class_html,
    ClassInvite,
    count_html,
    alerts_html,
    NavUtils,
    layouts
) {
    'use strict';
    var EmptyMembershipView, StudentMembershipCollectionView, LoadingMembershipView;
    EmptyMembershipView = Backbone.Marionette.ItemView.extend({
        className: 'empty_list_placeholder',
        template: _.template(empty_class_html),
        events: {
            'click .invite_somebody': 'invite_somebody'
        },
        invite_somebody: function () {
            this.trigger("add");
        }
    });

    LoadingMembershipView = Backbone.Marionette.ItemView.extend({
        className: 'loading_memberships useful_when_empty',
        template: "#loading_template"
    });

    StudentMembershipCollectionView = Backbone.Marionette.CompositeView.extend({
        itemView: StudentMembershipRowView,
        itemViewOptions: function (model) {
            var index = this.options.source_collection.indexOf(model);
            var state, text;

            if(this.item_view_state[model.id]) {
                state = 'editable';
            } else {
                state = 'init';
            }

            if(index == -1) {
                text = '';
            } else if(this.pending_id[model.id]) {
                text = this.pending_id[model.id];
            } else {
                text = model.get('student').student_id;
            }

            return {
                init_state: state,
                index: index,
                show_confirm: this.show_confirm,
                pending_id: text,
                show_space: this.controls_shown
            };
        },
        template: _.template(html),
        countTemplate: _.template(count_html),
        alertsTemplate: _.template(alerts_html),
        className: "membership_table",
        emptyView: LoadingMembershipView,
        events: {
            'click .show_gradebook_for_selected': 'show_gradebook_for_selected',
            'click .disenroll_selected': 'disenroll_selected',
            'click .invite_selected': 'invite_selected',
            'click .edit_student_id_for_selected': 'edit_student_id_for_selected',
            'click th.username': 'sort_by_username',
            'click th.first_name': 'sort_by_first_name',
            'click th.last_name': 'sort_by_last_name',
            'click th.email': 'sort_by_email',
            'click th.student_id': 'sort_by_student_id',
            'click th.invited': 'sort_by_invited',
            'click th.online': 'sort_by_online',
            "click .selectall": 'selectall_clicked',
            'click .save_all': 'save_all_confirm',
            'click .cancel_all': 'cancel_all_confirm'
        },
        defaults: {
            sort_fields: {
                username: {
                    direction: false,
                    filter: function (item) {
                        return $.trim(item.get('student').username).toLowerCase();
                    }
                },
                first_name: {
                    direction: false,
                    filter: function (item) {
                        return $.trim(item.get('student').first_name).toLowerCase();
                    }
                },
                last_name: {
                    direction: false,
                    filter: function (item) {
                        return $.trim(item.get('student').last_name).toLowerCase();
                    }
                },
                email: {
                    direction: false,
                    filter: function (item) {
                        return $.trim(item.get('student').email).toLowerCase();
                    }
                },
                student_id: {
                    direction: false,
                    filter: function (item) {
                        return $.trim(item.get('student').student_id).toLowerCase();
                    }
                },
                invited: {
                    direction: false,
                    filter: function (item) {
                        var map = {
                            both: 4,
                            student_id: 3,
                            email: 2,
                            none: 1
                        };
                        if (item.get('invited') === undefined) {
                            return 0;
                        }
                        return map[item.get('invited')];
                    }
                },
                online: {
                    direction: false,
                    filter: function (item) {
                        return item.get('student').online;
                    }
                }
            }
        },
        collectionEvents: {
            'selected': "modelSelected",
            'deselected': "modelDeselected"
        },
        add_trigger: function (options) {
            // Handler to let emptyview send us to add screen
            this.trigger('add');
        },
        initialize: function (options) {
            this.options = _.defaults(options || {}, this.defaults);
            // this.data_changed = _.debounce(this.data_changed.bind(this), 100);
            // this.data_loaded = _.debounce(this.data_loaded.bind(this), 100);
            this.list_loaded = false;
            this.empty_view = new EmptyMembershipView();
            this.empty_view.render();
            this.selectedElements = new StudentMembershipCollection();
            this.listenTo(this.empty_view, 'add', this.add_trigger, this);
            this.listenTo(this.options.source_collection, "add remove", this.data_loaded, this);
            this.listenTo(this.options.source_collection, "sort", this.data_changed, this);
            this.listenTo(this.selectedElements, "add remove change", this.update_ui_cues, this);

            // used to see if save confirm dialog should be shown
            this.listenTo(this, 'itemview:hide_confirm', this.hide_confirm);
            this.show_confirm = true;

            // used to see which rows are in edit mode
            this.listenTo(this, 'itemview:edit_hide_state', this.edit_hide_state);
            this.item_view_state = new Object();

            // used to see if Save All and Cancel All are shown
            this.controls_shown = false;

            // check to see if save all and canel all should be shown
            this.listenTo(this, 'itemview:check_edit_state', this.check_edit_state);

            // used to store pending student id values
            this.listenTo(this, 'itemview:pending_id_change', this.pending_id_change);
            this.pending_id = new Object();

            this.listenTo(this, 'list_loaded', function () {
                window.course.set('actual_students_enrolled', this.options.source_collection.length);
                this.list_loaded = true;
                this.data_loaded();
                this.update_ui_cues();
            }, this);
        },
        appendHtml: function (collectionView, itemView) {
            collectionView.$("tbody").append(itemView.el);
        },
        onRender: function () {
            // jQuery toggle() restores 'display' CSS property to whatever it
            // was initially. In Firefox, jQuery toggle() is not reading the
            // initial 'display: inline-block' property on the <li>.
            // Consequently, toggle() restores <li> 'display' property to
            // 'display: list-item', which causes the list items to appear
            // horizontally, instead of vertically.
            // So, we forcefully set the display property via JavaScript.
            this.$('.context_menu').children().css('display', 'inline-block');
            this.update_ui_cues();
            this.hide_save_controls();
            this.$(".empty_message").append(this.empty_view.$el);
            //this.data_changed();
            this.sort_by(this.options.source_collection, 'username');
            this.current_sort_field = 'username';
        },
        data_loaded: function () {
            if (this._load_update_queued ||  !this.list_loaded) {
                return;
            }

            this._load_update_queued = true;
            this.data_changed();
            window.setTimeout(function () {

                this._load_update_queued = false;
            }.bind(this), 2000);
        },
        data_changed: function () {
            this.filter_list();
            this.selectedElements.each(function (selectedEl) {
                if (!this.collection.contains(selectedEl)) {
                    this.modelDeselected(selectedEl);
                } else {
                    selectedEl.trigger("selected", selectedEl);
                }
            }.bind(this));
            this.update_ui_cues();

        },
        update_ui_cues: function () {
            this.$("#enrollment-alerts").html(this.alertsTemplate({
                count: this.options.source_collection.filter(
                    function (el) {
                        return !el.get('student').verified;
                    }
                ).length
            }));
            this.$(".useless_when_empty").toggle(this.options.source_collection.length > 0);
            this.$(".useful_when_empty").toggle(this.options.source_collection.length === 0 && this.list_loaded);
            this.$(".loading_memberships").toggle(this.options.source_collection.length === 0 && !this.list_loaded);
            this.$(".enrollment_count").html(this.countTemplate({
                //total_count: this.options.source_collection.length,
                total_count: this.options.source_collection.filter(
                    function (el) {
                        return el.get('student').verified;
                    }
                ).length,
                filter_count: this.collection.length,
                online_count: this.options.source_collection.filter(
                    function (el) {
                        return el.get('student').online && el.get('student').verified;
                    }
                ).length
            }));

            this.double_check_selectall();
            this.update_context_menu();
        },
        update_context_menu: function () {
            var is_gradebook_active = require('Modules').get_module('gradebook').get('active') ||
                                          require('Modules').get_module('gradebook_beta').get('active');
            this.$(".context_menu .show_gradebook_for_selected").toggle(
                this.selectedElements.length === 1  && is_gradebook_active
            );

            this.$(".context_menu .disenroll_selected").toggle(
                this.selectedElements.length > 0
            );

            this.$(".context_menu .invite_selected").toggle(
                this.selectedElements.length > 0 &&
                    this.selectedElements.reduce(
                        function (memo, i) {
                            return memo && !i.get("invited");
                        },
                        true
                    )
            );

            this.$('.context_menu .edit_student_id_for_selected').toggle(
                this.selectedElements.length > 0
            );
        },
        double_check_selectall: function () {
            if (this.selectedElements.length === this.collection.length) {
                this.$(".selectall").attr("checked", "checked");
            } else {
                this.$(".selectall").removeAttr("checked");
            }

        },
        selectall_clicked: function () {
            if (this.$(".selectall").is(":checked")) {
                this.collection.each(function (model) {
                    model.trigger("selected", model);
                });
            } else {
                this.collection.each(function (model) {
                    model.trigger("deselected", model);
                });
            }
        },
        modelSelected: function (model) {
            this.selectedElements.add(model);
        },
        modelDeselected: function (model) {
            this.selectedElements.remove(model);
        },
        hide_save_controls: function () {


            if (!this.controls_shown) {
                return;
            }
            this.controls_shown = false;

            this.$('.new_student_id').hide();
            this.$('.save_controls_header').hide();
            this.$('.student_id').show();
            this.options.source_collection.forEach(function (e) {
                e.trigger('hide_controls_space');
            });

        },
        show_save_controls: function () {
            if (this.controls_shown){
                return;
            }
            this.controls_shown = true;

            this.$('.new_student_id').show();
            this.$('.save_controls_header').show();
            this.options.source_collection.forEach(function (e) {
                e.trigger('show_controls_space');
            });
            this.$('th.student_id').hide();

        },
        disenroll_selected: function () {
            var disenroll;
            var confirm_panel = panels.add({
                id: 'confim_panel',
                title: 'Confirmation',
                layout: layouts.get('dialog'),
                body: '<p>Are you sure you want to remove the selected students from the roster?</p>',
                footer_buttons: {
                    'Yes': function () {
                        disenroll();
                    },
                    'No': 'remove'
                }
            });
            disenroll = function () {
                Daedalus.track('SM - Prof disenrolled students', {
                    studentCount: this.selectedElements.length
                });
                var functions = [];
                this.selectedElements.forEach(function (e) {
                    functions.push(function() {
                        e.destroy();
                    });
                });
                for (var i = 0; i < functions.length; i++) {
                    functions[i]();
                }
                confirm_panel.remove();
            }.bind(this);
        },
        invite_selected: function () {
            this.selectedElements.forEach(function (e) {
                var invite = new ClassInvite({
                    course: window.course.get("course_data").get("resource_uri"),
                    email: e.get("student").email,
                    student_id: e.get('student').student_id || null
                });
                invite.save();
            });
        },
        show_gradebook_for_selected: function () {
            var student = this.selectedElements.at(0).get('student');
            require('Modules').get_module('gradebook').create_student_gradebook_details(student.db_id, student.username);
            if (require('Modules').get_module('gradebook_beta').get('active')) {
                window.location.href = '/e/' + window.site_data.settings.COURSE_PUBLIC_CODE +
                                           '/gradebook/student/' + student.id;
            } else {
                NavUtils.show_gradebook();
            }
        },
        edit_student_id_for_selected: function () {
            this.show_save_controls();
            this.selectedElements.forEach(function (e) {
                this.item_view_state[e.id] = true;
                e.trigger('edit');
            }.bind(this));
        },
        check_edit_state: function () {
            for (var key in this.item_view_state) {
                if (this.item_view_state[key]) {
                    return;
                }
            }
            this.hide_save_controls();
        },
        edit_hide_state: function (e) {
            this.item_view_state[e.model.id] = false;
        },
        pending_id_change: function (e, text) {
            this.pending_id[e.model.id] = text;
        },
        set_filter: function (filter_string) {
            this.filter_string = filter_string;
            this.data_changed();
        },
        filter_list: function () {
            var query_string, query;
            query_string = this.filter_string;
            if (query_string === undefined) {
                query_string = '';

            }
            query = query_string.split(' ');

            this.collection.reset(
                this.options.source_collection.filter(
                    function (item) {
                        var bigass_string, success;
                        bigass_string = (
                            item.get('student').username + " " +
                            item.get('student').email + " " +
                            item.get('student').first_name + " " +
                            item.get('student').last_name + " " +
                            item.get('student').student_id).toLowerCase();
                        // Iterate over bigass_string and make sure each query item is there
                        success = _.reduce(query, function (status, q) {
                            return bigass_string.search(q) !== -1 && status;
                        }, true);
                        return success && item.get('student').verified;
                    }
                )
            );
        },
        hide_confirm: function () {
            this.show_confirm = false;
            this.options.source_collection.forEach(function(e) {
                e.trigger('hide_confirm');
            });
        },
        save_all_confirm: function () {
            var that = this;
            var body = '<p>Changing a student\'s ID overrides the ID for all courses this student is enrolled in. (The student will be notified by email)</p>' +
                '<p>Are you sure you want to save all your changes?</p>';
            var confirm_panel = panels.add({
                id: 'confirm_panel',
                title: 'WARNING',
                layout: layouts.get('dialog'),
                body: body,
                footer_buttons: {
                    'Yes': function () {
                        that.save_all();
                    },
                    'No': 'remove'
                }
            });
        },
        save_all: function () {
            $('#confirm_panel').remove();
            var url = '/api/v2/student_id/';
            var objects = [];

            this.selectedElements.forEach(function (e) {
                var new_student_id = this.$('#'+e.get('student').id+'_input').val();
                if(new_student_id !== e.get('student').student_id) {
                    objects.push({
                        "resource_uri": e.get('student').student_resource,
                        "student_id": new_student_id
                    });
                }
            }.bind(this));

            var data = {"objects": objects};
            var that = this;
            $.ajax({
                type: 'PATCH',
                url: url,
                data: JSON.stringify(data),
                contentType: 'application/json',
                complete: function () {
                    var trigger_functions = [];
                    that.selectedElements.forEach(function(e) {
                        trigger_functions.push(
                            function () {
                                e.trigger('non_editable');
                            });
                    });
                    for (var i = 0; i < trigger_functions.length; i++) {
                        trigger_functions[i]();
                    }
                    that.trigger('saved_all');
                }
            });
        },
        cancel_all_confirm: function () {
            var that = this;
            var body = '<p>Are you sure you want to cancel all your pending changes?</p>';
            var confirm_panel = panels.add({
                id: 'confirm_panel',
                title: 'WARNING',
                layout: layouts.get('dialog'),
                body: body,
                footer_buttons: {
                    'Yes': function () {
                        that.cancel_all();
                    },
                    'No': 'remove'
                }
            });
        },
        cancel_all: function () {
            $('#confirm_panel').remove();
            this.hide_save_controls();
            this.options.source_collection.forEach(function (e) {
                e.trigger('cancel');
            });
        },
        make_comparator: function (fieldfn, order) {
            return function (item1, item2) {
                var val1 = fieldfn(item1),
                    val2 = fieldfn(item2);
                if (val1 === val2) {
                    return 0;
                }
                return (val1 > val2) === order ? -1 : 1;
            };
        },
        sort_by: function (col, field) {
            col.comparator = this.make_comparator(
                this.options.sort_fields[field].filter,
                this.options.sort_fields[field].direction
            );
            col.sort();
        },
        flip_sort_direction: function (field) {
            this.options.sort_fields[field].direction = !this.options.sort_fields[field].direction;
            this.$('th.sort').removeClass('sortUp sortDown');
            this.$('th.sort.' + field).
                addClass(
                    this.options.sort_fields[field].direction ?
                            'sortDown' :
                            'sortUp'
                );
        },
        sort_source_by: function (e, field) {
            this.flip_sort_direction(field);
            this.sort_by(this.options.source_collection, field);
            this.current_sort_field = field;
            e.preventDefault();
        },
        sort_by_username: function (event) {
            this.sort_source_by(event, 'username');
        },
        sort_by_first_name: function (event) {
            this.sort_source_by(event, 'first_name');
        },
        sort_by_last_name: function (event) {
            this.sort_source_by(event, 'last_name');
        },
        sort_by_email: function (event) {
            this.sort_source_by(event, 'email');
        },
        sort_by_student_id: function (event) {
            this.sort_source_by(event, 'student_id');
        },
        sort_by_invited: function (event) {
            this.sort_source_by(event, 'invited');
        },
        sort_by_online: function (event) {
            this.sort_source_by(event, 'online');
        }
    });

    return StudentMembershipCollectionView;
});
