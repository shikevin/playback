/* global _ */
define([
], function (
) {
    'use strict';
    return {
        /**
         * If a professer adds an item while one folder is selected, the item
         * will be added into that folder this is a method that return the
         * selected folder if only one is selected, otherwise null.
         */
        get_folder_id_to_insert_into: function () {
            var module_id = 'unitree';
            if (!require('Modules').get_module('unitree').get('active')) {
                module_id = this.get('module') || this.get('id');
            }
            var tree = require('Modules').get_module(module_id).get('tree');
            var folder = this.traverse_tree_to_get_folder(tree);
            if (folder) {
                var folder_id = folder.get('id');
                if (folder_id) {
                    return folder_id;
                }
            }
            return null;
        },

        traverse_tree_to_get_folder: function (node) {
            var child_models = node.get('children').models;
            var child_folders = _.filter(child_models, function (child) {
                return (
                    child.get('selected') &&
                    child.get('item_type') === 'module_item_folder'
                );
            });
            if (child_folders.length === 0) {
                return node;
            } else if (child_folders.length > 1) {
                return false;
            } else {
                return this.traverse_tree_to_get_folder(child_folders[0]);
            }
        }
    };
});
