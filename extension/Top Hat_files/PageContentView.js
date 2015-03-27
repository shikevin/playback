/* global Backbone, _*/
define([
    'views/ModuleItemContent',
    'views/pages/SubPageView',
    'text!templates/pages/content_view.html',
    'text!templates/pages/subpage_template.html',
    'text!templates/pages/empty_template.html'
], function (ModuleItemContentView, SubPageView, html, subpage_html, empty_html) {
    'use strict';
    var NoSubpagesView, ActiveSubpagesView, PagesContentView;

    NoSubpagesView = Backbone.Marionette.ItemView.extend({
        template: _.template(empty_html)
    });

    // this handles the display of the active subpage
    ActiveSubpagesView = Backbone.Marionette.CollectionView.extend({
        emptyView: NoSubpagesView,
        itemView: SubPageView
    });

    PagesContentView = ModuleItemContentView.extend({
        template: _.template(html),
        className: 'pages',

        initialize: function () {
            ModuleItemContentView.prototype.initialize.call(this);
            this.subview = new ActiveSubpagesView({collection: this.model.get('subpages')});
            this.subview.collection.comparator = 'order';
            this.current_page = 1;
        },
        events: {
            'click .next': 'next',
            'click .prev': 'prev',

            'click .topjump': 'topjump_click',
            'keypress .goto_box_top': 'topjump_keypress',

            'click .bottomjump': 'bottomjump_click',
            'keypress .goto_box_bottom': 'bottomjump_keypress'
        },
        render: function () {
            this.model.fetch().then(function () {
                this.$el.html(this.template(this.model));
                this.subview.setElement(this.$('.subview'));
                this.subview.render();
                this.set_subpage();
            }.bind(this));
        },
        num_pages: function () {
            return this.subview.collection.length;
        },
        next: function (event) {
            event.preventDefault();
            this.current_page = Math.min(this.num_pages(), this.current_page + 1);
            this.set_subpage();
        },
        prev: function (event) {
            event.preventDefault();
            this.current_page = Math.max(1, this.current_page - 1);
            this.set_subpage();
        },

        topjump_click: function (event) {
            // IE 9 tries to open this in a new page
            event.preventDefault();
            this.jump('top');
        },
        topjump_keypress: function (event) {
            // If enter key is pressed
            if (event.keyCode === 13) {
                // Do not submit form
                event.preventDefault();
                this.jump('top');
            }
        },

        bottomjump_click: function (event) {
            event.preventDefault();
            this.jump('bottom');
        },
        bottomjump_keypress: function (event) {
            if (event.keyCode === 13) {
                event.preventDefault();
                this.jump('bottom');
            }
        },
        jump: function (top) {
            var id = this.model.get('id');
            /* id corresponds to the relevant content module.
            For example, if we have two Pages items open at
            the same time, one which has attribute id = 17 and
            another with attribute id = 24, then the 4 text
            fields present on the page will be:
            17_page_number_top
            17_page_number_bottom
            24_page_number_top
            24_page_number_bottom
            And there will be 4 "Go" buttons for the user to
            click. The following line will get the value of
            the number in the corresponding text field. */
            var page_num = parseInt($('#' + id + '_page_number_' + top).val(), 10);
            if (!isNaN(page_num)) {
                this.current_page = Math.max(1, Math.min(this.num_pages(), page_num));
                this.set_subpage();
            }
        },
        set_subpage: function () {
            var new_subview = null,
                new_subpage = this.subview.collection.at(this.current_page - 1);

            if (!new_subpage) {
                return;
            }
            new_subview = this.subview.children.findByModel(new_subpage);
            this._hide_active_subview(this.$('.active'));
            new_subview.$el.addClass('active');
            this.$('.summary').text(' of ' + this.num_pages());
            this.$('.goto_box_top').val(this.current_page);
            this.$('.goto_box_bottom').val(this.current_page);

            // Scroll the window up to the top of the correct Page
            var course_wrapper = $('#course_wrapper');
            course_wrapper.scrollTop(
                course_wrapper.scrollTop() +
                this.$el.offset().top - 110);
        },
        _hide_active_subview: function ($el) {
            $el.removeClass('active');

            $el.find('iframe')
                .addClass('force_ie9_repaint')
                .removeClass('force_ie9_repaint');
        }
    });
    return PagesContentView;
});
