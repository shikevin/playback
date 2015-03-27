/* global Backbone, panels, Daedalus */
define([
    'views/course/CourseItems',
    'models/LongTask',
    'views/LongTask',
    'layouts/edumacation/LayoutCollection',
    'text!templates/course/course_pack_import.html'
], function (
    CourseItemsView,
    LongTask,
    LongTaskView,
    layouts,
    CoursePackImportTemplate
) {
    'use strict';
    var CoursePackImportView = Backbone.View.extend({
        initialize: function () {
            this.render();
            this.model.get('trees').bind('add', this.render, this);
            this.model.get('trees').bind('remove', this.render, this);
            this.model.get('trees').bind('reset', this.render, this);
            this.model.bind('invalid_password', this.render_password_form, this);
        },
        el: 'body',
        events: {
            'click input[type=checkbox]#import_profiles': 'import_profiles'
        },
        render: function () {
            this.panel = this.panel || panels.add({
                'id': 'course_pack',
                'title': 'Course Pack',
                'layout': layouts.get('dialog'),
                'body': '<div class=\'course_pack\'></div>',
                'width': 350
            });

            // Render items
            this.panel.$b().html(_.template(CoursePackImportTemplate));

            // Create a course pack items view
            this.item_selector = this.item_selector || new CourseItemsView({
                model: this.model,
                sortable: true
            });
            this.panel.$b('div.items').html(this.item_selector.el);
            this.item_selector.render();

            // Render footer buttons
            this.panel.set({
                'footer_buttons': {
                    'Cancel': 'remove',
                    'Import': $.proxy(function () {
                        if (!this.model.get('selected_ids').length) {
                            this.render_error('Please select one or more items');
                        } else {
                            var properties = {
                                    moduleItemId: this.model.get('id'),
                                    category: this.model.get('category'),
                                    title: this.model.get('title')
                                };
                            Daedalus.track('loaded course pack', properties);
                            Daedalus.increment('numCoursePacksLoaded');
                            var panel = this.panel;
                            panel.set({ 'footer_buttons': { 'Cancel': 'remove' } });
                            panel.loading();
                            this.model.import_pack(function (data, args) {
                                var import_task = new LongTask({ id: args.task });
                                var import_task_view = new LongTaskView({
                                        model: import_task,
                                        el: panel.get('view').$('.thm_panel_body')
                                    });
                                panel.set({ title: 'Importing Course Pack...' });
                                import_task.fetch();
                                // in case it already finished
                                import_task_view.render();
                                import_task.on('change:complete', function () {
                                    if (import_task.get('complete') === 1) {
                                        panel.set({
                                            footer_buttons: { Close: 'remove' },
                                            title: 'Course Pack import complete'
                                        });
                                    }
                                });
                            });
                        }
                    }, this)
                }
            });
        },
        import_profiles: function() {
            var import_profiles = $('#import_profiles').prop('checked');
            this.model.set({
                'import_profiles': import_profiles
            });
        },
        render_error: function (msg) {
            var error_el = this.panel.$b('p.error');
            if (!error_el.length) {
                error_el = $('<p></p>').addClass('error');
                this.panel.$b().prepend(error_el);
            }
            error_el.html(msg);
        },
        render_password_form: function () {
            var form;
            this.panel.set({
                footer_buttons: {
                    Cancel: 'remove',
                    Ok: function () {
                        this.model.set({
                            password: form.get('password').value()
                        });
                        this.model.load();
                    }.bind(this)
                }
            });
            form = this.panel.$b().html('').composer([{
                    id: 'password',
                    type: 'password',
                    label: 'Password'
                }]);
        }
    });

    return CoursePackImportView;
});
