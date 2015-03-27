/* global _, panels, alert */
define([
    'modules/Module',
    'views/ModuleControl',
    'views/pages/AddPagesItem',
    'views/pages/PagesEditor',
    'models/Page',
    'layouts/edumacation/LayoutCollection'
], function (
    Module,
    PagesControlView,
    AddPagesItemView,
    PagesEditorView,
    Page,
    layouts
) {
    'use strict';

    var PagesModule = Module.extend({
        defaults: _.extend({}, Module.prototype.defaults, {
            id: 'pages',
            name: 'Pages',
            color: 'grey',
            control_view: PagesControlView,
            model: Page,
            order: 1,
            tree_actions: [{
                'group': 'Set Status',
                'items': [
                    {
                        'id': 'active_visible',
                        'title':'<b>Ask</b>(Active + Visible)',
                        'description': 'Online students will see the item. Students can answer.'
                    },
                    {
                        'id': 'active',
                        'title':'<b>Homework</b>(Active)',
                        'description': 'Assign homework to students.'
                    },
                    {
                        'id': 'inactive',
                        'title':'<b>Closed</b>(Inactive)',
                        'description': 'Only professors can access'
                    }
                ]
            }, {
                'group': 'Actions',
                'items': [
                    {id: 'Duplicate', instant: true, title: 'Duplicate Item'},
                    {id: 'Edit', instant: true, title: 'Edit Item'},
                    {id: 'Schedule', instant: true, title: 'Schedule Item'},
                    {id: 'students', instant: true, title: 'Assign to individuals'}
                ]
            }]
        }),
        is_using_ckeditor: function(){
            return window.course.get('course_data').get('settings').get('use_ckeditor');
        },
        add_item: function () {
            // CKEditor version 4.4.0 is not compatible with
            // version of Gecko layout engine implemented by the
            // webview currently used in PT
            if (window.is_presentation_tool && this.is_using_ckeditor()) {
                alert('Unfortunately, CKEditor is disabled in Presentation Tool. Please contact support for assistance.');
            }
            else {
                return this.edit_item(new Page());
            }
        },
        edit_item: function (model) {
            var panel, editor, view;

            if (window.is_presentation_tool && this.is_using_ckeditor()) {
                alert('Unfortunately, CKEditor is disabled in Presentation Tool. Please contact support for assistance.');
                return;
            }

            panel = panels.get('add_pages');

            if (panel) {
                // the panel is already open
                return;
            }
            panel = panels.add({
                id: 'add_pages',
                layout: layouts.get('dialog'),
                title: 'Subpage Editor',
                body: $('#loading_template').html(),
                width: 980,
                footer_buttons: {
                    'Cancel': function () {
                        if (editor) {
                            view.remove_editor();
                        }
                        view.remove();
                        panel.remove();
                        if (model.isNew()) {
                            model.destroy();
                        }
                    },
                    'Save': function () {
                        if (editor){
                            view.save_subpage(view.current_subpage);
                            view.remove_editor();
                        }
                        panel.set({
                            body: $('#loading_template').html()
                        });
                        // This re-adds the subpages that were removed from the collection
                        // so that their deleted flags will be set when the model is saved
                        if (editor) {
                            for (var i = 0; i < view.to_delete.length; i++) {
                                model.get('subpages').add(view.to_delete[i], {at:model.get('subpages').length-1});
                            }
                        }
                        model.save({folder: this.get_folder_id_to_insert_into()})
                            .done(function () {panel.remove();})
                            .fail(function () {
                                panel.set({
                                    body: view.el
                                });
                            });
                    }.bind(this)
                }
            });

            model.fetch().then(function () {
                editor = model.get('editor');
                view = editor ? new PagesEditorView({model: model}) : new AddPagesItemView({model: model});

                view.render();
                panel.set({
                    body: view.el
                });
                if (editor) {
                    view.add_editor();
                }
            });
        }
    });
    return PagesModule;
});
