/* global _, panels, user, alert */
define([
    'modules/Module',
    'models/File',
    'views/files/control',
    'layouts/edumacation/LayoutCollection'
], function (
    Module,
    FileItem,
    FilesControlView,
    layouts
) {
    'use strict';
    var Files = Module.extend({
        defaults: _.extend({}, Module.prototype.defaults, {
            model: FileItem,
            id: 'files',
            name: 'Files',
            order: 7,
            color: 'light_blue',
            control_view: FilesControlView,

            tree_actions: [{
                'group': 'Set Status',
                'items': [
                    {
                        'id': 'visible',
                        'title':'<b>Present</b>(Active)',
                        'description': 'The file is opened and synchronized on all students screens.'
                    },
                    {
                        'id': 'review',
                        'title':'<b>Review</b>(Active)',
                        'description': 'Students can view and download this file.'
                    },
                    {
                        'id': 'inactive',
                        'title':'<b>Closed</b>(Inactive)',
                        'description': 'Students have no access to this file.'
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
            }],
            file_queue: []
        }),
        MAX_ACTIVE_VISIBLE_ITEMS: 1,
        PRESENTATION_STATUSES: ['active_visible', 'visible'],
        save_item_statuses: function (items, status) {
            // only one file may be active+visible at a time
            if (!this.check_open_file_limit(items, status)) {
                require('Modules').get_module('course').save_item_statuses(
                    items, status);
            }
        },

        /**
         * Check that there are only MAX_ACTIVE_VISIBLE_ITEMS open files at a
         * time and returns how many files over the limit would be open.
         *
         * @param  {Files[]} items - New items to update.
         * @param  {String} status - Status string to change file to.
         * @return {Number} - The number of files over the limit.
         */
        check_open_file_limit: function (items, status) {
            if (!_.contains(this.PRESENTATION_STATUSES, status)) {
                return 0;
            }
            var files_filter = function (item) {
                return item.get('module') === 'files';
            };
            var active_filter = function (item) {
                return (_.contains(this.PRESENTATION_STATUSES,
                            item.get('status')));
            }.bind(this);
            var module_id = 'files';
            if (require('Modules').get_module('unitree').get('active')) {
                module_id = 'unitree';
            }
            items = items.filter(files_filter);
            var active_file_items = require('Modules').get_module(module_id
                ).items().filter(files_filter).filter(active_filter);
            var total = _.union(active_file_items, items);
            if (_.isUndefined(this.MAX_ACTIVE_VISIBLE_ITEMS)) {
                this.MAX_ACTIVE_VISIBLE_ITEMS = window.course.get(
                    'course_data').get('settings').get('max_visible_items');
            }
            var num_over_limit = total.length - this.MAX_ACTIVE_VISIBLE_ITEMS;
            if (num_over_limit > 0) {
                alert('Currently, only one file may be in Present mode at a time.');
            }
            return num_over_limit;
        },

        embed_file: function (fileObj, container, callback) {
            this.get('file_queue').push([fileObj, container, callback]);
            if (!this.loading_file) {
                this.load_files();
            }
        },

        load_files: function () {
            var file = this.get('file_queue').shift();
            if (_.isUndefined(file)) {
                return;
            }
            this.loading_file = true;

            var fileObj = file[0], container = file[1], callback = file[2];

            container.empty();

            var that = this;
            if (window.navigator.userAgent.match(/monoclePresentationTool/)) {
                container.html('<p>Sorry, this file is not viewable in Presentation Tool.</p>');
                that.loading_file = false;
                return;
            }

            var docviewer = window.docviewer = Crocodoc.createViewer('#' + container.attr('id'), {
                url: fileObj.get('box_viewer_url'),
                layout: Crocodoc.LAYOUT_PRESENTATION
            });
            docviewer.load();
            docviewer.zoom(Crocodoc.ZOOM_AUTO);

            docviewer.on('ready', function (e) {
                callback.apply(fileObj, [docviewer, e.data.numPages]);

                this.loading_file = false;

                if (this.get('file_queue').length > 0) {
                    // recursively load the next file
                    setTimeout(function () {
                        this.load_files();
                    }.bind(this), 400);
                }
            }.bind(this));
        },

        panel: undefined,

        current_form: undefined,

        refresh_control: function refresh_control(){},

        ok_func: function (item) {
            if (!this.current_form.is_valid()) { return false; }

            var args = this.current_form.values();

            args.folder = require('Modules').get_module(
                'files'
            ).get_folder_id_to_insert_into();

            var url_data = args.url;
            if (_.isArray(url_data)) {
                if (_.isUndefined(args.display_name)) {
                    // use the filename as the display name
                    args.display_name = url_data[0];
                }
                args.url = url_data[2];
                if (typeof url_data[3] !== 'undefined'){
                    if (url_data[4] === 'zip') {
                        args.html_path = url_data[5];
                    } else if (url_data[4] === 'presentation') {
                        args.box_id = url_data[5];
                    }
                }
            }

            if (item) {
                item.set(args);
            } else {
                item = new FileItem(args);
            }

            var panel = this.panel;
            panel.loading();

            var changes = item.changedAttributes();
            if (!changes) {
                panel.remove();
                return;
            }

            item.save(changes, {patch: true}).done(function () {
                panel.remove();
            }).fail(function () {
                panel.$b().html('Error saving file');
            }).always(function () {
                panel.set({
                    footer_buttons: {
                        Ok: 'remove'
                    }
                });
            });
        },

        add_item: function(item) {
            if (item && !item.id) {
                // item is an empty array if it's not an object ???
                item = null;
            }

            //setup dialog args
            var dialog_title = item ? 'Edit File' : 'Add File';
            if((window.user.get('role') !== 'teacher')) {
                dialog_title = 'Download file';
            }

            this.panel = panels.add({
                id: 'save_file_elem',
                module: 'files',
                layout: layouts.get('dialog'),
                title: dialog_title,
                width: 380,
                footer_buttons: {
                    Cancel: 'remove',
                    Ok: function () {
                        this.ok_func(item);
                    }.bind(this)
                }
            });
            var form_elements = [];

            form_elements = [
                    {
                        id: 'url',
                        type: 'upload',
                        label: 'Upload file',
                        validation: ['not_empty']
                    },
                    {
                        id: 'display_name',
                        type: 'text',
                        label: 'Custom name (optional)',
                        validation: ['filename']
                    },
                    {
                        id: 'description',
                        type: 'textarea',
                        label: 'Description (optional)'
                    }
                ];

            // Freemium users cannot upload zip files unless they have been given access to the pages module
            if (user.get('freemium') && user.get('authorized_modules').indexOf('pages') === -1) {
                form_elements[0].validation = ['not_zip'];
            }

            // If we're modifying an existing file, populate the form with
            // the file's data.
            if(item) {
                this.panel.loading();
                item.fetch().done(function() {
                    // Add tabs to the panel
                    this.panel.set({
                        body: [
                            ['description', 'Description', ''],
                            ['download', 'Download', '']
                        ]
                    });

                    // Make the upload_button control optional.
                    form_elements[0].validation = undefined;

                    this.current_form =
                        this.panel.get_tab_el('description').
                        composer(form_elements);
                    this.current_form.values(item.attributes);

                    this.panel.get_tab_el('download').composer([{
                        type: 'html',
                        value: '<div class="thm_panel_content_title"><a href="' +
                            item.get('url') + '" target="_blank">Download file</a></div>'
                    }]);
                }.bind(this));
            } else {
                this.current_form = this.panel.$b().composer(form_elements);
            }
        }
    });

    return Files;
});
