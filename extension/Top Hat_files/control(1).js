define([
    'views/ModuleControl'
], function (ModuleControlView) {
    'use strict';
    var DiscussionControlView = ModuleControlView.extend({
        initialize: function () {
            DiscussionControlView.__super__.initialize.apply(this);
            this.model.on("change:allow_new_topics", this.render_new_topic_button, this);
            this.render_new_topic_button();
            //this.status_changed();
        },

        render_new_topic_button: function () {
            if (window.user.get('role') === 'teacher') { return; }

            if (!this.model.get("allow_new_topics")) {
                this.panel.$('a.new_topic_button').remove();
                this.panel.$('.thm_panel_toolbar').removeClass('toolbar_active');
            } else {
                var new_topic_button = $('<a href="#" class="btn btn-primary sLarge new_topic_button">Ask a Question</a>');

                new_topic_button.bind('click', function (e) {
                    e.preventDefault();
                    this.model.add_item();
                    // track student discussion clicks
                    var event_name = "creates discussion topic";
                    Daedalus.track(event_name);
                    Daedalus.increment("numDiscussionsCreated");
                }.bind(this));

                this.panel.$('.thm_panel_toolbar').addClass('toolbar_active').append(new_topic_button);
            }
        }
    });

    return DiscussionControlView;
});
