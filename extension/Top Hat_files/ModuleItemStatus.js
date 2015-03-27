/* global Backbone, _, Daedalus, course */
define([
    'text!templates/reports/module_item_status.html',
    'reporting'
], function (html, reporting) {
    'use strict';
    var ModuleItemStatusView = Backbone.View.extend({
        template: _.template(html),
        events: {
            'click .toggle_submission': 'toggle'
        },
        initialize: function (options) {
            this.options = options || {};
            // Draws a list of status bars - one for each report in the module item - in the provided element
            // Binds on the report update command, so status bars are changed as submissions are recieved
            this.reports = {};
            if (!_.isArray(this.options.report_id)) {
                this.options.report_id = [this.options.report_id];
            }
            _.each(this.options.report_id, function (id) {
                var report = reporting.Reports.request(id, this);
                this.reports[id] = report;
                this.listenTo(report, 'change:current_session', this.render, this);
                this.listenTo(report, 'change:data', this.render, this);
                report.fetch();
            }.bind(this));
            this.render();
            this.graph_type = 'online';
        },
        remove: function () {
            reporting.Reports.release(this.options.report_id, this);
            _.each(this.reports, function (report) {
                this.stopListening(report);
            }.bind(this));
            Backbone.View.prototype.remove.call(this);
        },
        render_report: function(report_key) {

            //get or create the container element for the report
            var el = $(this.el).find('.status_report#' + report_key);
            if( !el.length ) {
                $(this.el).find('table').append('<tr id="' + report_key + '" class="status_report"></tr>');
                el = $(this.el).find('.status_report#' + report_key);
            }

            var data = this.get_report_data(report_key);

            //render the html for the report
            $(el).html(this.template({
                'num_submissions': data.num_submissions,
                'title': data.title,
                'graph_type': this.graph_type,
                'num_reports': this.get_keys().length,
                'is_first': this.is_first_report(report_key)
            }));

            var mod_item = require('Modules').get_module_item(this.options.report_id[0]);
            if (mod_item) {
                // This is not a fix, but for some reason this is firing in production
                //   on demos, and triggering an exception.
                // TODO - Ask matt how this actually works for a potentially better fix
                // // See if enough people have responded to fire KPI
                var item_type = mod_item.get('type');
                Daedalus.track_student_submission(data.num_submissions, item_type);
            }

            //hide the title from the report graph
            data.title = '';

            //plot the graph
            var bar_html = reporting.Reporting.html_bar( data.value / 100, data.label );
            $(el).find('.graph').html( bar_html );
        },
        toggle: function (e) {
            e.preventDefault();
            this.graph_type = (this.graph_type === 'enrolled') ? 'online': 'enrolled';
            this.render();
        },
        render: function() {
            //graph a status bar on the status element
            $(this.el).html('<table class="status_bars"></table>');

            _.each(this.get_keys(), function(report_key) {
                this.render_report(report_key);
            }, this);
        },
        is_first_report: function(report_key) {
            //determine if this is the first report in the list
            var report_keys = this.get_keys();
            if( (report_keys.length > 1) && (report_keys[0] !== report_key) ) {
                return false;
            } else {
                return true;
            }
        },
        get_keys: function() {
            var data = this.get_data();

            //sort this stuff by name
            if (data.length > 0) {
                data.sort(function(a, b) {
                    var x = a.title.toLowerCase();
                    var y = b.title.toLowerCase();
                    return ((x < y) ? -1 : ((x > y) ? 1 : 0));
                });
            }

            return _.map(data, function(item) { return item.id; });
        },
        get_report_data: function(report_key) {
            return _.detect(this.get_data(), function(item) { return item.id === report_key; });
        },
        get_data: function() {
            // Returns a list of dictionary objects with the following structure:
            // [{
            //     "id": report id,
            //     "title": report title,
            //     "percent": a 0-100 representation of the # of students in the course who have answered the question,
            //     "submissions": the # of submissions for the report
            // }]
            // The list will contain a dictionary for each report in the module item (e.g. a demo with 3 questions would have 3 entries, but
            // a question module item would only have one)
            // report_key is optional - if passed, it limits the rendered status bars

            var num_students;
            if( this.graph_type === 'enrolled' ) {
                num_students = course.get('num_students');
            } else {
                num_students = course.get('num_online');
            }

            var reports = this.reports;

            var data = [];
            _.each(reports, function (report, report_key) {
                var session_name = report.get('current_session');
                var report_data = report.get('data');
                var title = report.get('name') || '';
                var result = {
                    'id': report_key,
                    'title': title,
                    'value': 0,
                    'label': 0 + '%',
                    'num_submissions': 0,
                    'color': 'green'
                };
                if (report_data && report_data[session_name]) {

                    var session_data = report_data[session_name];
                    var num_submissions = _.size( session_data );
                    var percent;
                    if (num_submissions === 0) {
                        percent = 0;
                    } else {
                        percent = Math.round(100 * num_submissions / num_students);
                        percent = Math.min(100, percent);
                    }
                    result.value = percent;
                    result.label = percent + '%';
                    result.num_submissions = num_submissions;
                }
                data.push(result);
            });

            //sort our status lists by title
            if (data.length > 0) {
                data.sort(function(a, b) {
                    var x = a.title.toLowerCase();
                    var y = b.title.toLowerCase();
                    return ((x < y) ? -1 : ((x > y) ? 1 : 0));
                });
            }
            return data;
        }
    });
    return ModuleItemStatusView;
});
