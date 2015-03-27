/* global Backbone, _ */
define([
    'views/question/details',
    'views/discussion/discussion',
    'views/demo/details',
    'views/files/content',
    'text!templates/question/embed.html'
], function (QuestionDetailsView, DiscussionView, DemoDetailsView, FilesView, html) {
    'use strict';
    var EmbedQuestionView = Backbone.Marionette.ItemView.extend({
        className: 'embed_question',
        template: _.template(html),
        events: {
            'click .submit': 'submit'
        },
        subview_classes: {
            'question': QuestionDetailsView,
            'discussion': DiscussionView,
            'demo': DemoDetailsView,
            'files': FilesView
        },
        initialize: function () {
            var module_id = this.model.get('module');
            var ViewClass = this.subview_classes[module_id];
            this.subview = new ViewClass({model: this.model});
            this.model.set({view: this.subview});
        },
        submit: function (e) {
            e.preventDefault();
            var answer = this.model.get_student_answer(this.$('.question_content'));
            this.trigger('answered', answer);
        },
        onRender: function () {
            if (this.subview) {
                this.subview.setElement(this.$('.details_target'));
                this.subview.render();
            }
            this.$('.not_enabled_instruc').hide();
            if (window.user.get('role') === 'student' && this.model.get('module') === 'question') {
                this.$('.buttons').show();
            }
        }
    });
    return EmbedQuestionView;
});
