/* globals _ */
define([], function () {
    'use strict';
    var Accessibility = {
        /**
         * Accessibility Alert for Screen Readers
         *
         *@param {string} msg The message to read
         *@param {string} [politeness] Politeness level for ARIA-live (assertive/polite) default assertive
         *@param {string} [role] ARIA-role (alert or status) default alert
        */
        SR_alert: function(msg, politeness, role){
            var notif = $('#notif');
            var notif_container = $('#notif_container');
            if (_.isUndefined(politeness)) {
                politeness = 'assertive';
            }
            if (_.isUndefined(role)) {
                role = 'alert';
            }
            notif_container.attr('aria-live', politeness);
            notif_container.attr('role', role);
            notif.empty();
            if (!notif) {
                // notifications area is not present on some web platforms (mobweb/PT)
                return;
            }
            notif.text(msg);
            notif.css('visibility', 'hidden');
            notif.css('visibility', 'visible');

            // Need to remove text node from notif div as SR could navigate to it and reread old alerts
            // Cannot remove immediately after adding as it is not enough time to trigger accessibility alert
            // TODO: Figure out a way to accomplish this without timed events
            setTimeout(function(){
                notif.empty();
            }, 2000);
        },
        // Remove focus highlight for mouse users
        remove_mousedown_focus_outline: function () {
            $('body').on('mousedown', '*:not(input, textarea)', function(e) {
                var $this = $(this);
                if ($this.is(':focus') || $this.is(e.target)) {
                    $this.css('outline', 'none').on('blur', function() {
                        $this.off('blur').css('outline', '');
                    });
                }
            });
        }
    };

    return Accessibility;
});
