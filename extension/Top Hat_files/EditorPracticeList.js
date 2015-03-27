define([], function (){
    var TournamentEditorPracticeListView = Backbone.View.extend({
        /*
         * Shows a list of all practice sessions in the tournament, with a button to
         * add a new practice session. Each practice session has a dropdown that lets the user
         * rename, delete, or select new questions for it
         *
         * Events:
         * - add_practice -> (title): called when the a new practice session with 'title' has been created
         * - delete_practice -> (id, title): called when the delete button is clicked on a practice session
         * - rename_practice -> (id, title): called when a practice session's rename button is pressed
         * - select_questions -> (id, title): called when the question selection button is pressed
         */
        initialize: function() {
            this.render();
            this.model.bind("change:practice_sessions", this.render, this);
        },
        render: function() {
            var html = '<div class="forms" id="practice"></div>';

            $(this.el).html( html );

            //set up schedules form
            // var values = _.map( this.model.get("practice_sessions"), function(item) { return item.display_name; });

            this.form = $(this.el).find("#practice").composer({
                "id": "practice",
                "type": "set",
                "sortable": false,
                "set_add_text": "Add practice session",
                "structure": function(set_item) {
                    var num_items = set_item.value().questions || 0;

                    //set up element
                    var html = "<input placeholder='Session name' type='text' />" +
                "<a href='#' class='cButton questions'>" + num_items + " Items</a>" +
                set_item.generateDeleteButton();
                    $(set_item.el).html(html);

                    //bind item selection button
                    $(set_item.el).find("a.questions").click(function(e) {
                        var value = set_item.value();
                        if( !value ) {
                            return false;
                        }
                        this.trigger("select_questions", value.id, value.display_name);
                    }.bind(this));

                    //bind practice name change
                    $(set_item.el).find("input").val( set_item.value().display_name ).change(function(e) {
                        var title = $(e.currentTarget).val();
                        if( !title ) {
                            return false;
                        }


                        var value = set_item.value();
                        if( !value ) {
                            this.trigger("add_practice", title);
                        } else {
                            value.display_name = title;
                            set_item.value( value );
                            this.trigger("rename_practice", value.id, value.display_name);
                        }
                    }.bind(this));
                }.bind(this),
                "delete": function(index, value) {
                    if( value ) {
                        this.trigger("delete_practice", value.id, value.display_name);
                    }
                }.bind(this),
                "value": this.model.get("practice_sessions")
            });
        }
    });
    return TournamentEditorPracticeListView;
});