define([
    'views/ModuleItemContent',
    'views/tournament/Panel',
    'views/tournament/Lobby'
], function (ModuleItemContentView, TournamentPanelView, TournamentLobbyView) {
    "use strict";
    var TournamentContentView = ModuleItemContentView.extend({
        initialize: function() {
            ModuleItemContentView.prototype.initialize.apply(this);
        },
        render: function() {
            this.model.fetch().done(function() {
                var view;
                if (this.model.get('status') === 'active_visible') {
                    // tournament has begun
                    //set up the master tournament view
                    view = new TournamentPanelView({
                        model: this.model,
                        panel: this.panel
                    });
                    //this.panel.$b().html(view.render().el);
                } else if (this.panel) {
                    // Initialize the new lobby view
                    view = new TournamentLobbyView({ model: this.model });
                    this.panel.$b().html(view.render().el);
                    this.panel.set({
                        footer_buttons: {
                            "Close": function() {
                                this.model.trigger('closed');
                            }.bind(this)
                        }
                    });
                }
            }.bind(this));
        }
    });
    return TournamentContentView;
});
