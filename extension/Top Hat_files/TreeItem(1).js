/*globals define, Backbone, _*/
/* Note: copied from tree.dev.js, needs refactoring */
define([
    'text!templates/tree/tree_item.html'
], function (html) {
    'use strict';
    var lastSelected = null;
    var TreeItemView = Backbone.View.extend({
        className: 'tree_row item no_tree_children',
        tagName: 'li',
        template: _.template(html),
        status_to_text: {
            active_visible: 'Item is active',
            active: 'Item is assigned homework',
            visible: 'Item is displayed',
            review: 'Item is in review mode',
            inactive: 'Item is closed'
        },
        initialize: function () {
            this.model
                .bind('change:selectable', this.render, this)
                .bind('change:selected', this.render, this)
                .bind('change:title', this.render, this);
        },
        events: {
            'click em.module_item': 'click',
            'keyup em.module_item': 'keyup',
            'click input[type=checkbox]': 'toggle_select'
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
        click: function (e) {
            this.$el.focus();
            this.model.trigger('click');
            /* this is required because click events bubble up the tree, thus it will trigger the event
               in FolderView as well
            */
            e.stopPropagation();
        },
        keyup: function (e) {
            if (e.which === $.ui.keyCode.ENTER) {
                this.click(e);
            }
        },
        render: function () {
            this.model.set(
                {status_text: this.status_to_text[this.model.get('status')]}
            );
            var html = this.template(this.model.toJSON());
            this.$el.html(html);

            this.$el
                .prop('id', this.model.cid)
                .data('model', this.model);

            this.delegateEvents();
            this.$el.dragCheckbox();
        }
    });
    window.tree_constructors.views.item = TreeItemView;
    return TreeItemView;
});
