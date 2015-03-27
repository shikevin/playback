define([
], function (
) {
    'use strict';
    var Browser = {
        is_mac: function () {
            return this.is_web() && navigator.appVersion.indexOf('Mac') !== -1;
        },
        is_web: function () {
            return !(window.is_mobile || window.is_presentation_tool);
        },
        is_mobile: function () {
            return window.is_mobile && !window.is_presentation_tool;
        },
        is_presentation_tool: function () {
            return window.is_presentation_tool;
        }
    };

    return Browser;
});
