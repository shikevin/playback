/*globals define, _*/
define([
    'views/ModuleControl',
    'text!templates/beta_header.html',
    'text!templates/beta_message.html'
], function (ModuleControlView, beta_header, beta_message) {
    'use strict';
    var FilesControlView = ModuleControlView.extend({
        initialize: function () {
            ModuleControlView.prototype.initialize.apply(this);
            var header = this.panel.get('view').$('.thm_panel_header span');
            this.beta = $(beta_header);
            header.append(this.beta);
            _.delay(this.make_qtip.bind(this), 0);
        },
        make_qtip: function () {
            this.beta.qtip({
                content: $(beta_message),
                style: {
                    classes: 'tooltip-light beta-qtip',
                    tip: {
                        height: 10,
                        width: 20
                    }
                },
                show: {
                    ready: false,
                    event: 'click'
                },
                hide: {
                    event: 'unfocus'
                },
                position: {
                    my: 'left center',
                    at: 'right center',
                    adjust: {
                        x: 14
                    }
                }
            });
            this.beta.on('click', function (e) {
                // prevent this from collapsing the header
                e.stopPropagation();
            });
        }
    });

    return FilesControlView;
});
