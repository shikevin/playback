/* global _ */
define([
], function (
) {
    'use strict';
    return {
         /**
         * Update a single field using a PUT request. Used instead of saving
         * with PATCH because windows PT doesn't support PATCH.
         * @param  {String}   field    The field to update.
         * @param  {String}   value    Value to update field to.
         * @param  {Function} callback Callback on success.
         */
        update_field: function (field, value, callback) {
            var url = this.url.call(this) + '/' + field;

            return $.ajax(url, {
                data: '' + value,
                type: 'PUT',
                processData: false,
                dataType: 'json',
                contentType: '*/*',
                success: function (data) {
                    this.set(data);
                    if (!_.isUndefined(callback)) {
                        callback(this);
                    }
                }.bind(this)
            });
        }
    };
});


