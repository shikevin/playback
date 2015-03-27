define([], function () {
    var TournamentScheduleView = Backbone.View.extend({
        /*
         * renders list of scheduled times for a tournament, with form to create new schedules
         *
         * Methods
         * - contains_past_schedules(): returns true/false if the form has historical times
         * - get_schedules(): returns a list of schedule timestamps
         */
        initialize: function() {
            this.render();
        },
        get_schedules: function() {
            return this.form.get("schedules").value();
        },
        contains_past_schedules: function() {
            var now_time = (new Date()).getTime() / 1000;
            return _.detect( this.get_schedules(), function(timestamp) { return timestamp < now_time; }) ? true : false;
        },
        render: function() {
            var html = '<div class="forms" id="schedules"></div>';

            $(this.el).html( html );

            //set up schedules form
            this.form = $(this.el).find("#schedules").composer({
                "id": "schedules",
                "type": "set",
                "set_add_text": "Add schedule",
                "sortable": false,
                "structure": function(set_item) {

                    //set up value to show to user
                    if( set_item.value() ) {
                        var pretty_date_str = new Date( set_item.value() * 1000 ).strftime("%b %d %Y %I:%M %p"); // must be in milliseconds
                    } else {
                        var pretty_date_str = "Click to set a date";
                    }

                    //set up element
                    $(set_item.el).html("<b>Date:</b><input type='text' /><a href='#' class='cButton clear'>Delete</a>");

                    //bind datepicker
                    $(set_item.el).find("input")
                        .val( pretty_date_str )
                        .datetimepicker({
                            onClose: function(dateTxt, inst) {
                                var new_time = Math.round($(this).datepicker("getDate").getTime() / 1000);
                                set_item.value( new_time );
                            },
                            beforeShow: function() {
                                var dateVal = set_item.value() ? new Date( set_item.value() * 1000 ) : new Date();
                                $(set_item.el).find("input").datepicker("setDate", dateVal);
                            }
                        });
                    $(set_item.el).find('a.clear').on('click', function (e) {
                        e.preventDefault();
                        set_item.value('');
                    });
                },
                "value": ['']
            });
        }
    });
    return TournamentScheduleView;
});
