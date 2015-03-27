/* globals define, _ */
/* Note: copied from tree.dev.js, needs refactoring */
define([
    'tree/views/TreeActionItem',
    'text!templates/tree/tree_folder.html'
], function (TreeActionItemView, html) {
    'use strict';
    var lastSelected = null;
    var FolderView = TreeActionItemView.extend({
        className: 'tree_row folder app-styles',
        template: _.template(html),
        events: {
            'click em.folder': 'click',
            'click .folder_details input[type=checkbox]': 'toggle_select',
            'click span.status': 'show_action_menu',
            'click .folder_details a.toggle_hide': 'toggle_hide'
        },

        initialize: function() {
            this.listenTo(this.model, 'change:title', this.render, this);
            this.listenTo(this.model, 'change:selected', this.render_details, this);

            //when folder hidden or shown, update both the items below, as well as the hide/show button in the details pane
            this.listenTo(this.model, 'change:hidden', this.render_items, this);
            this.listenTo(this.model, 'change:hidden', this.render_details, this);

            //create and remove item views when items are added to the folder; see commentary under `initialize_children_views` for details
            var children = this.model.get('children');
            this.listenTo(children, 'add', function(item) { this.children_views[item.cid] = this.initialize_item_view(item); }, this);
            this.listenTo(children, 'remove', function remove_child_view (item) {
                this.children_views[item.cid].remove();
                delete this.children_views[item.cid];
            }, this);
            this.listenTo(children, 'reset', this.initialize_children_views, this);
            this.initialize_children_views();

            this.listenTo(children, 'add', this.render_items, this);
            this.listenTo(children, 'reset', this.render_items, this);

            this.listenTo(this.model, 'move', this.render_items, this);

            $(this.el)
                .attr('id', this.model.cid)
                .data('model', this.model);

            this.listenTo(this.model, 'deserialize', this.sort, this);
        },

        click: function(e) {
            this.model.trigger('click');
            /* this is required because click events bubble up the tree, thus it will trigger the event
               multiple times within FolderView if you have multi-level folders
            */
            e.stopPropagation();
        },

        sort: function () {
            var container = this.$el.children('ol');
            var views = container.children('li');
            views.detach();

            var cids = _.pluck(this.model.get('children').models, 'cid');
            _.each(cids, function (cid) {
                var view = _.find(views, function (view) {
                    return view.getAttribute('id') === cid;
                });
                container.append(view);
            });
        },

        //we initialize children views when they are added to the collection, and reference those views on redraw
        //this is more efficient than creating new views each time we re-render the folder, and it allows us to remove
        //views if the child model is ever removed from the folder
        children_views: {},

        //sets up views for all children
        initialize_children_views: function() {
            this.children_views = {};

            var collection = this.model.get('children');
            if (collection) {
                var items = collection.models;
                var len = collection.length;

                for (var i = 0; i < len; i++) {
                    var item = items[i];
                    this.children_views[item.cid] = this.initialize_item_view(item);
                }
            }
        },

        //our tree is responsible for initializing new views for the items in the tree; each item should have a default class,
        //stored as the view_class property
        initialize_item_view: function(item) {
            var ViewClass = window.tree_constructors.views[ item.get('item_type') ];
            return new ViewClass({'model': item});
        },

        toggle_hide: function(e) {
            e.preventDefault();
            e.stopPropagation();
            var is_hidden = this.model.get('hidden');
            this.model.save_hidden(!is_hidden);
        },
        render: function() {
            TreeActionItemView.prototype.render.call(this);

            this.render_details();
            this.render_items();
        },
        render_details: function() {
            if( this.model.get('hidden') ) {
                this.$el.addClass('collapsed');
            } else {
                this.$el.removeClass('collapsed');
            }

            //set the 'indeterminate' property for the selected checkbox if it is mixed
            //this can only be done in JS
            switch (this.model.get('selected')) {
            case true:
                this.$el.children('.folder_details').find('input[type=checkbox]').prop({
                    checked: true,
                    indeterminate: false
                });
                break;
            case false:
                this.$el.children('.folder_details').find('input[type=checkbox]').prop({
                    checked: false,
                    indeterminate: false
                });
                break;
            case 'mixed':
                this.$el.children('.folder_details').find('input[type=checkbox]').prop('indeterminate', true);
                break;
            default:
                break;
            }
        },
        toggle_select: function (e) {
            e.stopPropagation();
            var is_selected = !this.model.get('selected');
            this.model.set({selected: is_selected});
            var items = this.model.collection.models;

            if(!e.shiftKey) {
                lastSelected = this.model;
            } else {
                var start = items.indexOf(this.model);
                var end = items.indexOf(lastSelected);
                var toChange = items.slice(Math.min(start,end) , Math.max(start, end));
                _.each(toChange, function(item) {
                    item.set('selected', lastSelected.get('selected'));
                });
            }
        },
        render_items: function() {
            //get the list that we will be putting our children into
            var ol_el = this.$el.children('ol');
            if (ol_el.length === 0) {
                this.$el.append('<ol/>');
                ol_el = this.$el.children('ol');
            }

            //if there are any child elements in the folder, do a jQuery detach on them first before wiping the html
            //of the list; this will preserve any events that were bound on the child views els
            ol_el.children('li').detach();
            ol_el.html('');

            //hide the list if the folder is hidden, otherwise show
            if( this.model.get('hidden') ) {
                ol_el.addClass('collapsed');
            } else {
                ol_el.removeClass('collapsed');
            }

            //re-insert each children's view
            var collection = this.model.get('children');
            if (collection) {
                var items = collection.models;
                var len = collection.length;
                for (var i = 0; i < len; i++) {
                    var item = items[i];
                    var view = this.children_views[item.cid];
                    if (view) {
                        view.render();
                        ol_el.append(view.$el);
                    }
                }
            }
        }
    });
    window.tree_constructors.views.folder = FolderView;
    return FolderView;
});
