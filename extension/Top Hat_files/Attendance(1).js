/* global Backbone, org */
define([
], function (
) {
    'use strict';
    var AttendanceItem = Backbone.Model.extend({
        urlRoot: '/api/v2/attendance/', // where to save
        idAttribute: 'resource_uri',
        get_id: function () {
            return '' + parseInt(this.get('id').match('[0-9].*'), 10);
        },
        defaults: {
            module: 'attendance',
            attempt_limit: 3,
            title: null,
            code: null,
            sms_code: null,
            answered: 'False',
            course: null,
            phone_number: null,
            color: 'aqua'
        },
        initialize: function () {
            this.set({
                'phone_number': org.get('phone_number_country_code') + ' ' + org.get('sms_phone_number')
            });
        },
        save_status: function (status) {
            require('Modules').get_module('course').save_item_statuses([this], status);
        },
        is_visible: function () {
            // returns true if the item is visible AND the item's module is visible
            var status = this.get('status');
            if (
                (status === 'visible' || status === 'active_visible') &&
                require('Modules').get_module(this.get('module')).get('active')
            ) {
                return true;
            } else {
                return false;
            }
        },
        setup_panel: function (force) {
            // in this function, we want to determine if it is necessary to create
            // or destroy the view. If the visibility of the item changes, the
            // view must be updated.
            // bound by module_item initialize()
        }
    });
    return AttendanceItem;
});
