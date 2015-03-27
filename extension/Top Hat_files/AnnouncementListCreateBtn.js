/*global define, Backbone, _ */
define([
    'backbone.cocktail',
    'views/inst_admin/AnnouncementPopover',
    'text!templates/inst_admin/announcement_list_create_btn.html',

    'bootstrap-button'
], function (
    Cocktail,
    AnnouncementPopoverView,
    html
) {
    'use strict';

    var AnnouncementListCreateBtnView = Backbone.View.extend({
        template: _.template(html),
        events: {
            'click #btn-create-announcement': 'on_toggle_announcements'
        },
        tagName: 'span',

        initialize: function (options) {
            this.options = options || {};
            // Init optional popover CSS classes.

            this.popover_classes = _.isUndefined(options.popover_classes) ? '' : options.popover_classes;
            this.btn_text = _.isUndefined(options.btn_text) ? 'Announcements' : options.btn_text;
            // Init optional button text

            if (this.btn_text.length !== 0) {
                this.btn_text = '&nbsp;&nbsp;' + this.btn_text;
            }
            this.btn_classes = (_.isUndefined(options.btn_classes) ? '' : options.btn_classes);

            // Init optional announcements_query_params.
            this.announcements_query_params = options.announcements_query_params;
            // Init optional course_resource_uri.
            this.course_resource_uri = options.course_resource_uri;

        },
        render: function () {
            this.$el.html(this.template({
                btn_text: this.btn_text,
                btn_classes: this.btn_classes
            }));
        },
        remove: function () {
            if (!_.isUndefined(this.announcement_popover_view)) {
                this.announcement_popover_view.remove();
            }
            Backbone.View.prototype.remove.apply(this);
        },
        on_toggle_announcements: function(e) {
            e.preventDefault();

            if (this.announcement_popover_view !== undefined && this.announcement_popover_view.is_popover_open === true) {
                // If popover is open, do not render announcement list edit
                // popover view. Remove it.
                this.announcement_popover_view.remove();
                return;
            }

            // Insert announcement popover view.
            this.announcement_popover_view = new AnnouncementPopoverView({
                // Popover options.
                popover: {
                    namespace: this.id,
                    btn: $(e.currentTarget),
                    container: '#' + this.id,
                    placement: 'left',
                    classes: this.popover_classes
                },

                // View specific options.
                announcements_query_params: this.announcements_query_params,
                course_resource_uri: this.course_resource_uri
            });

            this.$el.append(this.announcement_popover_view.el);
            this.announcement_popover_view.render();
        }
    });

    return AnnouncementListCreateBtnView;
});