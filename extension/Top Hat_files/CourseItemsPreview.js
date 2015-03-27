/* global _, Backbone */
define([
    'views/course/CourseItems',
    'models/course/CourseItemQuestionPreview'
], function (
    CourseItemsView,
    CourseItemQuestionPreview
) {
    'use strict';
    var CourseItemsPreviewView = CourseItemsView.extend({
        className: 'course_items_preview',
        template: _.template('<div class=\'items_view\'><div class=\'item_selector\'><% _.each(modules, function(m) { %><div id=\'<%= cid %>_<%= m.id %>\'></div><% }); %></div>' +
                             '<div class=\'items_preview\'></div></div>'),
        initialize: function () {
            /**
            * Shows a list of all the questions on the left hand side, and a list previewing the selected
            * questions on the right hand side. The previewed items are instances of CourseItemQuestionPreview
            * @class CourseItemQuestionPreview
            * @extends CourseItemsView
            * @constructor
            */
            CourseItemsView.prototype.initialize.call(this);
            this.previews = new Backbone.Collection();
            this.model.bind('change:selected_ids', function () {
                var selected_ids = this.model.get('selected_ids');
                var el = $(this.el).find('.items_preview');
                el.html('');
                _.each(selected_ids, function (id) {
                    var preview = this.get_or_create_preview(id);
                    el.append(preview.get('view').el);
                    preview.get('view').bind_click();
                }, this);
            }, this);
        },
        get_or_create_preview: function (id) {
            var preview = this.previews.get(id);
            if (preview) {
                return preview;
            } else {
                preview = new CourseItemQuestionPreview({ id: id });
                var QuestionItem = require('models/question/question');
                var item = new QuestionItem({ id: id });
                item.get_required_attributes(function () {
                    preview.set({
                        title: item.get('title'),
                        text: item.get('question')
                    });
                });
                this.previews.add(preview);
                return preview;
            }
        }
    });

    return CourseItemsPreviewView;
});
