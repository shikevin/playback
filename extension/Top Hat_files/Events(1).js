define([
    'views/tournament/Event'
], function (TournamentEventView) {
    var TournamentEventsView = Backbone.View.extend({
        /*
         * Shows an itemized list of events that have happened in the Tournament.
         *
         */
        className: "tournament_list",
        tagName: "li",
        preview_el: $("<span/>"),
        initialize: function() {
            //stores a cached list of views; useful to prevent re-rendering
            this.event_views = {};

            //a queue of events that have been added but not rendered
            this.event_queue = [];
            this.queue_running = false;

            this.render();
            this.model.bind("add", this.queue_event, this);
        },
        render: function() {
            $(this.el).html("<div class='events'></div>");
            if(window.user.get('role') != 'teacher') {
                this.$('.events').addClass('thin');
            }
            if (this.model.length === 0) {
                this.$('.events').prepend($('<p class="nothing_happened">No events have happened yet.</p>'));
            } else {
                this.$('.events').find('p.nothing_happened').remove();
                this.model.each(function(event) {
                    this.render_event(event);
                }, this);
            }
        },
        render_event: function(event) {
            var view = this.get_or_create_event_view( event );
            this.$(".events").prepend( view.el );

            //animate showing the new evenet
            $(view.el).hide();
            $(view.el).show(100);

            //render preview_el
            $(this.preview_el).html(view.render_preview_el() );
        },
        get_or_create_event_view: function(event) {
            var view = this.event_views[ event.id ];
            if( !view ) {
                view = new TournamentEventView({"model": event});
                this.event_views[ event.id ] = view;
            }
            return view;
        },
        queue_event: function(event) {
            this.event_queue.push(event);
            this.render_from_queue();
        },
        render_from_queue: function() {
            if( this.queue_running || !this.event_queue.length ) {
                return false;
            } else {
                this.queue_running = true;
            }

            var event = this.event_queue.splice(0,1)[0];
            this.render_event(event);

            var random_time = Math.floor(Math.random() * 1000);
            setTimeout($.proxy(function() {
                this.queue_running = false;
                this.render_from_queue();
            }, this), random_time);
        }
    });
    return TournamentEventsView;
});