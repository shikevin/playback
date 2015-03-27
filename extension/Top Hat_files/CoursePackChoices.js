/* global Backbone, Daedalus, panels */
define([
    'models/course/CoursePack',
    'models/course/CoursePackList',
    'views/course/CoursePackList',
    'views/course/CoursePackEdit',
    'views/course/CoursePackCreate',
    'views/course/CoursePackImport',
    'layouts/edumacation/LayoutCollection'
], function (
    CoursePack,
    CoursePackListModel,
    CoursePackListView,
    CoursePackEditView,
    CoursePackCreateView,
    CoursePackImportView,
    layouts
) {
    'use strict';

    var CoursePackChoicesView = Backbone.View.extend({
        initialize: function () {
            this.render();
        },
        render: function () {
            Daedalus.track('opened course packs');
            this.panel = panels.add({
                'id': 'course_pack',
                'module': 'course',
                'layout': layouts.get('dialog'),
                'title': 'Course Packs',
                'body': '<h1 class=\'icon\'>Course Packs</h1><p>Share your content with peers, or jump start your course with premade resources.</p><div class=\'choices\'></div>',
                'footer_buttons': { 'Cancel': 'remove' }
            });
            this.panel.$b('.choices').composer([
                {
                    'id': 'help',
                    'type': 'html',
                    'value': '<p>What would you like to do?</p>'
                },
                {
                    'id': 'import',
                    'type': 'button',
                    'value': 'Load a course pack',
                    'change': $.proxy(function () {
                        this.import_pack();
                    }, this)
                },
                {
                    'id': 'create',
                    'type': 'button',
                    'value': 'Create a new course pack',
                    'change': $.proxy(function () {
                        this.create();
                    }, this)
                },
                {
                    'id': 'edit',
                    'type': 'button',
                    'value': 'Edit an existing course pack',
                    'change': $.proxy(function () {
                        this.edit();
                    }, this)
                }
            ]);
        },
        edit: function () {
            var QuestionDetailsView = require('views/question/details');
            var DemoDetailsView = require('views/demo/details');
            var DiscussionView = require('views/discussion/discussion');
            // TODO Daedalus
            this.panel.remove();
            var cpl = new CoursePackListModel();
            var cplv = new CoursePackListView({
                    'model': cpl,
                    'only_show_owned': true
                });
            cpl.load();
            cpl.bind('click', function (id) {
                cplv.panel.remove();
                var cp = new CoursePack({ 'id': id });
                new CoursePackEditView({ 'model': cp });
                // TODO: This is suuuuper wet
                cp.bind('click', function (item) {
                    // ARGH: this is ugly as crap
                    var module_item;
                    if (/^key__question/.test(item.id)) {
                        var QuestionItem = require('models/question/question');
                        module_item = new QuestionItem({ id: item.id });
                    } else if (/^key__demo/.test(item.id)) {
                        var DemoItem = require('models/question/question');
                        module_item = new DemoItem({ id: item.id });
                    } else {
                        return;
                    }
                    var details_view;
                    if (module_item.get('module') === 'demo') {
                        details_view = new DemoDetailsView({ model: this });
                    } else if (module_item.get('module') === 'question') {
                        details_view = new QuestionDetailsView({ model: this });
                    } else if (module_item.get('module') === 'discussion') {
                        details_view = new DiscussionView({ model: this });
                    } else {
                        return;
                    }
                    var panel = panels.add({
                            'id': 'course_pack_preview',
                            'title': 'Preview',
                            'width': 480,
                            'layout': layouts.get('dialog'),
                            'footer_buttons': { 'Close': 'remove' }
                        });
                    module_item.get_required_attributes(function () {
                        panel.set({ title: module_item.get('title') });
                        panel.$b().html(details_view.render().el);
                    });
                });
                cp.load_categories();
                cp.load();
            });
        },
        create: function () {
            var QuestionDetailsView = require('views/question/details');
            var DemoDetailsView = require('views/demo/details');
            var DiscussionView = require('views/discussion/discussion');
            this.panel.remove();
            // TODO Daedalus
            var cp = new CoursePack();
            new CoursePackCreateView({ 'model': cp });
            cp.bind('click', function (item) {
                var module_item = require('Modules').get_module_item(item.id);
                var details_view;
                if (module_item.get('module') === 'demo') {
                    if (module_item.is_visible()) {
                        details_view = new Backbone.View();
                        details_view.render = function () {
                            this.$el.text('This demo is already visible. Visible demos cannot be previewed.');
                            return this;
                        };
                    } else {
                        details_view = new DemoDetailsView({ model: module_item });
                    }
                } else if (module_item.get('module') === 'question') {
                    details_view = new QuestionDetailsView({ model: module_item });
                } else if (module_item.get('module') === 'discussion') {
                    details_view = new DiscussionView({ model: module_item });
                } else {
                    return;
                }
                var panel = panels.add({
                        'id': 'course_pack_preview',
                        'title': 'Preview',
                        'width': 480,
                        'layout': layouts.get('dialog'),
                        'footer_buttons': { 'Close': 'remove' }
                    });
                module_item.get_required_attributes(function () {
                    panel.set({ title: module_item.get('title') });
                    panel.$b().html(details_view.render().el);
                });
            });
            cp.load_categories();
            cp.populate_from_course();
        },

        import_pack: function () {
            var QuestionDetailsView = require('views/question/details');
            var DemoDetailsView = require('views/demo/details');
            var DiscussionView = require('views/discussion/discussion');
            this.panel.remove();
            // TODO Daedalus
            var cpl = new CoursePackListModel();
            var cplv = new CoursePackListView({model: cpl});
            cpl.load();
            cpl.bind('click', function (id) {
                cplv.panel.remove();
                var cp = new CoursePack({id: id});
                var cpiv = new CoursePackImportView({model: cp});
                cp.load(function (error) {
                    if (error) {
                        cpiv.panel.remove();
                        _.defer(function () {
                            window.alert(error);
                        });
                        return;
                    }

                    cp.bind('click', this._course_pack_module_item_preview_click);
                }.bind(this));
            });
        },

        _course_pack_module_item_preview_click: function (item, module_id) {
           var ModuleItemClass = require('Modules').get_module(module_id).get('model');
           var module_item = new ModuleItemClass({ 'id': item.id });
           var details_view;
           if (module_id === 'demo') {
               details_view = new DemoDetailsView({ model: module_item });
           } else if (module_id === 'question') {
               module_item.set({ id: module_item.get_id() });
               details_view = new QuestionDetailsView({ model: module_item });
           } else if (module_id === 'discussion') {
               module_item.set({ id: module_item.get_id() });
               details_view = new DiscussionView({ model: module_item });
           } else {
               return;
           }
           var panel = panels.add({
                   id: 'course_pack_preview',
                   width: 480,
                   layout: layouts.get('dialog'),
                   footer_buttons: {Close: 'remove'},
                   title: this.get('title')
               });
           module_item.get_required_attributes(function () {
               panel.set({ title: module_item.get('title') });
               panel.$b().html(details_view.render().el);
           });
        }
    });

    return CoursePackChoicesView;
});
