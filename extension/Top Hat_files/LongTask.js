define([
    'HoudiniResource'
], function (
) {
    'use strict';
    var LongTask = window.HoudiniResource.extend({
        urlRoot: '/api/v1/longtask',
        uses_polling: true,
        polling_interval: 5000,
        defaults: {
            name: null,
            complete: 0,
            result: null,
            started_at: null,
            finished_at: null,
            owner: null,
            failed: false
        },
        initialize: function () {
            window.HoudiniResource.prototype.initialize.apply(this);
        }
    });

    return LongTask;
});
