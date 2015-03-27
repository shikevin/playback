(function ($) {
    'use strict';
    window.dragCheckboxMouseDown = false;

    $.fn.dragCheckbox = function () {
        $(this).find('input').on('mousedown', function () {
            var status = $(this).is(':checked');
            window.dragCheckboxMouseDown = true;
            window.dragCheckboxChecked = !status;
        });

        $('body').bind('mouseup', function () {
            window.dragCheckboxMouseDown = false;
        });

        $(this).find('input').on('mouseout mouseenter', function () {
            if (window.dragCheckboxMouseDown) {
                if ($(this).is(':checked') !== window.dragCheckboxChecked) {
                    $(this).click();
                }
            }
        });
    };
}(jQuery));
