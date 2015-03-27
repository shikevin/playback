/*global define, window*/
define([
    // 'jquery',
    // 'underscore',
    // 'marionette',
    'views/invite/PendingRow',
    'text!templates/invite/pending_table.html',
    'collections/Invites',
    'text!templates/invite/nobody_invited.html'
], function (PendingInviteRowView, html, InviteCollection, no_invite_html) {
    'use strict';
    //unrequire
    var PendingInviteCollectionView, EmptyPendingView, LoadingPendingList;


    EmptyPendingView = Backbone.Marionette.ItemView.extend({
        className: 'empty_list_placeholder',
        template: _.template(no_invite_html),
        events: {
            'click .invite_somebody': 'invite_somebody'
        },
        invite_somebody: function () {
            this.trigger("add");
        }
    });

    LoadingPendingList = Backbone.Marionette.ItemView.extend({
        className: 'loading_pending',
        template: "#loading_template"
    });

    PendingInviteCollectionView = Backbone.Marionette.CompositeView.extend({
        itemView: PendingInviteRowView,
        events: {
            'keyup .pending-list-filter': 'data_changed',
            'click .context_menu .send-email': 'invite_selected',
            'click .context_menu .delete-invite': 'delete_selected',
            'click .context_menu .edit-invite': 'edit_selected',
            'click .selectall': 'select_all_toggle',
            'click .refresh': 'trigger_refresh'
        },
        emptyView: LoadingPendingList,
        template: _.template(html),
        allSelected: false,
        collectionEvents: {
            selected: "modelSelected",
            deselected: "modelDeselected",
            sort: 'data_changed'
        },
        appendHtml: function (collectionView, itemView) {
            collectionView.$("tbody").append(itemView.el);
        },
        onRender: function () {
            this.$(".empty_message").append(this.empty_message.$el);
            this.data_changed();
        },
        initialize: function (options) {
            this.options = options || {};
            this.update_context_menu = _.debounce(this.update_context_menu.bind(this), 100);
            this.data_changed = _.debounce(this.data_changed.bind(this), 100);
            this.list_loaded = false;
            this.selectedElements = new InviteCollection();
            this.empty_message = new EmptyPendingView();
            this.empty_message.render();
            this.listenTo(this.empty_message, 'add', this.trigger_add, this);
            this.listenTo(this.options.source_collection, "add remove sort", this.data_changed, this);
            this.listenTo(this.selectedElements, "change add remove", this.update_display_els, this);
            this.listenTo(this, 'sort', this.set_sort, this);
            this.listenTo(this, 'list_loaded', function () {
                this.$('.refresh_button_holder').removeClass('refreshing');
                this.list_loaded = true;
                // this.update_display_els();
                this.data_changed();
            }, this);
            this.listenTo(window.course, 'change:available', this.update_context_menu, this);
            Houdini.on("message_status_changed", this.message_status_changed, this);
        },
        set_sort: function (which, direction) {
            //this.current_sort = which + direction.toString();
            this.$("th.sort").removeClass("sortUp sortDown");
            this.$("th.sort." + which)
                .addClass(
                    direction ?
                            'sortUp' :
                            'sortDown'
                );
        },
        trigger_add: function () {
            this.trigger('add');
        },
        trigger_refresh: function () {
            this.$('.refresh_button_holder').addClass('refreshing');
            this.trigger('refresh');
        },
        onRemove: function () {
            Houdini.off("message_status_changed", this.message_status_changed, this);
        },
        data_changed: function () {
            window.course.set('num_invites', this.options.source_collection.length);
            var total_prospective = this.options.source_collection.length + window.course.get('actual_students_enrolled');
            if (
                window.course.get('course_data').get('max_free_users') < total_prospective &&
                window.user.get('freemium')
            ) {
                Daedalus.set_property('hasAddedAboveFreemium', true);
            }
            this.filter_list();
            this.selectedElements.each(function (selectedEl) {
                if (!this.collection.contains(selectedEl)) {
                    this.selectedElements.remove(selectedEl);
                } else {
                    selectedEl.trigger("selected", selectedEl);
                }
            }.bind(this));
            this.update_display_els();

        },
        update_display_els: function () {
            this.$(".useless_when_empty").toggle(this.options.source_collection.length > 0);
            this.$('.useful_when_empty').toggle(this.options.source_collection.length === 0 && this.list_loaded);
            this.$('.loading_pending').toggle(this.options.source_collection.length === 0 && !this.list_loaded);
            this.double_check_selectall();
            this.update_context_menu();
        },
        invite_selected: function () {
            Daedalus.track(
                'SM - Prof emailed subset of pending',
                {numStudents: this.selectedElements.length}
            );
            Daedalus.set_property('hasInvitedStudents', true);
            this.selectedElements.each(function (e) {
                var elview = this.children.findByModel(e);
                // Sending state on rows sends invites
                elview.trigger("sending");
            }.bind(this));
        },
        delete_selected: function () {
            this.selectedElements.each(function (e) {
                // Destroys the model, which should cause the view to be removed
                // awfully hackey, without the timeout, it would only do the first one
                // presumably something to do with the collection changing
                window.setTimeout(function () {
                    e.destroy();
                }, 30);

            });
        },
        edit_selected: function () {
            this.selectedElements.each(function (e) {
                e.trigger("edit");
            });
        },
        select_all_toggle: function () {
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
        update_context_menu: function () {
            var some_selected = this.selectedElements.length > 0;
            this.$(".context_menu .send-email").toggle(
                window.course.get('available') &&
                some_selected &&
                _.reduce(
                    this.selectedElements.models,
                    function (memo, el) {
                        return memo && !el.get('invalid') && !el.get('message_queued');
                    },
                    true
                )
            );
            this.$(".context_menu .delete-invite").toggle(some_selected);
            this.$(".context_menu .edit-invite").toggle(some_selected);
        },
        double_check_selectall: function () {

            if (this.selectedElements.length === this.collection.length) {
                this.$(".selectall").attr("checked", "checked");
            } else {
                this.$(".selectall").removeAttr("checked");
            }

        },
        message_status_changed: function (data) {
            var updated_invites = this.collection.filter(function (item) {
                return Number(item.get("id")) === data.invite_id;
            }.bind(this));
            _.each(updated_invites, function (invite) {
                invite.fetch();
            }.bind(this));
        },
        modelSelected: function (model) {
            this.selectedElements.add(model);
        },
        modelDeselected: function (model) {
            this.selectedElements.remove(model);
        },
        filter_list: function () {
            filtering_called();
            var query_string = this.$(".pending-list-filter").val();
            var filtered_source = this.options.source_collection.filter(function (item) {
                var big_string = item.get('email');
                big_string += ' ' + item.get('student_id');
                return big_string.search(query_string) !== -1;
            });

            if (this.last_filter_sort === query_string + this.current_sort && this.last_sourcelength <= this.options.source_collection.length) {
                this.collection.add(filtered_source);
            } else {
                this.collection.reset(filtered_source);
                this.last_filter_sort = query_string + this.current_sort;
            }
            this.last_sourcelength = this.options.source_collection.length;
        }
    });
    var filtering_called = _.once(function () {
        Daedalus.track('SM - Prof filtered pending list');
    });
    return PendingInviteCollectionView;
});
