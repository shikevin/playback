define([
    'models/UnknownLengthTask',
    'views/LongTask'
], function (
    UnknownLengthTask,
    LongTaskView
) {
    'use strict';
    var UnknownLengthTaskView = LongTaskView.extend({
        model: UnknownLengthTask,
        render: function () {
            var $el = $(this.el);
            var template = '<div class=\'longtask unknown_length_task container\'>' +
                           '<div class=\'task_progress\'>' +
                           '<div class=\'task_spinner\'></div>' +
                           '</div>' +
                           '<div class=\'task_result\'>' +
                           '<span class=\'left\'></span>' +
                           '<span class=\'right\'></span>' +
                           '</div></div>';
            $el.html(template);
        }
    });
    return UnknownLengthTaskView;
});
