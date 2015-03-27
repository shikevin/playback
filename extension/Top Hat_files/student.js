/* global _, panels, publisher */
define([
    'views/ModuleItemContent',
    'models/feedback/response',
    'text!templates/feedback/student.html',
    'layouts/edumacation/LayoutCollection'
], function (
    ModuleItemContentView,
    FeedbackResponse,
    template,
    layouts
) {
    'use strict';

    var StudentFeedbackView = ModuleItemContentView.extend({
        tagName: 'li',
        className: 'feedback_item',
        panel_id: 'student_feedback',
        panel_template: '<p>Click the buttons below to submit feedback to your instructor</p><ul id="feedback_items" class="magnify_scale_font"></ul>',
        events: {
            'click .feedback_button': 'submit_feedback'
        },
        initialize: function () {
            this.listenTo(this.model, 'change', this.render);
        },
        render: function () {
            function format_timer(seconds_remaining) {
                var mins = Math.floor( seconds_remaining / 60 );
                var secs = '' + seconds_remaining % 60;
                if (secs.length === 1) { secs = '0' + secs; }
                return mins + ':' + secs;
            }
            var seconds_until_active = this.model.get('seconds_until_active');
            var time_until_active =  format_timer(seconds_until_active);

            var html = _.template(template, {
                title: this.model.get('title'),
                id: this.model.get('id'),
                active: this.model.get('submitted') ? true : false,
                status: this.model.get('submitted') ? 'Active in: ' + time_until_active: 'Submit',
                time_until_active: time_until_active
            });
            $(this.el).html(html);
            $(this.el).attr({ id: this.model.get('id') });
            return this;
        },
        submit_feedback: function (e) {
            e.preventDefault();
            var bt = $(e.target);

            //ensure that the button has not already been pressed
            if( bt.hasClass('active') ) { return; }

            bt.text('Submitting...');

            //send feedback press to server
            var response = new FeedbackResponse({id: this.model.get('id')});
            response.save().done(function () {
                this.model.set({submitted: true});
                this.model.set({seconds_until_active: this.model.get('duration') * 60}); //reset how many seconds must pass until active
            }.bind(this))
            .fail(function () {
                publisher.footer_message('A problem has occurred! Your response has not been recorded.', 'red');
                this.model.set({submitted: false});
                bt.text('Submit');
            }.bind(this));
        },
        opened: function () {
            var panel = this.get_shared_panel();
            this.panel = panel;
            this.render();

            //add feedback item's el to the panel
            if( !$(panel.get('view').el).find('.feedback_item#' + this.model.get('id')).length ) {
                $(panel.get('view').el).find('#feedback_items').append(this.el);
            }

            // GET data from server
            this.model.fetch();
        },
        closed: function () {
            var panel = panels.get(this.panel_id);
            if (!panel) {
                // there is nothing to close
                return;
            }
            //remove feedback item
            this.remove();
            this.model.unset('view');

            //remove centralized panel, if required
            if( $(panel.get('view').el).find('.feedback_item').length === 0 ) {
                panel.remove();
            }
        },
        get_shared_panel: function() {
            if( !panels.get(this.panel_id) ) {
                panels.add({
                    id: this.panel_id,
                    layout: layouts.get('content'),
                    module: 'feedback',
                    title: 'Feedback',
                    minimize: true,
                    body: this.panel_template,
                    footer_buttons: {},
                    color: 'green'
                });

            }
            return panels.get(this.panel_id);
        }
    });

    return StudentFeedbackView;
});
