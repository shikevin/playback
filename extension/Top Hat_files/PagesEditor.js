/* globals define, Backbone, _, CKEDITOR*/
define([
    'mathjax',
    'models/question/question',
    'models/discussion/discussion',
    'models/Demo',
    'models/File',
    'views/question/Embed',
    'views/Placeholder',
    'models/pages/SubPage',
    'layouts/edumacation/LayoutCollection',
    'text!templates/pages/subpage_editor.html'
], function (
    mathjax,
    QuestionItem,
    DiscussionItem,
    DemoItem,
    FileItem,
    EmbedQuestionView,
    PlaceholderView,
    SubPage,
    layouts,
    html
) {

    'use strict';

    var SubpageListItemView, SubpageListView, SubpageEditorView;

    SubpageListItemView = Backbone.View.extend({
        tagName: 'li',
        template: _.template('<i class="icon plus" title="Insert a subpage"></i><%= index %><i class="icon minus" title="Delete this subpage"></i>'),
        events: {
            'click': 'select',
            'click .icon.plus': 'insert',
            'click .icon.minus': 'delete'
        },
        initialize: function (options) {
            this.options = options || {};
        },
        select: function () {
            this.trigger('select');
        },
        render: function () {
            this.$el.html(this.template(this.options));
        },

        'delete': function () {
            var panel;
            var delete_page = function() {
                this.trigger('delete');
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
        className: 'editor_container',
        template: _.template(html),
        events: {
            'click .subpage_prepend': 'prepend_subpage',
            'change .new_pages_name': 'set_name'
        },
        initialize: function () {
            this.subpages = new SubpageListView({
                collection: this.model.get('subpages')
            });
            if (this.model.get('subpages').length === 0) {
                var subpage = new SubPage({page: this.model});
                this.model.get('subpages').add(subpage);
            }
            this.current_subpage = this.model.get('subpages').first();
            this.listenTo(this.subpages, 'select', this.set_subpage, this);
            this.listenTo(this.subpages, 'insert', this.insert_subpage, this);
            this.listenTo(this.subpages, 'delete', this.delete_subpage, this);
            this.to_delete = [];
        },
        render: function () {
            this.subpages.collection.comparator = 'order';
            this.$el.html(this.template(this.model.toJSON()));
            this.subpages.setElement(this.$('.subpage_list'));
            this.subpages.render();
        },
        set_subpage: function (subpage) {

            this.save_subpage(this.current_subpage);

            if (this.editor) {
                this.editor.setData(subpage.get('content'));
                this.render_editor();
                this.subpages.highlight(subpage);
                this.current_subpage = subpage;
            }
        },
        add_editor: function () {
            CKEDITOR.replace( 'editable', { customConfig: window.CKEDITOR_THMCONFPATH } );
            this.editor = CKEDITOR.instances.editable;
            var first = this.model.get('subpages').first();

            this.editor.setData(first.get('content'));
            this.subpages.highlight(first);
            this.current_subpage = first;

            this.editor.on('instanceReady', this.render_editor, this);
            this.editor.on('afterInsert', this.render_editor, this);
            this.editor.on('paste', this.clean_clipboard, this);
            this.editor.on('afterPaste', this.render_modules, this);
            $(window).bind('beforeunload', function(){
                return 'You have not saved this Page.';
            });
        },
        remove_editor: function (){
            if (this.editor) {
                this.editor.removeAllListeners();
                this.editor.destroy(true);
                $(window).unbind('beforeunload');
            }
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
        },
        set_name: function () {
            this.model.set({'title': this.$('.new_pages_name').val()});
        },
        // When the subpage is saved, we have to sanitize it so that html used to display top hat modules
        // and media within the editor are stripped from the html that is saved.
        // To do so, each element in the html is looked at. If the element is an element node, we inspect
        // it for a relevant class, and stip the contents if one is found.
        // If the element is a text node, we don't format it. This is meant to catch new lines.
        // Any actual text should be within a tag, which will be processed as an element node
        // For info on node types, see https://developer.mozilla.org/en-US/docs/Web/API/Node.nodeType
        // We also must make all links open in a new page
        save_subpage: function (subpage) {
            if (this.editor) {
                var result = '';
                $(this.editor.getData()).each(function (i, el){
                    $(el).find("a").attr('target', '_blank');
                    if (el.nodeType === window.Node.ELEMENT_NODE) {
                        if ($(el).data('module') || $(el).attr('media-url')) {
                            $(el).empty();
                        }
                        result += $(el).prop('outerHTML');
                    } else if (el.nodeType === window.Node.TEXT_NODE) {
                        result += $(el).text();
                    }
                });
                subpage.set({content: result});
            }
        },
        render_editor: function (e) {
            if (e && e.data && e.data.content === 'modules') {
                this.render_modules();
            } else if (e && e.data && e.data.content === 'media') {
                this.render_media();
            } else {
                this.render_modules();
                this.render_media();
            }
        },
        render_modules: function () {
            $(this.editor.window.getFrame().$).contents().find('div[data-module]').each(function (i, el) {
                var pk, item, details_view, module_id;
                pk = $(el).attr('data-pk');
                module_id = $(el).data('module');

                if (module_id === 'question') {
                    item = new QuestionItem({id: pk});
                } else if(module_id === 'demo') {
                    var demo_pk = this.editor ? pk : 'key__demo_demo__' + pk;
                    item = new DemoItem({id: demo_pk});
                } else if(module_id === 'discussion') {
                    item = new DiscussionItem({id: pk});
                } else if(module_id === 'files') {
                    item = new FileItem({id: pk});
                } else {
                    return;
                }

                details_view = module_id === 'demo' ? new PlaceholderView({model:item}) : new EmbedQuestionView({model: item});

                details_view.setElement(el);

                item.get_required_attributes(function () {
                    details_view.render();
                    mathjax.execute_mathjax(this.el);
                }.bind(this));
            }.bind(this));
        },
        render_media: function () {
            $(this.editor.window.getFrame().$).contents().find('div[media-url]').each(function (i,el) {
                var html = $('<iframe width="560" height="315" frameborder="0" allowfullscreen></iframe>');
                $(el).empty();
                html.attr('src', $(el).attr('media-url'));
                $(el).append(html);
            });
        },
        clean_clipboard: function (e) {
            var html = '';
            var clipboard_content = $(e.data.dataValue);

            if (clipboard_content.find('div[data-widget="tophat"]').length) {
                clipboard_content.find('div[data-widget="tophat"]').empty();
                for (var i = 0; i < clipboard_content.length; i++){
                    html += clipboard_content[i].outerHTML;
                }
                e.data.dataValue = html;
            }
        }
    });

    return SubpageEditorView;
});
