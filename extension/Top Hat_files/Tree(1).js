/* global _, Backbone */
define([
    'tree/models/Folder'
], function (
    Folder
) {
    'use strict';
    var Tree = Folder.extend({
        defaults: {
            sortable: false,
            show_select_all: false
        }
    });
    return Tree;
});
