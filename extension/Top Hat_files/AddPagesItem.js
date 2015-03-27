/* globals define, Backbone, _*/
define([
    'models/pages/SubPage',
    'views/pages/SubPageView',
    'views/forms/FormatArea',
    'layouts/edumacation/LayoutCollection',
    'text!templates/pages/add_pages_item.html',
    'text!templates/pages/subpage_edit_item.html'
], function (
    SubPage,
    SubPageView,
    FormatAreaView,
    layouts,
    html,
    editor_html
) {
    'use strict';
    var SubpageListItemView, SubpageListView, SubpageEditorView, AddPagesItem;

    SubpageListItemView = Backbone.View.extend({
        tagName: 'li',
        template: _.template('<i class="icon plus" title="Insert a subpage"></i><%= index %><i class="icon minus" title="Delete this subpage"></i>'),
        initialize: function (options) {
            this.options = options || {};
        },
        events: {
            'click': 'select',
            'click .icon.plus': 'insert',
            'click .icon.minus': 'delete'
        },
        select: function () {
            this.trigger('select');
        },
        render: function () {
            this.$el.html(this.template(this.options));
        },
        'delete': function () {
            this.trigger('delete');
        },
        insert: function () {
            this.trigger('insert');
        }

    });

    SubpageListView = Backbone.Marionette.CollectionView.extend({
        itemView: SubpageListItemView,
        itemViewOptions: function (model, index) {
            return {index: index + 1};
        },
        initialize: function () {
            this.on('itemview:select', this.bubble_select, this);
            this.on('itemview:insert', this.bubble_insert, this);
            this.on('itemview:delete', this.bubble_delete, this);
            this.collection.on('remove', this.render, this);
        },
        bubble_select: function (itemView) {
            this.trigger('select', itemView.model);
        },
        bubble_insert: function (itemView) {
            this.trigger('insert', itemView.model);
        },
        bubble_delete: function (itemView) {
            this.trigger('delete', itemView.model);
        },
        highlight: function (model) {
            this.$('>.selected').removeClass('selected');
            this.children.findByModel(model).$el.addClass('selected');
        }
    });

    SubpageEditorView = Backbone.Marionette.ItemView.extend({
        template: _.template(editor_html),
        events: {
            'keyup textarea': 'update',
            'change textarea': 'update'
        },
        initialize: function () {
            this.preview = new SubPageView({model: this.model});
            this.format_area = new FormatAreaView({
                model: this.model,
                valueAttr:'content'
            });
        },
        onRender: function () {
            this.preview.setElement(this.$('.subpage_edit_preview_target'));
            this.format_area.setElement(this.$('.subpage_format_area'));
            this.format_area.render();
            this.update();
        },
        setModel: function (model) {
            this.model = model;
            this.preview.model = model;
            this.format_area.model = model;
        },
        update: _.debounce(function () {
            this.model.set({content: this.$('textarea').val()});
            this.preview.render();
        }, 800)
    });

    AddPagesItem = Backbone.View.extend({
        className: 'add_pages_item',
        template: _.template(html),
        events: {
            'click .subpage_prepend': 'prepend_subpage',
            'change .new_pages_name': 'set_name'
        },
        initialize: function () {
            this.subpages = new SubpageListView({
                model: this.model,
                collection: this.model.get('subpages')
            });
            this.subpages.collection.comparator = 'order';
            this.editor = new SubpageEditorView();
            if (this.model.get('subpages').length === 0) {
                var subpage = new SubPage({page: this.model});
                this.model.get('subpages').add(subpage);
            }
            this.listenTo(this.subpages, 'select', this.set_subpage, this);
            this.listenTo(this.subpages, 'insert', this.insert_subpage, this);
            this.listenTo(this.subpages, 'delete', this.delete_subpage, this);
            this.to_delete = [];
        },
        render: function () {
            this.$el.html(this.template(this.model.toJSON()));
            this.subpages.setElement(this.$('.subpage_list'));
            this.subpages.render();
            this.editor.setElement(this.$('.subpage_edit'));
            this.set_subpage(this.subpages.collection.first());
        },
        set_subpage: function (subpage) {
            this.editor.setModel(subpage);
            this.editor.render();
            this.subpages.highlight(subpage);
        },
        prepend_subpage: function () {
            var new_subpage = new SubPage({page: this.model});
            this.model.get('subpages').add(new_subpage, {at:0});
            this.subpages.render();
            this.set_subpage(new_subpage);
        },
        insert_subpage: function (subpage) {
            var index = this.model.get('subpages').indexOf(subpage);
            var new_subpage = new SubPage({page: this.model});
            this.model.get('subpages').add(new_subpage, {at:(index+1)});
            this.subpages.render();
            this.set_subpage(new_subpage);
        },
        delete_subpage: function (subpage) {
            var delete_page = function() {
                if (this.subpages.collection.length > 1) {
                    var index = this.subpages.collection.indexOf(subpage);
                    if (index === this.subpages.collection.length - 1) {
                        index--;
                    }
                    //If the whole page or particular subpage was newly created, do hard deletion
                    if (this.model.isNew() || subpage.isNew()) {
                        subpage.destroy();
                        this.subpages.render();
                        this.set_subpage(this.subpages.collection.at(index));
                    } else {
                        subpage.set('deleted', true);
                        this.to_delete.push(subpage);
                        this.subpages.collection.remove(subpage);
                        this.subpages.render();
                        this.set_subpage(this.subpages.collection.at(index));
                    }
                }
                if (panel !== undefined) {
                    panel.remove();
                }
            }.bind(this);
            panel = window.panels.add({
                id: 'delete_verify',
                module: 'publisher',
                layout: layouts.get('dialog'),
                title: 'Delete Page',
                body: $('<p>Are you sure you want delete the page?</p>'),
                footer_buttons: {
                    'Delete': {
                        bt_class: 'affirmative',
                        callback: delete_page
                    },
                    'Cancel': {
                        bt_class: 'danger',
                        callback: 'remove'
                    }
                }
            });
        },
        set_name: function () {
            this.model.set({'title': this.$('.new_pages_name').val()});
        }
    });
    return AddPagesItem;
});
