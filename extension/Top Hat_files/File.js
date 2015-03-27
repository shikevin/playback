/* global define, _ */
define([
    'models/ModuleItem',
    'views/files/content',
    'util/Browser'
], function (
    ModuleItem,
    FilesView,
    Browser
) {
    'use strict';

    var FileItem = ModuleItem.extend({
        urlRoot: '/api/v3/files/file_obj/',
        idAttribute: 'resource_uri',
        view_type: FilesView,
        defaults: {
            module: 'files',
            module_color: 'light_blue',
            open: false
        },
        get_required_attributes: function(cb, proxy) {
            if (this.id === undefined && this.get('id') === undefined) {
                // we can't call fetch() without an id :(
                return;
            }
            this.fetch({
                success: function() {
                    this.set(this.get('custom_data'));
                    if(_.isFunction(cb)) {
                        cb.call(proxy);
                    }
                }.bind(this)
            });
        },
        edit_dialog: function() {
            require('Modules').get_module('files').add_item(this);
        },
        initialize: function() {
            ModuleItem.prototype.initialize.call(this);
        },
        button_list: function() {
            var BUTTONS = this.BUTTONS;
            var buttons_dict = {
                teacher: {
                    active_visible: [
                        BUTTONS.CLOSE,
                        BUTTONS.DOWNLOAD
                    ],
                    visible: [
                        BUTTONS.CLOSE,
                        BUTTONS.DOWNLOAD
                    ],
                    active: [],
                    review: [],
                    inactive: []
                },
                student: {
                    active_visible: [],
                    visible: [],
                    active: [],
                    review: [
                        BUTTONS.DOWNLOAD,
                        BUTTONS.CLOSE
                    ],
                    inactive: []
                }
            };

            var buttons = buttons_dict[window.user.get('role')][this.get('status')];
            if (_.isUndefined(buttons)) {
                return [];
            }

            if (window.user.is_teacher()) {
                buttons_dict.student.active_visible.unshift(BUTTONS.DOWNLOAD);
                buttons_dict.student.review.unshift(BUTTONS.DOWNLOAD);

                var button_position = buttons.length;
                if (window.user.is_teacher()) {
                    button_position = 0;
                }
                buttons.splice(button_position, 0, BUTTONS.MAGNIFY);
            }
            return buttons;
        },
        button_callbacks: $.extend({}, ModuleItem.prototype.button_callbacks, {
            'Download': {
                callback: function (mi) {
                    window.open(mi.get('url'), '_blank');
                }
            }
        })
    });

    FileItem.EMBED_TYPES = ['pdf', 'doc', 'docx', 'ppt', 'pptx'];
    FileItem.PREVIEW_TYPES = ['jpeg', 'jpg', 'png', 'gif'];
    FileItem.ARCHIVE_TYPES = ['zip'];

    return FileItem;
});
