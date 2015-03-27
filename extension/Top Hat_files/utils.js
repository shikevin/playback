define([], function () {
    'use strict';
    var truncate_name = function (course_name) {
        if (!course_name) {
            return '';
        }
        var MAX_LEN = 60;
        var truncated_name = course_name;
        if (course_name.length > MAX_LEN) {
            truncated_name = $.trim(course_name.slice(0, MAX_LEN)) + '\u2026';
        }
        return truncated_name;
    };
    return {truncate_name: truncate_name};
});
