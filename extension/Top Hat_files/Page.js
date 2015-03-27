/* globals define, _ */
define([
    'models/ModuleItem',
    'views/pages/PageContentView',
    'collections/pages/SubPages',
    'models/question/question'
], function (
    ModuleItem,
    PageContentView,
    SubPages,
    Question
) {
    'use strict';
    var Page = ModuleItem.extend({
        urlRoot: '/api/v2/pages/',
        idAttribute: 'resource_uri',
        view_type: PageContentView,
        defaults: function () {
            return _.extend(ModuleItem.prototype.defaults, {
                module: 'pages',
                module_color: 'grey',
                subpages: new SubPages(),
                status: 'inactive',
                title: 'Pages Item' + require('Modules').get_module('pages').items().models.length + 1,
                items: {},
                editor: 1
            });
        },
        toJSON: function () {
            var json = {
                title: this.get('title'),
                editor: this.get('editor'),
                folder: this.get_folder_id_to_insert_into()
            };
            return json;
        },
        fetch: function (options) {
            if (this.isNew()) {
                return $.when();
            }
            return $.when(
                ModuleItem.prototype.fetch.apply(this, options),
                this.get('subpages').fetch({
                    data: {page__id: this.get_id()}
                })
            );
        },
        parse: function (response) {
            if (response && response.items) {
                var items = {};
                _.each(response.items, function (item) {
                    if (item.module === 'question') {
                        items[item.id] = new Question({id: item.item_id});
                    } else {
                        items[item.id] = item;
                    }
                });
                response.items = items;
            }
            return response;
        },
        save: function (attributes, options) {
            var result = $.Deferred(),
                xhr = ModuleItem.prototype.save.call(this, attributes, options);
            xhr.fail(function () {
                result.reject();
            }).done(function () {
                //call 'save' on each of the subpages, then resolve
                result.resolveWith(
                    $.when.apply(
                        this.get('subpages').map(function (subpage) {
                            return subpage.save();
                        })
                    )
                );
            }.bind(this));
            return result;
        },
        edit_dialog: function () {
            require('Modules').get_module('pages').edit_item(this);
        },
        button_list: function() {
            var BUTTONS = this.BUTTONS;
            var buttons_dict = {
                teacher: {
                    active_visible: [BUTTONS.CLOSE],
                    visible: [BUTTONS.CLOSE],
                    active: [BUTTONS.CLOSE],
                    inactive: []
                },
                student: {
                    active_visible: [],
                    visible: [],
                    active: [BUTTONS.CLOSE],
                    inactive: []
                }
            };

            var buttons = buttons_dict[ window.user.get('role') ][ this.get('status') ];
            if (_.isUndefined(buttons)) {
                return [];
            }

            // if user is a professor, add a magnify or demagnify button
            var button_to_push;
            if (window.user.is_teacher() && this.get('status') !== 'inactive') {
                if (this.get('has_correct_answer')) {
                    if (this.get('show_answer')) {
                        button_to_push = BUTTONS.HIDE_ANSWER;
                    } else {
                        button_to_push = BUTTONS.SHOW_ANSWER;
                    }
                    buttons.push(button_to_push);
                }

                if (this.get('is_magnified')) {
                    button_to_push = BUTTONS.DEMAGNIFY;
                } else {
                    button_to_push = BUTTONS.MAGNIFY;
                }
                buttons.push(button_to_push);
            }

            return buttons;
        }
    });
    return Page;
});
