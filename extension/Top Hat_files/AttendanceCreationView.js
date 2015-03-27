/* global Backbone, _, Magnify */
define([
    'text!templates/mobile/attendance_view.html',
    'reporting'
], function (
    html,
    reporting
) {
    'use strict';
    var AttendanceCreationView = Backbone.View.extend({
        tagName: 'div',
        id: 'content',
        events: {
            'click .stop-attendance': 'stop_attendance'
        },

        // TODO: Add any initialization code in here that might be needed to set up the auto-updating
        initialize: function () {
            this.on('redo_magnify', this.maximize_text, this);
            $(window).bind('resize_delayed', this.maximize_text.bind(this));

            this.module = require('Modules').get_module('attendance');

            this.report =  reporting.Reports.request(this.model.get('id'), 'attendance_percentage');
            this.listenTo(this.module, 'change:current_data', this.render);
            this.render();
        },

        // TODO: Populate the fields in the "data" object with their appropriate values.  This will also
        //       need to pull from the Reporting API to detect how many students (percentage) have submitted.
        render: function () {
            var data = {
                sms_code: this.model.get('sms_code'),
                phone_number: window.org_data.sms_phone_number,
                attendance_code: this.model.get('code'),
                percent_online: this.module.current_percentage() + '%'
            };

            this.$el.html(_.template(html, data));
            _.defer(this.maximize_text.bind(this));

            this.hide_header();
        },

        // TODO: This event is fired when a user clicks the "Close" X in the attendance view.  Hook it up to the
        //       backend to actually remove/close the attendance items.
        stop_attendance: function (event) {
            event.preventDefault();
            this.model.save_status('inactive');
            require('quickadd/QuickAdd').minimize_attendance();
            this.show_header();
        },

        resize_window: function () {
            var sizes = this.$('.controls').add(this.$('.quickadd_val:visible')).map(function () {
                return $(this).outerWidth();
            });
            if (sizes.length) {
                var size = _.reduce(sizes, function (i, n) {
                    return i + n;
                });
                /*size += 25; // The +25 here is a total hack to get around windows scroll bar bugs*/
                require('lobby/PresentationTool').resize_pt(size, 80, false, true);
            }
        },
        maximize_text: function () {
            // magnify quickadd elements
            var $el = this.$('#quickadd_container');
            Magnify.reset($el);
            Magnify.magnify($el, $el.height(), $el.width());
        },

        hide_header: function () {
            $('.page.visible').css('top', '0px');
            $('#pt_header').hide();
        },

        show_header: function () {
            $('.page.visible').css('top', '31px');
            $('#pt_header').show();
        }
    });
    return AttendanceCreationView;
});
