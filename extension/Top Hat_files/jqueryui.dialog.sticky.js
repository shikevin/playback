// This code block extends the uiDialog widget by adding a new boolean
//option 'sticky' which,
// by default, is set to false. When set to true on a dialog instance,
//it will keep the dialog's
// position 'anchored' regardless of window scrolling.
// Start of uiDialog widget extension...
var _init = $.ui.dialog.prototype._init;
$.ui.dialog.prototype._init = function() {
    'use strict';
    var self = this;
    _init.apply(this, arguments);

    this.uiDialog.bind('dragstop', function(event, ui) {
        if (self.options.sticky) {
            var left = Math.floor(ui.position.left) - $(window).scrollLeft();
            var top = Math.floor(ui.position.top) - $(window).scrollTop();
            self.options.position = [left, top];
        }
    });
};
