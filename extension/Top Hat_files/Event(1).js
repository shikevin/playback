define([], function () {
    var TournamentEventView = Backbone.View.extend({
        /*
         * Depicts an event in the tournament (round start, victory / defeat,
         * round end, etc.). Shown in a list on prof status view, and student
         * round summary view.
         *
         */
        className: "event",
        tagName: "li",
        initialize: function() {
            this.render();
            $(this.el).addClass( this.model.get("type") );
        },
        render: function() {
            var html = _.template("<span class='icon event-<%= type %>'></span><span class='description'><%= description %></span>", {
                "type": this.model.get("type"),
                "description": this.get_formatted_message()
            });
            $(this.el).html( html );
        },
        get_formatted_message: function() {
            var msg = this.model.get("message");
            return msg.replace(/\*\*([^\*]+)\*\*/g, "<b>$1</b>"); //replace **a value** with <b>a value</b>
        },
        render_preview_el: function() {
            return this.get_formatted_message();
        }
    });
    return TournamentEventView;
});