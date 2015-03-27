/* global Backbone */
define([
], function (
) {
    'use strict';
    var CoursePackListModel = Backbone.Model.extend({
        defaults: {
            category: 'All',
            only_owned: false,
            course_packs: []
        },
        load: function () {
            window.publisher.send({
                module: 'course',
                command: 'get_course_packs',
                success: $.proxy(function (data, args) {
                    // Sort course packs in alphabetical order
                    var packs = args.course_packs.sort(function (a, b) {
                            a = a.title.toLowerCase();
                            b = b.title.toLowerCase();
                            return a.localeCompare(b);
                        });
                    this.set({course_packs: packs});
                }, this)
            });
        }
    });

    return CoursePackListModel;
});
