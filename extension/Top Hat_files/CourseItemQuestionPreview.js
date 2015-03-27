/* global Backbone */
define([
    'views/course/CourseItemQuestionPreview'
], function (
    CourseItemQuestionPreviewView
) {
    'use strict';
    var CourseItemQuestionPreview = Backbone.Model.extend({
        defaults: {
            preview: false
        },
        initialize: function () {
            // TODO: Remove reference to view
            this.set({
                view: new CourseItemQuestionPreviewView({
                    model: this
                })
            });
        }
    });

    return CourseItemQuestionPreview;
});
