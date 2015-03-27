define([
    'models/LongTask'
], function (
    LongTask
) {
    'use strict';
    var UnknownLengthTask = LongTask.extend({});

    return UnknownLengthTask;
});
