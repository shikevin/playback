/* global Backbone, _ */

define([
], function (
) {
    'use strict';

    var Alert = Backbone.Model.extend({
        defaults: {
            msg: '',
            // "warning" (yellow), "danger" (red), "success" (green) or
            // "info" (blue)
            level: ''
        }
    });

    //return Alert;
    return _.extend(Alert, {
        // Constants.
        MSG_GENERIC: ('An error occurred when trying submit your feedback. ' +
                      'Hang tight, we\'re working on it.')

    });
});
