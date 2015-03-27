/* global _, Backbone */
define([
], function (
) {
    'use strict';
    var CourseItemQuestionPreviewView = Backbone.View.extend({
        className: 'preview_item',
        initialize: function () {
            /**
            * Creates a view that shows a preview of a question's title and descirptive text
            * Clicking on the title will cause the preview to expand, and loads the question's
            * content in the expanded area
            * @class CourseItemQuestionPreviewView
            * @extends Backbone.View
            * @constructor
            */
            this.model.bind('change:title', this.render, this);
            this.model.bind('change:text', this.render, this);
            this.render();
        },
        toggle_preview: function () {
            var $el = $(this.el);
            this.model.set({
                preview: !this.model.get('preview')
            });
            $el.toggleClass('current');
            if (this.model.get('preview')) {
                var module_item = require('Modules').get_module_item(this.model.id);
                module_item.get_required_attributes_if_not_present([
                    'title',
                    'question'
                ], function () {
                    var QuestionDetailsView = require('views/question/details');
                    var details_view = new QuestionDetailsView({ model: module_item });
                    $el.find('.preview').html(details_view.render().el);
                }.bind(this));
            }
        },
        render: function () {
            if (this.model.get('title') && this.model.get('text')) {
                var template = _.template('<div class=\'overview\'><h2><%= title %></h2><p><%= text %></p></div><div class=\'preview\'></div>');
                $(this.el).html(template({
                    title: this.model.get('title'),
                    text: this.model.get('text')
                }));
                this.bind_click();
            } else {
                $(this.el).html($('#loading_template').html());
            }
        },
        bind_click: function () {
            $(this.el).unbind('click');
            $(this.el).bind('click', $.proxy(function () {
                this.toggle_preview();
            }, this));
        }
    });

    return CourseItemQuestionPreviewView;
});
