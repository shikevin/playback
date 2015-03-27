/* globals Backbone, markdown */
define([
    'mathjax',
    'models/question/question',
    'models/discussion/discussion',
    'models/Demo',
    'models/File',
    'views/question/Embed',
    '../../../../bower_components/google-code-prettify/src/prettify'
], function (mathjax, QuestionItem, DiscussionItem, DemoItem, FileItem, EmbedQuestionView, prettify) {
    'use strict';
    var SubPageView = Backbone.View.extend({
        className: 'subpage',
        render: function () {
            var editor = this.model.get('page').get('editor');
            var preview;
            if (editor) {
                preview = this.model.get('content');
            } else {
                preview = markdown.toHTML(this.model.get('content'));
            }
            this.$el.html(preview);
            this.$('div[data-module]').each(function (i, el) {
                var $el = $(el);
                var pk, item, details_view, module_id;
                pk = $el.data('pk');
                module_id = $el.data('module');
                if (module_id === 'question') {
                    item = new QuestionItem({id: pk});
                } else if(module_id === 'demo') {
                    var demo_pk = editor ? pk : 'key__demo_demo__' + pk;
                    item = new DemoItem({id: demo_pk});
                } else if(module_id === 'discussion') {
                    item = new DiscussionItem({id: pk});
                } else if(module_id === 'files') {
                    item = new FileItem({id: pk});
                } else if(module_id === 'schoolyourself') {
                    $el.html('<iframe frameborder="0" width="1024" height="768" src="https://s3.amazonaws.com/thm-schoolyourself/'+pk+'/index.html"></iframe>');
                    return;
                } else {
                    return;
                }

                details_view = new EmbedQuestionView({model: item});

                details_view.setElement(el);
                this.listenTo(details_view, 'answered', function (answer) {
                    var target = details_view.$('.submitted_answer'),
                        put = $.ajax({
                            type: 'PUT',
                            url: '/api/v2/pages_answers/' + pk + '/',
                            data: JSON.stringify({
                                response: answer,
                                page: this.model.get('page').get_id()
                            }),
                            contentType: 'application/json'
                        });
                    put.done(function (data) {
                        if (data.correct) {
                            target.text('Correct!');
                        } else {
                            target.text('Sorry, that is not correct.');
                        }
                    });
                    put.fail(function () {
                        target.text('There was a problem submitting your answer. Please try again.');
                    });
                }, this);

                item.get_required_attributes(function () {
                    details_view.render();
                    mathjax.execute_mathjax(this.el);
                    details_view.$('.magnify_resize_height').removeClass('magnify_resize_height');
                }.bind(this));
            }.bind(this));
            this.$('div[media-url]').each(function (i,el) {
                var $el = $(el);
                var html = $('<iframe width="560" height="315" frameborder="0" allowfullscreen></iframe>');
                html.attr('src', $el.attr('media-url'));
                $el.append(html);
            });
            // Tech Debt: Some formatting will persist after prettification, but some will not.
            // The following will persist: bold, italics, underline, link(not obvious when active),
            //                             font size, superscript/subscript, indentation, unordered and ordered list
            // The following will not:     color, alignment
            this.$('pre.tophat_codeblock').each(function (i,el){
                var $el = $(el);
                // Using the google-code-prettify library, this formats the content from the editor after escaping it.
                // We pass in the content, language, and whether we want line numbers.
                var html = prettify.prettyPrintOne($el.html(), $el.data('pbcklang'), true);
                $el.html(html);
            });
            mathjax.execute_mathjax(this.el);
        }
    });
    return SubPageView;
});