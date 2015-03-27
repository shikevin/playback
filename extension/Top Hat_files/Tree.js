/*globals define, _*/
/* Note: copied from tree.dev.js, needs refactoring */
define(['tree/views/Folder'], function (FolderView) {
    'use strict';
    //initialization argments: {'model': TreeModel, 'empty_message': 'Message to show w/ no items'}
    var TreeView = FolderView.extend({
        tagName: 'div',
        className: 'tree',
        template: _.template('<% if( show_select_all ) { %><a href="#" class="select_all">Select All/None</a><% } %>' +
            '<div class="empty"></div>' +
            '<ol class="folder_items"></ol>'),
        events: {
            'click a.select_all': 'toggle_select_all'
        },
        toggle_select_all: function(e) {
            e.preventDefault();

            var new_selected = (this.model.get('selected') === true) ? false : true;
            this.model.set({'selected': new_selected});
        },
        initialize: function (options) {
            this.options = options || {};
            FolderView.prototype.initialize.call(this);

            //set sorting and bind for property updates
            this.model.bind('change:sortable', this.set_sorting, this);
            this.model.get('children').bind('add', this.render_empty_message, this);
            this.model.get('children').bind('remove', this.render_empty_message, this);
            this.model.get('children').bind('change:status', this.render_empty_message, this);
        },
        render: function() {
            FolderView.prototype.render.call(this);
            this.set_sorting();
            this.set_resizable();

            if( this.options.max_height ) {
                $(this.el).children('ol').css('max-height', this.options.max_height + 'px');
            }

            this.render_empty_message();
        },
        render_items: function() {
            //do not re-render the tree while it is being dragged
            if( this.options.tree_dragging ) { return false; }
            FolderView.prototype.render_items.call(this);
        },
        render_empty_message: function() {
            if( !this.options.empty_message ) { return false; }

            // if an empty message has been provided, add it
            // for students, a tree is empty if it has no items with status inactive
            // for profs, a tree is empty if it has no children
            var has_visible_children;
            var children = this.$el.children('ol').children('li');
            if (window.user.get('role') === 'student') {
                has_visible_children = children.not('.inactive').length > 0;
            } else {
                // prof
                has_visible_children = children.length > 0;
            }
            if( has_visible_children ) {
                $(this.el).children('.empty').hide();
            } else {
                $(this.el).children('.empty').attr('aria-label', this.options.empty_message);
                $(this.el).children('.empty').html( this.options.empty_message ).show();
            }
        },
        set_sorting: function() {
            if( !$().nestedSortable ) {
                return false;
            }

            if (!this.model.get('sortable')) {
                var $ol = this.$el.children('ol');
                if ($ol.data('sortable')) {
                    $ol.nestedSortable('destroy');
                }
                return true;
            }

            var tree_view = this;
            $(this.el).children('ol').nestedSortable({
                disableNesting: 'no_tree_children',
                forcePlaceholderSize: true,
                handle: 'div > em',
                helper: 'clone',
                items: 'li',
                maxLevels: 5,
                opacity: 0.6,
                placeholder: 'placeholder',
                revert: false,
                tabSize: 20,
                tolerance: 'pointer',
                toleranceElement: '> div',
                revertOnError: 0,

                scroll: true,
                scrollY: true,
                scrollX: false,

                placeholderParent: 'placeholderParent',

                start: function(event, ui) {
                    //keep track of the fact that the tree is being dragged, as this may affect rendering of the tree
                    //re-rendering the tree while dragging is occuring will cause the browser to hang, for example
                    tree_view.options.tree_dragging = true;

                    var start_pos = ui.item.index();
                    ui.item.data('start_pos', start_pos);

                    var start_parent = ui.item.parent('ol').parent('li').data('model');
                    if( !start_parent ) { start_parent = tree_view.model; }
                    ui.item.data('start_parent', start_parent);
                },
                stop: function (event, ui) {
                    tree_view.options.tree_dragging = false;
                },
                update: function(event, ui) {
                    var item = ui.item.data('model');

                    var end_parent = ui.item.parent('ol').parent('li').data('model');
                    if( !end_parent ) { end_parent = tree_view.model; }
                    var start_parent = ui.item.data('start_parent');

                    var start_pos = ui.item.data('start_pos');
                    var end_pos = $(ui.item).index();

                    if( start_parent !== end_parent ) {

                        //if we are moving a child into a hidden folder, mark the folder as opened on drop
                        if( end_parent.get('hidden') ) {
                            end_parent.set({'hidden': false});
                        }
                    } else if( start_pos !== end_pos ) {
                        start_parent.move(item, end_pos);
                    }

                    tree_view.model.trigger('sorted', item, start_parent, end_parent, end_pos);
                }
            }).addClass('sortable');
        },
        set_resizable: function() {
            if( this.options.resizable && (this.options.max_height > 0) && $().resizable ) {
                $(this.el).resizable({
                    handles:'s',
                    minHeight: 40,
                    start: $.proxy(function() {
                        /*$(this.el).children('ol').css('max-height', 'inherit');*/
                    }, this),
                    resize: $.proxy(function() {
                        var new_height = $(this.el).height();
                        $(this.el).children('ol').css('max-height', new_height + 'px');
                    }, this)
                });
                $(this.el).addClass('resizable');
            }
        }
    });
    window.tree_constructors.views.tree = TreeView;
    return TreeView;
});