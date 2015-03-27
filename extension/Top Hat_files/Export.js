/* global Daedalus, panels, publisher, layouts, LongTask, LongTaskView */
define([
    'models/course/CourseItems',
    'layouts/edumacation/LayoutCollection',
    'models/LongTask',
    'views/LongTask',
    'util/Browser'
], function (
    CourseItems,
    layouts,
    LongTask,
    LongTaskView,
    Browser
) {
    'use strict';
    var create_export_view = function () {
        var export_to_excel_form_div = $('<div><div id="gradebook_export" style="max-width:500px; margin: auto"></div></div>');
        var export_to_excel_form = export_to_excel_form_div.find('#gradebook_export').composer();
        export_to_excel_form.addValidation('filter_not_empty', function (item_val) {
            if (export_to_excel_form.get('filter').value()) {
                return $.fn.composerValidation.not_empty(item_val);
            } else {
                return true;
            }
        });
        export_to_excel_form.add([
            {
                id: 'filter',
                type: 'checkbox',
                tooltip: 'Checking the filter will allow you to specify a list of student ids, usernames, or last names that you wish to filter by',
                label: 'Filter gradebook'
            }, {
                id: 'filter_type',
                type: 'select',
                label: 'Filter by:',
                options: {
                    student_ids: 'Student IDs',
                    username: 'Usernames',
                    last_names: 'Last Names'
                }
            }, {
                id: 'filter_list',
                type: 'textarea',
                label: 'Filter list',
                tooltip: 'Enter a list of values to filter by, one per line',
                validation: ['filter_not_empty']
            }, {
                id: 'show_answers',
                type: 'checkbox',
                tooltip: 'Checking this will allow you to export answers given for demos and questions',
                label: 'Include Answers'
            }, {
                id: 'show_attendance',
                type: 'checkbox',
                tooltip: 'Checking this will allow you to export attendance',
                label: 'Include Attendance'
            }, {
                id: 'item_filter',
                type: 'checkbox',
                tooltip: 'Checking this will allow you to specify which demos and questions to export',
                label: 'Select Items to Export'
            }, {
                id: 'generate',
                type: 'button',
                value: 'Generate Excel File'
            }
        ]);
        export_to_excel_form.get('filter_type').hide();
        export_to_excel_form.get('filter_list').hide();
        export_to_excel_form.get('filter').on('change', function (item) {
            if (item.value() === true) {
                export_to_excel_form.get('filter_type').show();
                export_to_excel_form.get('filter_list').show();
            } else if (item.value() === false) {
                export_to_excel_form.get('filter_type').hide();
                export_to_excel_form.get('filter_list').hide();
            }
        });
        if (!Browser.is_sandbox_app && !require('Modules').get_module('attendance').get('active')) {
            export_to_excel_form.get('show_attendance').hide();
        }
        export_to_excel_form.get('generate').on('click', function (item) {
            if (!export_to_excel_form.is_valid()) {
                return;
            }
            var export_to_excel_func = function (filtered_item_keys) {
                // Create dialog to show progress bar
                var export_properties = { includedAttendance: export_to_excel_form.get('show_attendance').get('value') };
                Daedalus.track('started gradebook export', export_properties);
                var export_panel = panels.add({
                        id: 'export_gradebook',
                        module: 'gradebook',
                        title: 'Exporting Gradebook',
                        layout: layouts.get('dialog'),
                        body: $('#loading_template').html(),
                        footer_buttons: { 'Cancel': 'remove' }
                    });
                //get export form values
                var form_values = export_to_excel_form.values();
                //add list of filtered items, if it has been passed
                if (filtered_item_keys) {
                    form_values.filtered_item_keys = filtered_item_keys;
                }
                // Send export command to publisher
                publisher.send({
                    module: 'gradebook',
                    command: 'export_to_excel',
                    args: form_values,
                    success: function (data, args) {
                        var export_task = new LongTask({ id: args.task });
                        export_task.bind('change:complete', function () {
                            if (this.get('complete') === 1) {
                                // When gradebook is exported, change footer button to 'Close'
                                // Track it
                                Daedalus.track('finished gradebook export');
                                Daedalus.increment('gadebookExportCount');
                                export_panel.set({
                                    footer_buttons: {
                                        Close: 'remove'
                                    }
                                });
                            }
                        });
                        var export_task_view = new LongTaskView({
                                model: export_task,
                                el: export_panel.$b()
                            });
                        export_task.fetch();
                        // in case it already finished
                        export_task_view.render();
                    }
                });
            };
            if (Browser.is_sandbox_app) {
                // Hide the model because we are opening a new view
                $('#gradebook-export-modal').modal('hide');
            }
            var item_filter = export_to_excel_form.get('item_filter');
            if (item_filter.value() === true) {
                var course_items = new CourseItems();
                course_items.populate_from_course(function () {
                    course_items.remove_tree('files');
                    course_items.remove_tree('feedback');
                    var panel = course_items.launch_dialog();
                    panel.set({
                        footer_buttons: {
                            Cancel: 'remove',
                            Ok: function () {
                                panel.remove();
                                var filtered_item_keys = course_items.get('selected_ids');
                                export_to_excel_func(filtered_item_keys);
                            }
                        }
                    });
                });
            } else {
                export_to_excel_func();
            }
        });
        return export_to_excel_form_div;
    };
    return { create_export_view: create_export_view };
});
