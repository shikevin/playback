/*globals define*/
define(['models/ModuleItem'], function (ModuleItem) {
    'use strict';
    var event_log = {};

    var log_display_event = function log_display_event(item, identifier) {
        event_log[identifier] = true;
        $.ajax({
            url: '/api/v2/question-display/',
            type: 'POST',
            dataType: 'json',
            contentType: 'application/json',
            data: JSON.stringify({
                'item_id': item.get('id'),
                'last_activated_at': item.get('last_activated_at')
            })
        }).fail(function display_event_log_failed() {
            event_log[identifier] = false;
        });
    };

    var unique_identifier = function unique_identifier(item) {
        return item.get('id') + item.get('status') + item.get('last_activated_at');
    };

    var check_event_log = function check_event_log(item) {
        var identifier = unique_identifier(item);
        if (!event_log[identifier]) {
            log_display_event(item, identifier);
        }
    };

    var old_sync = ModuleItem.prototype.sync;

    ModuleItem.prototype.sync = function display_event_sync_injector() {
        var result = old_sync.apply(this, arguments);
        if (window.user.get('role') === 'student' && this.get('status') === 'active_visible') {
            check_event_log(this);
        }
        return result;
    };
});