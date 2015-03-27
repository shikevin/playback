/* global _ */
define([
    'modules/Module',
    'views/unitree/Control'
], function (Module, UnitreeControlView) {
    'use strict';

    var UnitreeModule = Module.extend({
        defaults: _.extend({}, Module.prototype.defaults, {
            id: 'unitree',
            name: 'Content',
            color: 'grey',
            control_view: UnitreeControlView,
            order: 1,
            tree_actions: [{
                'group': 'Set Status',
                'items': [
                    {
                        'id': 'active_visible',
                        'title':'<b>Ask</b>(Active + Visible)',
                        'description': 'Online students will see the item. Students can submit answers.'
                    },
                    {
                        'id': 'visible',
                        'title':'<b>Show</b>(Visible)',
                        'description': 'Online students will see the item. Students can not submit answers.'
                    },
                    {
                        'id': 'active',
                        'title':'<b>Homework</b>(Active)',
                        'description': 'Assign item as homework to students.'
                    },
                    {
                        'id': 'review',
                        'title':'<b>Review</b>',
                        'description': 'Give students study items. Students can view answers.'
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
                    {id: 'Schedule', instant: true, title: 'Schedule Item'},
                    {id: 'students', instant: true, title: 'Assign to individuals'}
                ]
            }]
        }),
        add_item: function () {
            throw('UnitreeModule.add_item is unimplemented');
        },
        edit_item: function (model) {
            throw('UnitreeModule.edit_item is unimplemented');
        }
    });
    return UnitreeModule;
});
