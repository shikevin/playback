/* global _, panels, publisher, Daedalus,
    moment, alert
   */
define([
    'modules/Module',
    'course/NavUtils',
    'views/gradebook/Export',
    'text!templates/invite/alerts.html',
    'layouts/edumacation/LayoutCollection',
    'util/Browser'
], function (
    Module,
    NavUtils,
    ExportView,
    disclaimer_html,
    layouts,
    Browser
) {
    'use strict';
    var panel_name = NavUtils.get_gradebook_panel();

    var format_num = function (num) {
        if (_.isNumber(num)) {
            return Math.round(num * 100) / 100;
        }
        return num;
    };

    var GradebookModule = Module.extend({
        defaults: _.extend({}, Module.prototype.defaults, {
            id: 'gradebook',
            title: 'Gradebook',
            color: 'blue'
        }),

        deactivate: function() {
            //re-initialize course module to re-generate course control panel
            Module.prototype.deactivate.call(this);
        },

        init_callback: function() {},

        open_gradebook: function () {
            window.Daedalus.track('opened_gradebook');
            var panel = panels.get('gradebook_panel');
            if( !panel ) {
                panel = panels.add({
                    id: 'gradebook_panel',
                    module: 'gradebook',
                    layout: layouts.get(panel_name),
                    title: 'Gradebook',
                    footer_buttons: {
                        'Close': 'remove'
                    },
                    priority: 2
                });
            }
            if (Browser.is_presentation_tool()) {
                layouts.get(panel_name).focus('gradebook_panel');
            }
            panel.set({
                body: '<div class=\'answers_warning app-styles\'>This report will put student grades on your screen.<br />This is not recommended if you are connected to a projector. Continue? <br /><a class=\'btn btn-legacy affirmative\' href=\'#\'>Yes, show grades</a> <a class=\'btn btn-legacy danger\' href=\'#\'>No, get me out of here!</a></div>'
            });
            panel.$b().find('a.danger').click(function (e) {
                e.preventDefault();
                NavUtils.open('content');
            });
            panel.$b().find('a.affirmative').click(function (e) {
                e.preventDefault();
                require('Modules').get_module('gradebook').load_gradebook();
            });
        },
        load_gradebook: function() {
            var panel = panels.get('gradebook_panel');
            if( !panel ) {
                panel = panels.add({
                    id: 'gradebook_panel',
                    module: 'gradebook',
                    layout: layouts.get(panel_name),
                    title: 'Gradebook',
                    footer_buttons: {
                        'Close': 'remove'
                    }
                });
            }
            panel.set({body: $('#loading_template').html()});

            publisher.send({
                module: 'gradebook',
                command: 'load_gradebook',
                success: function(data, args) {
                    var student_list = args.users;
                    var module_items = args.module_items;
                    var attendance_lectures = args.attendance.lectures;

                    var $export_view = ExportView.create_export_view();

                    //fill up student list
                    var num_unverified = 0;
                    var students_html = '<table class=\'gradebook_table gradebook_student_list\'><thead><tr><th>Username</th><th>First Name</th><th>Last Name</th><th>Student ID</th><th>Avg.</th><th>Answd.</th><th>Grade</th><th></th></tr></thead><tbody>';
                    for( var student in student_list ) {
                        // Only display verified students.
                        if (student_list[student].verified === true) {
                            students_html += '<tr>' +
                                             '<td>' + _.escape(student_list[student].username) + '</td>' +
                                             '<td>' + _.escape(student_list[student].first_name) + '</td>' +
                                             '<td>' + _.escape(student_list[student].last_name) + '</td>' +
                                             '<td>' + _.escape(student_list[student].student_id) + '</td>' +
                                             '<td>' + student_list[student].average + '</td>' +
                                             '<td>' + student_list[student].participation + '</td>' +
                                             '<td>' + student_list[student].total_score + '</td>' +
                                             '<td>' + student + '</td>' +
                                             '</tr>';
                        }
                        else {
                            num_unverified++;
                        }
                    }
                    students_html += '</tbody></table>';

                    // TODO stevo: Once all JS modules are requireified, move
                    // this jQuery datatable setting to app.js.
                    // ISO Date Sorting
                    $.fn.dataTableExt.oSort['iso-date-asc'] = function(a,b) {
                        var x = moment(a);
                        var y = moment(b);
                        //upcoming items have no date and thus return null!
                        //assumption: all null values are greater than any date
                        if (x === null && y !== null) { return 1; }
                        else if (y === null && x !== null) { return -1; }
                        else if (y === null && x === null) { return 0; }
                        else {
                            return ((x.diff(y) < 0) ? -1 : ((x.diff(y) > 0) ?  1 : 0));
                        }
                    };
                    $.fn.dataTableExt.oSort['iso-date-desc'] = function(a,b) {
                        var x = moment(a);
                        var y = moment(b);

                        if (x === null && y !== null) { return -1; }
                        else if (y === null && x !== null) { return 1; }
                        else if (y === null && x === null) { return 0; }
                        else {
                            return ((y.diff(x) > 0) ? 1 : ((x.diff(y) > 0) ?  -1 : 0));
                        }
                    };

                    var disclaimer = _.template(disclaimer_html, {count: num_unverified});
                    students_html = disclaimer + students_html;

                    //fill up item list
                    var items_html = '<table class=\'gradebook_table gradebook_item_list\'><thead><tr><th></th><th>Item</th><th>Percent Average</th><th>Percent Answered</th><th>Status</th><th>Correct Weight</th><th>Participation Weight</th><th>Last activated</th><th>Has correct answer?</th></thead><tbody>';
                    for( var item in module_items ) {
                        items_html += '<tr>' +
                                        '<td>' + item + '</td>' +
                                        '<td>' + _.escape(module_items[item].name) + '</td>' +
                                        '<td>' + module_items[item].average + '</td>' +
                                        '<td>' + module_items[item].participation + '</td>' +
                                        '<td>' + module_items[item].status + '</td>' +
                                        '<td>' + module_items[item].correct_weight + '</td>' +
                                        '<td>' + module_items[item].participation_weight + '</td>' +
                                        '<td>' + (module_items[item].last_activated_at !== null ? moment(module_items[item].last_activated_at).format('LLL') : '') + '</td>' + // timestamp formatting
                                        '<td>' + module_items[item].has_correct_answer + '</td>' +
                                        '</tr>';
                    }
                    items_html += '</tbody></table>';

                    var attendance_html = '<table class=\'gradebook_table gradebook_attendance_list\'><thead><tr><th>Lecture</th><th>Attendance</th><th>Lecture date</th><th>Key</th></thead><tbody>';
                    for(var lecture in attendance_lectures) {
                        attendance_html += '<tr>' +
                            '<td>' + attendance_lectures[lecture].display_name + '</td>' +
                            '<td>' + attendance_lectures[lecture].lecture_completion + '%' + '</td>' +
                            '<td>' + (attendance_lectures[lecture].last_activated_at !== null ? moment(attendance_lectures[lecture].last_activated_at).format('LLL') : '') + '</td>' +
                            '<td>' + attendance_lectures[lecture].key + '</td>' +
                            '</tr>';
                    }
                    attendance_html += '</tbody></table>';

                    // We don't show the "Export to Excel" tab if we're in the presentation tool
                    panel.set({body: ''}); //quick hack to prevent _.isEmpty underscore bug in Firefox; should remove 'body' set commands in the future
                    var base_body = [['Graded_Items', 'Graded Items', items_html], ['Students', 'Students', students_html]];
                    if (require('Modules').get_module('attendance').get('active')) {
                        base_body.push(['Attendance_Items', 'Attendance', attendance_html]);
                    }
                    if (!Browser.is_presentation_tool()) {
                        base_body.push(['Export_to_Excel', 'Export to Excel', $export_view]);
                    }
                    panel.set({body: base_body});

                    var students_table_el = panel.get('view').$('.gradebook_student_list');
                    students_table_el.dataTable( {
                        sDom: '<"dataTables_controls"ff<"refresh"><"cb">>t<"dataTables_controls"ip<"cb">>',
                        iDisplayLength:25,
                        sPaginationType:'full_numbers',
                        bPaginate: true,
                        bLengthChange: false,
                        bFilter: true,
                        bSort: true,
                        bJQueryUI: true,
                        bAutoWidth: false,
                        aaSorting: [[0, 'asc']],
                        aoColumns: [
                            /* Student */ {
                                bUseRendered: false,
                                fnRender: function( oObj ) {
                                    var student_key = oObj.aData[7];
                                    return '<a href=\'#\' class=\'bt_details\' onclick="require(\'Modules\').get_module(\'gradebook\').create_student_gradebook_details(\'' + student_key + '\', \'' + oObj.aData[0] + '\'); return false;">' + oObj.aData[0] + '</a>';
                                }
                            },
                            /* First Name */ null,
                            /* Last Name */ null,
                            /* Student ID */ null,
                            /* Average */ {
                                bUseRendered: false,
                                fnRender: function( oObj ) {
                                    return oObj.aData[4] + '%';
                                }
                            },
                            /* Participation */ {
                                bUseRendered: false,
                                fnRender: function( oObj ) {
                                    return oObj.aData[5] + '%';
                                }
                            },
                            /* Grade */ {
                                bUseRendered: false,
                                fnRender: function(oObj){
                                    var student_key = oObj.aData[7];
                                    return student_list[student_key].total_score + ' / <i>' + student_list[student_key].total_weight + '</i>';
                                }
                            },
                            /* Key */ { bVisible: false, bSearchable: false }
                        ]
                    });

                    students_table_el.fnDraw();

                    //create a list of graded module items
                    var items_table_el = panel.get('view').$('.gradebook_item_list');
                    items_table_el.dataTable({
                        sDom: '<"grades_table"<"dataTables_controls"f<"refresh"><"cb">>t<"dataTables_controls"ip<"cb">>>',
                        iDisplayLength:25,
                        sPaginationType:'full_numbers',
                        bPaginate: true,
                        bFilter: true,
                        bUseRendered: false,
                        bJQueryUI: true,
                        aaSorting: [ [0,'desc'], [1,'asc'] ],
                        aoColumnDefs: [
                            { aTargets : ['iso-date-column'] , sType : 'iso_date'}
                        ],
                        aoColumns: [
                            /* Key */ { bVisible: false, bSearchable: false },
                            /* Item */ {
                                bUseRendered: false,
                                fnRender: function( oObj ) {
                                    var item_key = oObj.aData[0];
                                    return '<a href=\'#\' class=\'bt_details\' onclick="require(\'Modules\').get_module(\'gradebook\').create_module_item_gradebook_details(\'' + item_key + '\', \'' + oObj.aData[1].replace(/'/g, '') + '\'); return false;">' + oObj.aData[1] + '</a>';
                                },
                                sType: 'natural'
                            },
                            /* Average */ {
                                bUseRendered: false,
                                fnRender: function( oObj ) {
                                    if( oObj.aData[1] === 'upcoming' ) { return '--'; }
                                    return oObj.aData[2] + '%';
                                },
                                sType: 'percent'
                            },
                            /* Participation */ {
                                bUseRendered: false,
                                fnRender: function( oObj ) {
                                    if( oObj.aData[1] === 'upcoming' ) { return '--'; }
                                    return oObj.aData[3] + '%';
                                },
                                sType: 'percent'

                            },
                            /* Status */ {
                                bUseRendered: false,
                                fnRender: function( oObj ) {
                                    return '<div title=\'' + oObj.aData[4] + '\' class=\'icon status_' + oObj.aData[4] + ' status_regular\'>' + oObj.aData[4] + '</div>';
                                }
                            },
                            /* Correct Weight */ {
                                bUseRendered: false,
                                fnRender: function( oObj ) {
                                    if( oObj.aData[8] === 'false' ) {
                                        return 'N/A'; //if no_correct_answer is true, don't show correct weight
                                    } else {
                                        var item_key = oObj.aData[0];
                                        return '<input class=\'custom_input\' weight_type=\'correct\' key=\'' + item_key + '\' type=\'text\' value=\'' + oObj.aData[5] + '\'>';
                                    }
                                }
                            },
                            /* Participation Weight */ {
                                bUseRendered: false,
                                fnRender: function( oObj ) {
                                    var item_key = oObj.aData[0];
                                    return '<input class=\'custom_input\' weight_type=\'participation\' key=\'' + item_key + '\' type=\'text\' value=\'' + oObj.aData[6] + '\'>';
                                }
                            },
                            /* Timestamp */ { sType: 'iso-date' },// null,
                            /* Has Correct Answer */ { bVisible: false, bSearchable: false }
                        ],
                        fnDrawCallback: function() {
                            //allow the table to be edited
                            $(items_table_el).find('tbody td:nth-child(5) input').add( $(items_table_el).find('tbody td:nth-child(6) input') ).keyup( function(e) {
                                if( e.keyCode === 13 ) {
                                    require('Modules').get_module('gradebook').weight_changed_callback(this); //Enter key pressed
                                }
                            });
                            $(items_table_el).find('tbody td:nth-child(5) input').add( $(items_table_el).find('tbody td:nth-child(6) input') ).change( function() {
                                require('Modules').get_module('gradebook').weight_changed_callback(this);
                            });
                        }
                    });
                    items_table_el.fnDraw();

                    // TODO: Datatables! For Attendance!! Yay!
                    var attendance_table_el = panel.get('view').$('.gradebook_attendance_list');
                    attendance_table_el.dataTable({
                        sDom: '<"grades_table"<"dataTables_controls"f<"refresh"><"cb">>t<"dataTables_controls"ip<"cb">>>',
                        iDisplayLength: 25,
                        bPaginate: true,
                        sPaginationType: 'full_numbers',
                        bLengthChange: false,
                        bFilter: true,
                        bSort: true,
                        bJQueryUI: true,
                        bAutoWidth: false,
                        aoColumns: [
                            // Lecture
                            {
                                bUseRendered: false,
                                fnRender: function(oObj){
                                        var attendance_name = oObj.aData[0];
                                        var attendance_key = oObj.aData[3];
                                        return '<span class=\'delete-attendance-item btn icon remove\' key=\'' + attendance_key + '\'></span>' +
                                            '<a href=\'#\' class=\'bt_details\' ' +
                                            'onclick="require(\'Modules\').get_module(\'gradebook\').create_attendance_gradebook_details(\'' +
                                            attendance_key + '\', \'' + attendance_name + '\'); return false;">'+ attendance_name + '</a>';
                                }
                            },
                            null,
                            null,
                            /* Key */ { bVisible: false, bSearchable: false }
                        ],
                        fnDrawCallback: function() {
                            $(attendance_table_el).find('.delete-attendance-item').click(function() {
                                var body = $('<p>You cannot delete an item that is still active</p>');
                                require('Modules').get_module('gradebook').check_item_still_active($(this).attr('key'), body, function(){}, function() {
                                    panels.add({
                                        id: 'delete_attendance_confirmation',
                                        module: 'attendance',
                                        layout: layouts.get('dialog'),
                                        title: 'Delete Attendance Item',
                                        body: $('<p>Are you sure you want to delete this attendance item?</p>'),
                                        footer_buttons: {
                                            'Delete': {
                                                bt_class: 'danger',
                                                callback: function() {
                                                    require('Modules').get_module('gradebook').delete_attendance_item(this, attendance_table_el);
                                                    panels.get('delete_attendance_confirmation').remove();
                                                }.bind(this)
                                            },
                                            'Cancel': {
                                                callback: 'remove'
                                            }
                                        }
                                    });
                                }.bind(this));
                            });
                        }
                    });
                    if (attendance_table_el.length > 0) {
                        // this module might not be active
                        attendance_table_el.fnDraw();
                    }

                    //TODO - Refactor into Daedalus method
                    // Tracks all actions of the Gradebook so that we can have some
                    // date when we go to redesign it
                    panel.get('view').$('.dataTables_wrapper .fg-button').click(function() {
                        if ( $(this).hasClass('next') ) {
                            Daedalus.track('clicked gradebook next');
                            Daedalus.increment('gradebookActivity');
                        } else if ( $(this).hasClass('first') ) {
                            Daedalus.track('clicked gradebook first');
                            Daedalus.increment('gradebookActivity');
                        } else if ( $(this).hasClass('previous') ) {
                            Daedalus.track('clicked gradebook prev');
                            Daedalus.increment('gradebookActivity');
                        } else if ( $(this).hasClass('last') ) {
                            Daedalus.track('clicked gradebook last');
                            Daedalus.increment('gradebookActivity');
                        } else {
                            Daedalus.track('clicked gradebook page');
                            Daedalus.increment('gradebookActivity');
                        }
                    });

                    //bind update key
                    panel.get('view').$('.dataTables_wrapper .refresh').click(function() {
                        Daedalus.track('refreshed gradebook');
                        Daedalus.increment('gradebookActivity');
                        require('Modules').get_module('gradebook').load_gradebook();
                    });

                    //track search
                    panel.get('view').$('.dataTables_wrapper .dataTables_filter input').blur(function() {
                        Daedalus.track('searched gradebook');
                        Daedalus.increment('gradebookActivity');
                    });
                    //track manual
                    panel.get('view').$('.dataTables_wrapper table.gradebook_table input.custom_input').blur(function() {
                        Daedalus.track('manually changed grade');
                        Daedalus.increment('gradebookActivity');
                    });
                }
            });
        },
        check_item_still_active: function(key, body, active_callback, inactive_callback) {
            var key_arr = key.split('__');
            if (require('Modules').get_module_item(key_arr[key_arr.length-1]).get('status') === 'active_visible') {
                active_callback();
                panels.add({
                    id: 'delete_item_still_active',
                    module: 'attendance',
                    layout: layouts.get('dialog'),
                    title: 'Item Still Active',
                    body: body,
                    footer_buttons: {
                        'Cancel': {
                            callback: 'remove'
                        }
                    }
                });
            } else {
                inactive_callback();
            }
        },
        weight_changed_callback: function(that){
            var module_item_key = $(that).attr('key');
            var value = $(that).val();
            var weight_type = $(that).attr('weight_type');

            if( parseFloat(value) < 0 ) {
                if( !$(that).hasClass('error') ) {
                    $(that).addClass('error').blur().one('click', function() { $(this).removeClass('error'); });
                    alert('Please enter a positive number (0 or greater)');
                }
                return;
            }
            publisher.post(
                'gradebook',
                'set_module_item_weight',
                '',
                {
                    weight: value,
                    module_item_key: module_item_key,
                    weight_type: weight_type
                }
            );
            $(that).blur();
        },
        grade_changed_callback: function(that){
            var key1 = $(that).attr('key1');
            var key2 = $(that).attr('key2');

            var custom_score = parseFloat( $(that).val() );
            var max_score = parseFloat( $(that).attr('max') );
            var percent = custom_score / max_score;
            var weight_type = $(that).attr('weight_type');
            if( (percent < 0) || (percent > 1) ) {
                if( !$(that).hasClass('error') ) {
                    if( percent < 0 ) { alert('Please enter a positive number (0 or greater)'); }
                    if( percent > 1 ) { alert('Please enter a number less than or equal to ' + max_score); }
                    $(that).addClass('error').blur().one('click', function() { $(this).removeClass('error'); });
                }
                return;
            }
            publisher.post(
                'gradebook',
                'set_custom_grade',
                '',
                {
                    key1: key1,
                    key2: key2,
                    weight_type: weight_type,
                    percent: percent
                }
            );
        },
        attendance_changed_callback: function(that){
            var key1 = $(that).attr('key1');
            var key2 = $(that).attr('key2');

            var attendance_key = key1.indexOf('attendance') !== -1 ? key1 : key2;
            var body = $('<p>You cannot edit an item that is still active</p>');
            require('Modules').get_module('gradebook').check_item_still_active(attendance_key, body, function() {
                $(that).prop('checked', !that.checked);
            },
            function() {
                var custom_score = ( $(that).is(':checked') ? 1 : 0 );
                var max_score = parseInt( $(that).attr('max'), 10 );
                var percent = custom_score / max_score;
                var weight_type = $(that).attr('weight_type');
                if( (percent < 0) || (percent > 1) ) {
                    if( !$(that).hasClass('error') ) {
                        if( percent < 0 ) { alert('Please enter a positive number (0 or greater)'); }
                        if( percent > 1 ) { alert('Please enter a number less than or equal to ' + max_score); }
                        $(that).addClass('error').blur().one('click', function() { $(this).removeClass('error'); });
                    }
                    return;
                }
                publisher.post(
                    'gradebook',
                    'set_custom_grade',
                    '',
                    {
                        key1: key1,
                        key2: key2,
                        weight_type: weight_type,
                        percent: percent
                    }
                );
            }.bind(this));
        },
        delete_attendance_item: function(that, dataTable) {
            var key = $(that).attr('key');
            publisher.send({
                module: 'attendance',
                command: 'delete_items',
                args: {
                    items: [{
                        id: key,
                        type: 'module_item'
                    }]
                },
                success: function(args) {
                    // TODO: jero davin: this doesn't quite work properly
                    var row = $('.delete-attendance-item[key=\'' + key + '\']').closest('tr');
                    if (row.length !== 0) {
                        dataTable.fnDeleteRow(row[0], null, true);
                    }
                }

            });

        },
        create_student_gradebook_details: function( key, name ) {
            Daedalus.track('clicked gradebook student detail', { name: name });
            Daedalus.increment('gradebookActivity');
            var data = $('#loading_template').html();
            var args = {color:'blue', title:name + ' - Gradebook', minimize:false, footer_style:'max', buttons:{Close:'remove'}};
            var panel_key = 'gradebook_detail_panel_' + key;
            publisher.add_command('gradebook', 'add_command', panel_name, panel_key, data, 0, args);
            var panel = panels.get(panel_key);
            publisher.post('gradebook', 'get_student_gradebook_details', '', {key: key}, function (data, args) {
                var tb = $('<table class=\'gradebook_table gradebook_student_details\'><thead><tr><th>Item</th><th>Type</th><th>Correctness</th><th>Participation</th><th>Status</th><th>Key</th></tr></thead><tbody></tbody></table>');
                publisher.run_command( 'gradebook', 'update_property', panel_name, 'gradebook_detail_panel_'+args.module_item_key, '', 0, { body : tb });

                var attendance_student_items = args.attendance.items;

                var attendance_student_html = '<table class=\'gradebook_table gradebook_attendance_student_details\'><thead><tr><th>Lecture</th><th>Attendance</th><th>Status</th><th>Key</th></thead><tbody>';
                for (var item in attendance_student_items) {
                    attendance_student_html += '<tr>' +
                        '<td>' + attendance_student_items[item].display_name + '</td>' +
                        '<td>' + attendance_student_items[item].grade + '</td>' +
                        '<td>' + (attendance_student_items[item].responded ? 'Answered' : 'Unanswered') + '</td>' +
                        '<td>' + attendance_student_items[item].key + '</td>' +
                        '</tr>';
                }
                attendance_student_html += '</tbody></table>';

                // Tabs
                var base_body = [['Grades_' + name, 'Grades', tb]];
                if (require('Modules').get_module('attendance').get('active')) {
                    base_body.push(['Attendance_' + name, 'Attendance', attendance_student_html]);
                }
                panel.set({body: base_body});

                tb.dataTable( {
                    iDisplayLength:10,
                    bPaginate: true,
                    sPaginationType:'full_numbers',
                    bLengthChange: false,
                    bFilter: true,
                    bSort: true,
                    bJQueryUI: true,
                    bAutoWidth: false,
                    sDom: '<"grades_table"<"dataTables_controls"f<"refresh"><"cb">>t<"dataTables_controls"ip<"cb">>>',
                    aoColumns: [
                        null,
                        /* Type */ {
                            bUseRendered: false,
                            fnRender: function(oObj) {
                                return '<span class=\'icon module_id ' + oObj.aData[1] + '\'>' + oObj.aData[1] + '</span>';
                            },
                            sType: 'natural'
                        },
                        /* Correctness */ {
                            bUseRendered: false,
                            fnRender: function(oObj){
                                if( row.correct_weight === 0 ) {
                                    return '<td>N/A</td>';
                                } else {
                                    if( (window.user.get('role') === 'teacher') ) {
                                        var fluid_key = oObj.aData[5];
                                        return '<input class=\'custom_input\' weight_type=\'correct\' max=\'' + row.correct_weight + '\' key2=\'' + fluid_key + '\' key1=\'' + key + '\' type=\'text\' value=\'' + Math.round(oObj.aData[2] * 100) / 100 + '\'> / <i>' + row.correct_weight + '</i> pts.';
                                    } else {
                                        var result = oObj.aData[2];
                                        if ( result === '?' ) {
                                            result = '<span class=\"gradebook_unknown_grade\" title=\'Your grade cannot be calculated until the professor has deactivated the question\'>' + result + '</span>';
                                        }
                                        return format_num(result) + ' / <i>' + row.correct_weight + '</i> pts.';
                                    }
                                }
                            }
                        },
                        /* Participation */ {
                            bUseRendered: false,
                            fnRender: function(oObj){
                                if( (window.user.get('role') === 'teacher') ) {
                                    var fluid_key = oObj.aData[5];
                                    return '<input class=\'custom_input\' weight_type=\'participation\' max=\'' + row.participation_weight + '\' key2=\'' + fluid_key + '\' key1=\'' + key + '\' type=\'text\' value=\'' + oObj.aData[3] + '\'> / <i>' + row.participation_weight + '</i> pts.';
                                } else {
                                    return format_num(oObj.aData[3]) + ' / <i>' + row.participation_weight + '</i> pts.';
                                }
                            }
                        },
                        /* Status */ {
                            bUseRendered: false,
                            fnRender: function( oObj ) {
                                return '<div title=\'' + oObj.aData[4] + '\' class=\'icon status_' + oObj.aData[4] + ' status_regular\'>' + oObj.aData[4] + '</div>';
                            }
                        },
                        { bVisible: false, bSearchable: false }
                    ],
                    fnDrawCallback: function() {
                        //allow the table to be edited
                        $(tb).find('tbody td:nth-child(3) input').add( $(tb).find('tbody td:nth-child(4) input') ).unbind('keyup').keyup( function(e) {
                            if( e.keyCode === 13 ) {
                                require('Modules').get_module('gradebook').grade_changed_callback(this); //Enter key pressed
                            }
                        });
                        $(tb).find('tbody td:nth-child(3) input').add( $(tb).find('tbody td:nth-child(4) input') ).unbind('change').change( function() {
                            require('Modules').get_module('gradebook').grade_changed_callback(this);
                        });
                    }
                });

                for( var user_key in args.results ) {
                    var row = args.results[user_key];
                    tb.fnAddData( [ row.name, row.module_id, row.correct_score, row.participation_score, row.status, user_key ], false );
                }
                tb.fnDraw();

                //build the footer, which shows the item's percent total and a breakdown of the aggregation
                var tf = $('<tfoot><tr></tr></tfoot>');
                tf.append('<td>' + args.total.average_pct + '% avg.</td><td></td>');
                if( parseFloat(args.total.correct_weight) === 0 ) {
                    tf.append('<td>N/A</td>');
                } else {
                    tf.append('<td>' + args.total.correct_score + ' / ' + args.total.correct_weight + ' pts.</td>');
                }
                tf.append('<td>' + args.total.participation_score + ' / ' + args.total.participation_weight + ' pts.</td>');
                tf.append('<td>' + args.total.participation_pct + '% answered</td>');
                tb.append(tf);

                //bind update key
                tb.parents('.dataTables_wrapper').find('.refresh').click(function(key, name) {
                    require('Modules').get_module('gradebook').create_student_gradebook_details(key, name);
                }.bind(this, key, name));

                var attendance_student_el = panel.get('view').$('.gradebook_attendance_student_details');
                attendance_student_el.dataTable({
                    iDisplayLength:10,
                    bPaginate: true,
                    sPaginationType:'full_numbers',
                    bLengthChange: false,
                    bFilter: true,
                    bSort: true,
                    bJQueryUI: true,
                    bAutoWidth: false,
                    sDom: '<"grades_table"<"dataTables_controls"f<"refresh"><"cb">>t<"dataTables_controls"ip<"cb">>>',
                    aoColumns: [
                        null, // Lecture
                        // Attended
                        {
                            bUseRendered: false,
                            fnRender: function(oObj){
                                var fluid_key = oObj.aData[3];
                                if( (window.user.get('role') === 'teacher') ) {
                                    return '<input class=\'custom_input\' weight_type=\'correct\' max=\'1\'' + '\' key2=\'' + fluid_key + '\' key1=\'' + key + '\' type=\'checkbox\''  + (oObj.aData[1] === '1' ? ' checked=\'checked\' value=\'1\'' : 'value=\'0\'') + '\'>';
                                } else {
                                    return '<input disabled class=\'custom_input\' weight_type=\'correct\'' + 'type=\'checkbox\''  + (oObj.aData[1] === '1' ? ' checked=\'yes\'' : '') + '\'>';
                                }
                            }
                        },
                        null, // Status
                        { bVisible: false, bSearchable: false }
                    ],
                    fnDrawCallback: function() {
                        // when edit checkbox, send attendance change to server
                        $(attendance_student_el).find('tbody td:nth-child(2) input').change( function(e) {
                            require('Modules').get_module('gradebook').attendance_changed_callback(this);
                            e.stopImmediatePropagation();
                        });
                    }
                });

                if (attendance_student_el.length > 0) {
                    attendance_student_el.fnDraw();
                    attendance_student_el.append('<tfoot><tr></tr>' + '<td>' + args.attendance.total + '% attendance</td></tfoot>');
                }

            });
        },
        create_attendance_gradebook_details: function(key, name) {
            Daedalus.track('clicked gradebook attendance detail', { name: name });
            Daedalus.increment('gradebookActivity');
            var data = $('#loading_template').html();
            var args = {
                color: 'blue',
                title: name + ' - Gradebook',
                minimize: false,
                footer_style: 'max',
                buttons: {
                    Close: 'remove'
                }
            };
            publisher.add_command('gradebook', 'add_command', panel_name, 'gradebook_detail_panel_' + key, data, 1, args);
            publisher.post('gradebook', 'get_attendance_gradebook_details', '', {
                key: key
            }, function (data, args) {
                var tb = $('<table class="gradebook_table gradebook_attendance_details"><thead><tr><th>Username</th><th>First Name</th><th>Last Name</th><th>Student ID</th><th id="attended">Attended</th><th>Failed</th><th>Key</th></tr></thead><tbody></tbody></table>');
                publisher.run_command('gradebook', 'update_property', panel_name, 'gradebook_detail_panel_'+ key, '', 1, { body : tb });

                tb.dataTable( {
                    iDisplayLength:10,
                    bPaginate: true,
                    sPaginationType:'full_numbers',
                    bLengthChange: false,
                    bFilter: true,
                    bSort: true,
                    bJQueryUI: true,
                    bAutoWidth: false,
                    sDom: '<"grades_table"<"dataTables_controls"f<"refresh"><"cb">>t<"dataTables_controls"ip<"cb">>>',
                    aoColumns: [
                        /* Username */ {
                            bUseRendered: false,
                            fnRender: function( oObj ) {
                                var student_key = oObj.aData[6];
                                return '<a href=\'#\' class=\'bt_details\' onclick="require(\'Modules\').get_module(\'gradebook\').create_student_gradebook_details(\'' + student_key + '\', \'' + oObj.aData[0] + '\'); return false;">' + oObj.aData[0] + '</a>';
                            }
                        },
                        /* First Name */ null,
                        /* Last Name */ null,
                        /* Student ID */ null,
                        /* Attended */ {
                            bUseRendered: false,
                            fnRender: function(oObj){
                                var fluid_key = oObj.aData[6];
                                return '<input class=\'custom_input\' weight_type=\'correct\' max=\'1\'' + '\' key2=\'' + fluid_key + '\' key1=\'' + key + '\' type=\'checkbox\''  + (oObj.aData[4] === 1 ? ' checked=\'checked\' value=\'1\'' : 'value=\'0\'') + '\'>' + (oObj.aData[5]? '<span>(Failed Attempt) </span><span class=\'fail_tooltip info icon\'></span>' : '');
                            }
                        },
                        /* Failed */ { bVisible: false, bSearchable: false },
                        /* Key*/ { bVisible: false, bSearchable: false }
                    ],
                    fnDrawCallback: function() {
                        // when edit checkbox, send attendance change to server
                        $(tb).find('tbody td:nth-child(5) input').change( function(e) {
                            require('Modules').get_module('gradebook').attendance_changed_callback(this);
                            e.stopImmediatePropagation();
                        });
                    }
                });

                var num_unverified = 0;
                var attend_count = 0;
                for(var user_key in args.attendance) {
                    var row = args.attendance[user_key];
                    // Do not show unverified and guest students in Gradebook > Attendance.
                    if (row.verified === false) {
                        num_unverified++;
                    } else if (row.is_anonymous_account === false) {
                        if (row.attended) { attend_count++; }
                        tb.fnAddData([
                            _.escape(row.username),
                            _.escape(row.first_name),
                            _.escape(row.last_name),
                            _.escape(row.student_id),
                            row.attended, row.failed, user_key ]);
                    }
                }
                tb.fnDraw();

                var tf = $('<tfoot><tr></tr></tfoot>');
                tf.append('<td></td>');
                tf.append('<td></td>');
                tf.append('<td></td>');
                tf.append('<td></td>');
                var total = _.size(args.attendance);
                total = total === 0 ? 1 : total;
                tf.append('<td>' + parseFloat((attend_count/total) * 100).toFixed(2) + '%</td>');
                tb.append(tf);

                var disclaimer = _.template(disclaimer_html, {count: num_unverified});
                tb.before($(disclaimer));

                //bind update key
                tb.parents('.dataTables_wrapper').find('.refresh').click(function(key, name) {
                    require('Modules').get_module('gradebook').create_attendance_gradebook_details(key, name);
                }.bind(this, key, name));

                $('.fail_tooltip').qtip({
                    content: 'Students are marked as having had a failed attempt if they submitted the 4-digit attendance code incorrectly 3 times.',
                    position: {
                        my: 'top center',
                        at: 'bottom left'
                    }
                });
            });
        },
        create_module_item_gradebook_details: function(key, name){
            Daedalus.track('clicked gradebook item detail', { name: name });
            Daedalus.increment('gradebookActivity');
            var data = $('#loading_template').html();
            var args = {
                color: 'blue',
                title: name + ' - Gradebook',
                minimize: false,
                footer_style: 'max',
                buttons: {
                    Close: 'remove'
                }
            };
            publisher.add_command('gradebook', 'add_command', panel_name, 'gradebook_detail_panel_' + key, data, 0, args);
            publisher.post('gradebook', 'get_module_item_gradebook_details', '', {
                'key': key
            }, function (data, args) {
                var tb = $('<table class=\'gradebook_table gradebook_item_details\'><thead><tr><th>Student</th><th>First Name</th><th>Last Name</th><th>Student ID</th><th>Correctness</th><th>Participation</th><th>Status</th><th>Key</th></tr></thead><tbody></tbody></table>');
                publisher.run_command( 'gradebook', 'update_property', panel_name, 'gradebook_detail_panel_'+args.module_item_key, '', 0, { body : tb });

                tb.dataTable( {
                    iDisplayLength:10,
                    bPaginate: true,
                    sPaginationType:'full_numbers',
                    bLengthChange: false,
                    bFilter: true,
                    bSort: true,
                    bJQueryUI: true,
                    bAutoWidth: false,
                    sDom: '<"grades_table"<"dataTables_controls"f<"refresh"><"cb">>t<"dataTables_controls"ip<"cb">>>',
                    aoColumns: [
                        /* Item */ null,
                        /* First Name */ null,
                        /* Last Name */ null,
                        /* Student ID */ null,
                        /* Correctness */ {
                            bUseRendered: false,
                            fnRender: function(oObj){
                                if( row.correct_weight === 0 ) {
                                    return '<td>N/A</td>';
                                } else {
                                    if( (window.user.get('role') === 'teacher') ) {
                                        var fluid_key = oObj.aData[7];
                                        return '<input class=\'custom_input\' weight_type=\'correct\' max=\'' + row.correct_weight + '\' key2=\'' + fluid_key + '\' key1=\'' + key + '\' type=\'text\' value=\'' + oObj.aData[4] + '\'> / <i>' + row.correct_weight + '</i> pts.';
                                    } else {
                                        return oObj.aData[4] + ' / <i>' + row.correct_weight + '</i> pts.';
                                    }
                                }
                            }
                        },
                        /* Participation */ {
                            bUseRendered: false,
                            fnRender: function(oObj){
                                if( (window.user.get('role') === 'teacher') ) {
                                    var fluid_key = oObj.aData[7];
                                    return '<input class=\'custom_input\' weight_type=\'participation\' max=\'' + row.participation_weight + '\' key2=\'' + fluid_key + '\' key1=\'' + key + '\' type=\'text\' value=\'' + oObj.aData[5] + '\'> / <i>' + row.participation_weight + '</i> pts.';
                                } else {
                                    return oObj.aData[5] + ' / <i>' + row.participation_weight + '</i> pts.';
                                }
                            }
                        },
                        /* Status */ {
                            bUseRendered: false,
                            fnRender: function( oObj ) {
                                return '<div title=\'' + oObj.aData[6] + '\' class=\'icon status_' + oObj.aData[6] + ' status_regular\'>' + oObj.aData[6] + '</div>';
                            }
                        },
                        { bVisible: false, bSearchable: false }
                    ],
                    fnDrawCallback: function() {
                        //allow the table to be edited
                        $(tb).find('.custom_input[weight_type=correct]').add($(tb).find('.custom_input[weight_type=participation]')).unbind('keyup').keyup( function(e) {
                            if( e.keyCode === 13 ) {
                                require('Modules').get_module('gradebook').grade_changed_callback(this); //Enter key pressed
                            }
                        });
                        $(tb).find('.custom_input[weight_type=correct]').add($(tb).find('.custom_input[weight_type=participation]')).unbind('change').change( function() {
                            require('Modules').get_module('gradebook').grade_changed_callback(this);
                        });
                    }
                });

                // Add row to gradebook.
                for (var user_key in args.results) {
                    var row = args.results[user_key];
                    if (row.verified === true) {
                        // Only add row if user is verified.
                        tb.fnAddData([
                            _.escape(row.name),
                            _.escape(row.first_name),
                            _.escape(row.last_name),
                            _.escape(row.student_id),
                            row.correct_score,
                            row.participation_score,
                            row.status, user_key ], false);
                    }
                }
                tb.fnDraw();

                //build the footer, which shows the item's percent total and a breakdown of the aggregation
                var tf = $('<tfoot><tr></tr></tfoot>');
                tf.append('<td>' + args.total.average_pct + '% avg.</td>');
                tf.append('<td></td>');
                tf.append('<td></td>');
                tf.append('<td></td>');
                if( parseFloat(args.total.correct_weight) === 0 ) {
                    tf.append('<td>N/A</td>');
                } else {
                    tf.append('<td>' + args.total.correct_score + ' / ' + args.total.correct_weight + ' pts.</td>');
                }
                tf.append('<td>' + args.total.participation_score + ' / ' + args.total.participation_weight + ' pts.</td>');
                tf.append('<td>' + args.total.participation_pct + '% answered</td>');
                tb.append(tf);

                var disclaimer = _.template(disclaimer_html, {count: args.total.total_unverified});
                tb.before($(disclaimer));

                //bind update key
                tb.parents('.dataTables_wrapper').find('.refresh').click(function(key, name) {
                    require('Modules').get_module('gradebook').create_module_item_gradebook_details(key, name);
                }.bind(this, key, name));
            });
        }
    });

    return GradebookModule;
});
