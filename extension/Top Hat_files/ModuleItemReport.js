/*globals Backbone, window, _, $, moment, h337, d3, define*/
define([
    'text!templates/reports/row_limit.html',
    'text!templates/reports/basic_report.html',
    'text!templates/reports/comparison.html',
    'text!templates/reports/sessions.html',
    'text!templates/reports/report.html',
    'text!templates/reports/heatmap.html',
    'text!templates/reports/wordcloud.html',
    'reporting',
    'mathjax',
    'util/Browser'
], function (
    row_limit,
    basic_report,
    comparison_template,
    sessions_template,
    report_template,
    heatmap_template,
    wordcloud_template,
    reporting,
    mathjax,
    Browser
) {
    'use strict';

    var BaseReport, GraphReport, TableReport,
        CompareReport, CompareQuestionsReport, CompareSessionsReport,
        NumericReport, HeatMapReport, WordCloudReport,
        SessionSelector, ModuleItemReportView;

    var REPORT_DATE_FORMAT = 'MMMM Do YYYY, h:mm:ss a',
        ANSWER_REGEX = /\|,,\|/g,
        ANSWER_SEPARATOR = ',';

    BaseReport = Backbone.View.extend({
        _row_limits: [10, 30, 50],
        _get_row_limit_data: function (num_rows) {
            var row_limit_data = {
                row_limits: this._row_limits,
                min_row_limit: this._get_default_row_limit(),
                num_rows: num_rows
            };
            return row_limit_data;
        },
        _get_default_row_limit: function () {
            return this._row_limits[0];
        },
        _get_current_row_limit: function () {
            var row_limit = parseInt(this.$('.row_limit').val(), 10);
            if (_.isNaN(row_limit)) {
                return this._get_default_row_limit();
            }
            return row_limit;
        }
    });

    GraphReport = BaseReport.extend({
        template: _.template(row_limit),
        className: 'row_limit_class',
        events: {
            'change .row_limit': 'update_row_limit'
        },
        initialize: function (options) {
            this.options = options || {};

            this.listenTo(this.options.report, 'change', this.render, this);

            // this line was re-rendering report *after* correct answers were
            // highlighted, preventing highlighting.
            this.listenTo(this.options.report, 'change', this.render, this);
        },
        render: function (row_limit) {
            var bucket_list, row_limit_number;
            bucket_list = this.options.report.generate_bucket_list(
                this.options.model,
                this.options.report.get('current_session'),
                true
            );

            // show/hide empty buckets list
            this.$el.html(_.template(
                basic_report,
                { empty: _.isEmpty(bucket_list) }
            ));
            if (_.isEmpty(bucket_list)) {
                return;
            }
            this.$('.empty_graph').remove();

            // set row_limit_number to argument.
            if (_.isNumber(row_limit)) {
                row_limit_number = row_limit;
            }

            // if row_limit not specified, set to default. handles strange
            // corner case where row_limit is not a number.
            if ((_.isUndefined(row_limit) || !_.isNumber(row_limit)) &&
                _.isUndefined(this.row_limit_number)) {
                row_limit_number = this._get_default_row_limit();
            }

            if (!_.isUndefined(this.row_limit_number)) {
                row_limit_number = this.row_limit_number;
            }

            // Generate bar report.
            this.$('.report_container').barReporter({
                data: bucket_list,
                legends: undefined,
                colors: undefined,
                row_limit: row_limit_number
            });

            // add the magnify class to the container
            this.$el.addClass('magnify_scale_font');
            this.$el.attr('magnify_max_font', 36);
            this.options.parent.trigger('remagnify');

            // create row limit dropdown set to selected value
            this.render_row_limit(row_limit_number, bucket_list.length);
            mathjax.execute_mathjax(this.el);
            this.trigger('render');
        },
        render_row_limit: function (row_limit, num_rows) {
            var data,
                number_responses = 0,
                current_data;

            // count number of responses
            current_data = this.options.report.session_data(
                this.options.report.get('current_session'));
            number_responses = 0;
            _.each(current_data, function () {
                number_responses += 1;
            });

            data = {
                current_row_limit: row_limit,
                number_responses: number_responses
            };
            data = _.extend(data, this._get_row_limit_data(num_rows));
            this.$('.row_limit_container').html(this.template(data));
        },
        update_row_limit: function (e) {
            var row_limit = parseInt($(e.target).val(), 10);
            this.row_limit_number = row_limit;
            this.render(row_limit);
        }
    });

    TableReport = Backbone.View.extend({
        initialize: function (options) {
            this.options = options || {};
            this.listenTo(this.options.report, 'change', this.render, this);
        },
        events: {
            'click .answers_warning a.affirmative': 'confirm',
            'click .answers_warning a.danger': 'cancel'
        },
        confirm: function (e) {
            e.preventDefault();
            this.options.confirmed = true;
            this.render();
        },
        cancel: function (e) {
            e.preventDefault();
            this.options.parent.$('a.graph').trigger('click');
        },
        render_empty: function () {
            this.$el.html(
                '<div class="empty_graph">No data to report</div>' +
                '<div class="cb"></div>'
            );
        },
        render_confirmation: function () {
            this.$el.html(
                '<div class="answers_warning app-styles">' +
                    'This report will put individual student answers on ' +
                    'your screen. <br>This is not recommended if you are ' +
                    'connected to a projector. Continue? <br>' +
                    '<a class="btn btn-legacy affirmative" href="#">' +
                        'Yes, show answers' +
                    '</a> ' +
                    '<a class="btn btn-legacy danger" href="#">' +
                    'No, get me out of here!' +
                    '</a>' +
                '</div>'
            );
        },
        render: function () {
            var dt, html, report_data, report_data_hidden, num_users_hidden;
            report_data = this.options.report.current_data({
                verified: true});
            report_data_hidden = this.options.report.current_data({
                verified: false});
            num_users_hidden = _.size(report_data_hidden);

            if (_.isEmpty(report_data) && num_users_hidden === 0) {
                this.render_empty();
                return;
            }
            this.$('.empty_graph').remove();

            if (!this.options.confirmed) {
                this.render_confirmation();
                return;
            }
            html = '';
            if (num_users_hidden >= 1) {
                // TODO: Remove margin. It's a hack.
                html += (
                    '<div class="alert alert-info" style="margin: 0 15px;">');
                if (num_users_hidden === 1) {
                    html += (
                        '<i class="icon info"></i> &nbsp;There is ' +
                        num_users_hidden +
                        ' answer submitted by an unregistered student.'
                    );
                } else {
                    html += (
                        '<i class="icon info"></i> &nbsp;There are ' +
                        num_users_hidden +
                        ' answers submitted by unregistered students.'
                    );
                }
                html += (
                    ' <a class="alert-link" ' +
                    'href="https://support.tophatmonocle.com/hc/en-us/articles/200585000" ' + // jshint ignore:line
                    'target="_blank">' +
                    'I want to learn more about unregistered students.</a>'
                );
                html += '</div><br/>';
            }

            // Before re-rendering the table, we should store the current page length to restore the state
            var current_display_length = 10;
            var current_display_start = 0;

            var table_report = this.$('table.table_report');
            if (table_report.length) {
                var current_settings = table_report.dataTable().fnSettings();
                current_display_length = current_settings._iDisplayLength;
                current_display_start = current_settings._iDisplayStart;
            }

            html += ('<table class="table_report" style="width:100%">' +
                '<thead><tr><th>Answer</th><th>Username</th></tr></thead>' +
                '<tbody></tbody></table>');
            this.$el.html(html);

            var min_display_length = 10;
            dt = this.$('table.table_report').dataTable({
                sDom: '<"dataTables_controls options"l<"cb">>t<"dataTables_controls"ip<"cb">>', // jshint ignore:line
                bJQueryUI: true,
                aoColumns: [null, null],
                bLengthChange: _.keys(report_data).length > min_display_length,
                aLengthMenu: [
                    [min_display_length, 20, 30, -1],
                    [min_display_length, 20, 30, 'All']
                ],
                iDisplayLength: current_display_length
            });

            // loop through new data and add to data table
            _.each(report_data, function (data, username) {
                // what the hell does this do?
                // Apparently anonymous responses have usernames that start
                // with an underscore and end with an underscore with no other
                // underscores in between.
                if (username.match('^_[^_]+_$')) { username = 'Anonymous SMS'; }
                // Now that we have verified student data, sometime this is an
                // object.
                if(_.isObject(data) && !_.isUndefined(data.answer)) {
                    data = data.answer;
                }
                if (_.isString(data)) {
                    data = _.escape(data).replace(
                        ANSWER_REGEX, ANSWER_SEPARATOR);
                }
                dt.fnAddData([data, _.escape(username)], false);
            });

            dt.fnDraw();
            // Issue: fnDraw will ignore iDisplayStart given to it in the initialization
            // because the data will get sorted (and current page state will get lost)
            // so we have to do it manually ourselves through the legacy API
            dt.fnDisplayStart(current_display_start);
        }
    });

    CompareReport = BaseReport.extend({
        events: {
            'change .item': 'change_item',
            'change .session': 'change_session',
            'change .row_limit': 'render_report'
        },
        change_item: function (e) {
            var item_id = $(e.target).val();
            this.compare_to(this.model.collection.findWhere({id: item_id}));
            this.render();
        },
        change_session: function (e) {
            this.options.compare_session = $(e.target).val();
            this.render();
        },
        render: function () {
            this.$el.html(
                '<div class="filter_container"></div>' +
                '<div class="report_container"></div>');
            var report_data = this._get_report_data();
            this.render_filter(report_data.bucket_list.length);
            this.render_report(report_data);
        },
        render_report: function (report_data) {
            if (
                _.isUndefined(report_data) ||
                _.isUndefined(report_data.bucket_list)
            ) {
                report_data = this._get_report_data();
            }

            var $el = this.$('.report_container'),
                row_limit = this._get_current_row_limit();

            $el.empty();

            this._render_bar_reporter(report_data, row_limit, $el);

            // add the magnify class to the container
            $el.addClass('magnify_scale_font');
            this.options.parent.trigger('remagnify');

            mathjax.execute_mathjax(this.el);
        },
        _render_filter_template: function (
            filtered_sessions, sessions, items,
            id, current_session, num_rows
        ) {
            _.each(
                filtered_sessions,
                function (session) {
                    sessions.push(
                        this._get_session_obj_from_report_session(session));
                }.bind(this)
            );
            var data =  {
                items: items,
                sessions: sessions,
                id: id,
                current_session: current_session
            };
            data = _.extend(data, this._get_row_limit_data(num_rows));
            this.$('.filter_container').html(this.template(data));
            this.$('select:not(.row_limit)').select2();
        },
        _display_session_options: function (sessions) {
            _.each(sessions, function (session) {
                var display;
                if (session === 'All Data') {
                    display = session;
                } else {
                    display = moment(session).format(
                        REPORT_DATE_FORMAT);
                }
                $('.session').append(
                    '<option value="' + session + '">' + display +
                    '</option>');
            }.bind(this));
        },
        _get_session_obj_from_report_session: function (report_session) {
            var m_date = moment(report_session);
            return {
                key: report_session,
                value: (
                    m_date.isValid() ?
                    m_date.format(REPORT_DATE_FORMAT) : report_session)
            };
        },
        compare_to: function (item) {
            var new_report;
            if (this.options.compare !== this.options.report) {
                // stop listening to the old report
                this.stopListening(this.options.compare);
                reporting.Reports.release(
                    this.options.compare.get_id(), 'compare_' + this.cid);
            }

            this.options.compare_to_item = item;

            if (item === this.options.model) {
                new_report = this.options.report;
            } else {
                // start listening to the new report
                new_report = reporting.Reports.request(
                    item.get_id(), 'compare_' + this.cid);
                this.listenTo(new_report, 'change', this.render, this);
                this.listenTo(new_report, 'change', this.update_sessions, this);
            }
            this.options.compare = new_report;
            this.$('.session option').remove();
            this.update_sessions(this.options.compare);
        },
        _listen_to_report: function () {
            this.listenTo(
                this.options.report, 'change', this.render, this);
            this.listenTo(
                this.options.report, 'change', this.update_sessions, this);
        }
    });

    CompareQuestionsReport = CompareReport.extend({
        template: _.template(comparison_template),
        className: 'compare',
        initialize: function (options) {
            this.options = options || {};
            this.options.compare_session = 'All Data';
            this.options.compare = this.options.report;

            /**
             * The item that the user has choosen to compare against this item.
             * @property options.compare_to_item
             */
            var model_index = this.model.collection.indexOf(this.model);
            // if we're the first question, default compare to itself
            if (model_index === 0) {
                this.options.compare_to_item = this.options.model;
            } else {
                // otherwise default compare to the question before it
                this.options.compare_to_item = (
                    this.model.collection.at(model_index - 1));
                this.compare_to(this.options.compare_to_item);
            }

            this._listen_to_report();
        },
        update_sessions: function (report) {
            if (report === this.options.compare) {
                // find the sessions that aren't in the filter select box,
                // and add them
                var $options, old_sessions, new_sessions, diff;
                $options = this.$('.session option');
                old_sessions = _.map(
                    $options,
                    function (option) {
                        return $(option).attr('value');
                    }
                );
                new_sessions = report.get_filtered_sessions();
                diff = _.difference(new_sessions, old_sessions);
                this._display_session_options(diff);
            }
        },
        _get_report_data: function () {
            // this method is somewhat mysterious.
            var report = this.options.report,
                model = this.options.model,
                compare = this.options.compare,
                current_data = report.current_data(),
                compare_data = compare.session_data(
                    this.options.compare_session),
                bucket_list = report.generate_bucket_list(
                    model, report.get('current_session')),
                comparison_legend,
                data = {},
                convert_to_answer_dict = function (dict) {
                    /**
                    * Transforms a user:response dictionary, like
                    * {
                    *     "stevo+cot1@tophat.com":{
                    *         "answer":"0 correct",
                    *         "detail":[[0.063,0.143]]
                    *     },
                    *     "stevo+cot2@tophat.com":{
                    *         "answer":"1 correct",
                    *         "detail":[[0.91,0.128]]
                    *     }
                    * }
                    * into a user:answer dictionary, like
                    * {
                    *     "stevo+cot1@tophat.com": "0 correct",
                    *     "stevo+cot2@tophat.com": "0 correct"
                    * }
                    * @method convert_to_answer_dict
                    */
                    var answer_dict = {};
                    _.each(dict, function (response, user) {
                        answer_dict[user] = response.answer;
                    });
                    return answer_dict;
                };


            // 'target' type as defined in
            // e.question.models.ClickOnTargetQuestion
            if (this.options.compare_to_item.get('type') === 'target') {
                compare_data = convert_to_answer_dict(compare_data);
            }

            if (model.get('type') === 'target') {
                current_data = convert_to_answer_dict(current_data);
            }

            comparison_legend = _.uniq(_.values(compare_data));

            comparison_legend.push('New');

            // generate a dictionary with an entry for each bucket; this entry
            // has a list of 0s, corresponding to the comparison legend

            _.each(bucket_list, function (bucket) {
                var name = bucket[1];
                data[name] = _.map(
                    comparison_legend, function () { return 0; });
            });

            _.each(current_data, function (bucket, username) {
                var previous_bucket, comparison_index;
                // if the filtered data does not have the user's bucket, it is
                // not important enough to be shown and we ignore the result
                if (!data[bucket]) {
                    return;
                }

                // get the user's comparison bucket; if none is found, default
                // to 'New'
                previous_bucket = (
                    compare_data && compare_data[username] ?
                    compare_data[username] : 'New'
                );

                // up the comparison bucket by one
                comparison_index = _.indexOf(
                    comparison_legend, previous_bucket);
                data[bucket][comparison_index] += 1;
            });

            // regenerate the bucket list from the dictionary
            bucket_list = [];
            _.each(data, function (data, bucket) {
                bucket_list.push([data, bucket]);
            });
            return {
                bucket_list: bucket_list,
                comparison_legend: comparison_legend
            };
        },
        render_filter: function (num_rows) {
            var items, sessions, filtered_sessions, id, current_session;
            items = this.model.collection
                .filter(function (item) {
                    return !item.get('is_anonymous');
                })
                .map(function (item) {
                    return {id: item.get('id'), name: item.get('title')};
                });
            current_session = this.options.compare_session;
            sessions = [];
            filtered_sessions = this.options.report.get_filtered_sessions();
            id = this.options.compare.get_id();

            this._render_filter_template(
                filtered_sessions, sessions, items,
                id, current_session, num_rows);
            mathjax.execute_mathjax(this.el);
        },
        _render_bar_reporter: function (report_data, row_limit, $el) {
            // generate the bar report
            $el.barReporter({
                data: report_data.bucket_list,
                legends: report_data.comparison_legend,
                colors: [
                    '#F44D78', '#F9B45A', '#70A123', '#108AB9', '#B238C7'],
                type: 'stacked',
                row_limit: row_limit
            });
        }
    });

    CompareSessionsReport = CompareReport.extend({
        template: _.template(comparison_template),
        className: 'compare',
        initialize: function (options) {
            this.options = options || {};
            // var module = this.options.model.get('module_id');
            this.options.compare_session = 'Previous Session';
            this.options.compare = this.options.report;
            this.options.old_sessions = [];
            this._listen_to_report();
        },
        update_sessions: function (report) {
            if (report === this.options.compare) {
                // find the sessions that aren't in the filter select box,
                // and add them
                var old_sessions, new_sessions, diff;
                old_sessions = this.options.old_sessions;
                new_sessions = report.get_filtered_sessions();
                diff = _.difference(new_sessions, old_sessions);
                this._display_session_options(diff);
                this.options.old_sessions = (
                    this.options.old_sessions.concat(diff));
            }
        },
        _get_report_data: function () {
            var transformed, bucket_list,
                comparison_legends,
                last_session_buckets,
                compare_session,
                report_buckets = {},
                original_compare_session,
                sessions, target_bucket, session_index;

            bucket_list = this.options.report.generate_bucket_list(
                this.options.model,
                this.options.report.get('current_session'),
                true
            );

            // show/hide empty buckets list
            if (_.isEmpty(bucket_list)) {
                return null;
            }

            // convert last session's data into bucket dictionary
            compare_session = this.options.compare_session;
            if (compare_session === 'Previous Session') {
                sessions = this.options.report.get_filtered_sessions();
                session_index = _.indexOf(
                    sessions, this.options.report.get('current_session'));
                if (session_index === 0) {
                    // this was the first session
                    compare_session = 'no data';
                } else {
                    session_index = session_index - 1;
                    compare_session = sessions[session_index];
                }
            }
            last_session_buckets = this.options.report.generate_bucket_list(
                this.options.model, compare_session);

            // convert bucket list from single value to multi-point value
            _.each(bucket_list, function (bucket) {
                report_buckets[bucket[1]] = [0, bucket[0]];
            });
            _.each(last_session_buckets, function (bucket) {
                target_bucket = report_buckets[bucket[1]];
                if (target_bucket) {
                    report_buckets[bucket[1]] = [bucket[0], target_bucket[1]];
                } else {
                    report_buckets[bucket[1]] = [bucket[0], 0];
                }
            });
            // transform the report buckets
            transformed = _.pairs(report_buckets);
            _.each(transformed, function (val, index) {
                // have to swap these because barReporter takes data
                // like [value, key]
                transformed[index] = [val[1], val[0]];
            });

            // change comparison-specific values
            comparison_legends = [];

            original_compare_session = this.options.compare_session;
            if (original_compare_session === 'All Data' ||
                    original_compare_session === 'Previous Session') {
                comparison_legends.push(original_compare_session);
            } else {
                comparison_legends.push(moment(original_compare_session).
                    format(REPORT_DATE_FORMAT));
            }

            var current_session = this.options.report.get('current_session');
            if (
                current_session === 'All Data' ||
                current_session === 'Previous Session'
            ) {
                comparison_legends.push(
                    this.options.report.get('current_session'));
            } else {
                comparison_legends.push(
                    moment(this.options.report.get('current_session')).format(
                        REPORT_DATE_FORMAT));
            }

            return {
                bucket_list: transformed,
                comparison_legends: comparison_legends
            };
        },
        render_filter: function (num_rows) {
            var items, sessions, filtered_sessions, id, current_session;
            items = [{
                id: this.options.model.get('id'),
                name: this.options.model.get('title')
            }];
            current_session = 'Previous Session';
            sessions = [{
                key: current_session,
                value: current_session
            }];
            filtered_sessions = this.options.report.get_filtered_sessions();
            id = this.options.model.get_id();

            this._render_filter_template(
                filtered_sessions, sessions, items,
                id, current_session, num_rows);
            this.options.old_sessions = (
                this.options.old_sessions.concat(filtered_sessions));
        },
        _render_bar_reporter: function (report_data, row_limit, $el) {
            var bucket_list = report_data.bucket_list;
            // show/hide empty buckets list
            if (bucket_list === null || _.isEmpty(bucket_list)) {
                $el.html(
                    '<div class="empty_graph">No data to report</div>' +
                    '<div class="cb"></div>'
                );
                return;
            }
            this.$('.empty_graph').remove();

            // generate the bar report
            $el.barReporter({
                data: bucket_list,
                legends: report_data.comparison_legends,
                colors: ['#108AB9', '#70A123'],
                row_limit: row_limit
            });
        }
    });

    NumericReport = Backbone.View.extend({
        initialize: function (options) {
            this.options = options || {};
            this.listenTo(this.options.report, 'change', this.render, this);
        },
        render: function () {
            var current_data, values,
                min, max, sum, mean, variance, deviation, html;
            current_data = this.options.report.current_data();

            if (_.isEmpty(current_data)) {
                this.$el.html(
                    '<div class="empty_graph">No data to report</div>' +
                    '<div class="cb"></div>');
                return;
            }
            this.$('.empty_graph').remove();

            if (!this.$('.math_report').length) {
                html = '<div class="math_report" class="magnify_scale_font">' +
                    '<p><span>Max:</span><b class="max"></b></p>' +
                    '<p><span>Min:</span><b class="min"></b></p>' +
                    '<p><span>Mean:</span><b class="mean"></b></p>' +
                    '<p><span>Standard Deviation:</span>' +
                    '<b class="stddev"></b></p>';
                this.$el.html(html);
            }

            // get numeric values in list
            values = _.map(current_data, function (data) {
                return parseFloat(data);
            });

            // do math calculations on data
            max = _.max(values);
            min = _.min(values);
            sum = _.reduce(
                values, function (memo, value) { return memo + value; });
            mean = sum / values.length;

            variance = _.reduce(values, function (memo, value) {
                return memo + Math.pow(value - mean, 2);
            }, 0);

            variance = variance / values.length;
            deviation = Math.sqrt(variance);

            this.$('.mean').html(Math.round(mean * 1000) / 1000);
            this.$('.min').html(Math.round(min * 1000) / 1000);
            this.$('.max').html(Math.round(max * 1000) / 1000);
            this.$('.stddev').html(Math.round(deviation * 1000) / 1000);
            this.options.parent.trigger('remagnify');
            mathjax.execute_mathjax(this.el);
        }
    });

    HeatMapReport = Backbone.View.extend({
        initialize: function (options) {
            this.options = options || {};
            this.listenTo(
                this.options.report, 'change', this.set_data, this);
            this.listenTo(
                this.options.model, 'change:show_answer',
                this.render_correct_answers, this);
        },
        set_data: function () {
            var current_details, heatmap, clicks, data, max;
            if (this.options.loading) {
                return;
            }
            current_details = this.options.report.current_details();

            // reduce the data to a useful form
            clicks = [].concat.apply([], _.values(current_details));
            data = [];
            _.each(clicks, function (click) {
                var x, y, bucket;
                x = click[0];
                y = click[1];
                bucket = _.find(data, function (datum) {
                    return datum.x === x && datum.y === y;
                });
                if (!_.isUndefined(bucket)) {
                    bucket.count += 1;
                } else {
                    data.push({
                        x: x,
                        y: y,
                        count: 1
                    });
                }
            });
            max = _.reduce(data, function (max, datum) {
                return Math.max(max, datum.count);
            }, 0);

            heatmap = this.$el.data('heatmap');
            heatmap.store.setDataSet({
                data: data,
                max: max,
                relative: true
            });
        },
        render: function () {
            var $img_el, template = _.template(heatmap_template);
            this.options.loading = true;
            this.$el.html(template(this.model.toJSON()));
            $img_el = this.$('img');
            $img_el.on('load', function () {
                var config, heatmap;
                config = {
                    element: this.$('.heatmap')[0],
                    radius: 10,
                    opacity: 75
                };

                heatmap = h337.create(config);
                this.$el.data('heatmap', heatmap);
                this.options.loading = false;
                this.set_data();

                // make a fake img to ensure we get the original size
                var fake_img = new Image();
                fake_img.src = $img_el.attr('src');
                var orig_width = fake_img.width,
                    orig_height = fake_img.height;
                var ratio = orig_width === 0 ? 0 : orig_height / orig_width;

                var parent = $img_el.parent('.magnify_scale_pixel');
                var correct = parent.find('.heatmap_correct_answers');
                var canvas = parent.find('canvas');
                canvas.css('min-width', 300 + 'px');
                canvas.css('min-height', ratio * 300 + 'px');
                correct.css('min-height', ratio * 300 + 'px');
                $img_el.css('min-height', ratio * 300 + 'px');
                parent.css('min-height', ratio * 300 + 'px');
            }.bind(this));
        },
        render_correct_answers: function () {
            if (!this.options.model.get('show_answer')) {
                this.$('.heatmap_correct_answers').empty();
                return;
            }

            // largely copied from ClickQuestion.js
            var container_width = this.$('img').width(),
                container_height = this.$('img').height(),
                targets = this.options.model.get('targets');

            _.each(targets, function (target) {
                // if a width ratio is present, use it; otherwise, use default
                // width of 15
                var size = target[2] ? target[2] * container_width : 15,
                    widthHeightRatio = Math.round(
                        container_width * 1000 / container_height) / 1000,
                    width = Math.round(size / container_width * 1000) / 1000,
                    height = width * widthHeightRatio,
                    $el,
                    x = target[0],
                    y = target[1];

                x -= width / 2;
                y -= height / 2;

                $el = $('<div class="cotTarget"></div>');
                $el.css({
                    top: (y * 100)  + '%',
                    left: (x * 100) + '%',
                    height: (height * 100) + '%',
                    width: (width * 100) + '%'
                });
                this.$('.heatmap_correct_answers').append($el);
            }.bind(this));
        }
    });

    WordCloudReport = Backbone.View.extend({
        className: 'wordcloud_report',
        events: {
            'change .cloud_type': 'toggle_type',
            'change .include_common': 'include_common'
        },
        initialize: function (options) {
            this.options = options || {};
            this.previous_buckets = [];
            if (_.isUndefined(this.options.cloud_type)) {
                this.options.cloud_type = WordCloudReport.types.BY_WORD;
            }
            this.options.include_common = false;
            this.listenTo(
                this.options.report, 'change',
                _.throttle(this.set_data, 2000), this);
        },
        toggle_type: function () {
            var val = this.$('.cloud_type:checked').val();
            this.options.cloud_type = parseInt(val, 10);
            if (this.options.cloud_type === WordCloudReport.types.BY_WORD) {
                this.$('.include_common').removeAttr('disabled');
            } else {
                this.$('.include_common').attr('disabled', 'disabled');
            }
            this.set_data(true);
        },
        include_common: function () {
            var val = this.$('.include_common').is(':checked');
            this.options.include_common = val;
            this.set_data(true);
        },
        set_data: function (force) {
            var current_data, bucket_list, total_count,
                get_word_frequency, word_list, result;
            current_data = this.options.report.current_data();
            bucket_list = this.options.report.generate_bucket_list(
                this.options.model, this.options.report.get('current_session'));
            word_list = _.pluck(bucket_list, '1');

            if (total_count === 0) {
                this.$('svg').hide();
                this.$('.empty_graph').show();
            } else {
                this.$('svg').show();
                this.$('.empty_graph').hide();
            }

            if (this.options.cloud_type === WordCloudReport.types.BY_ANSWER) {
                total_count = _.reduce(bucket_list, function (sum, bucket) {
                    return sum + bucket[0];
                }, 0);
                get_word_frequency = function (word) {
                    var result, bucket;
                    result = {text: word, size: 0};
                    bucket = _.find(bucket_list, function (bucket) {
                        return bucket[1] === word;
                    });
                    if (!_.isUndefined(bucket)) {
                        result.size = Math.min(
                            20, bucket[0] * 20 / Math.sqrt(total_count));
                    }
                    return result;
                };
            } else {
                // BY_WORD
                var common_words = (
                    'the be to of and a in that have i it for not on with ' +
                    'he as you do at').split(' ');
                var total_words = word_list.join(' ').split(' ');
                var frequencies = _.reduce(total_words, function (counts,key) {
                    if (
                        common_words.indexOf(key.toLowerCase()) === -1 ||
                        this.options.include_common
                    ) {
                        counts[key] = counts[key] + 1 || 1;
                    }
                    return counts;
                }.bind(this), {});
                word_list = _.keys(frequencies);
                total_count = _.reduce(
                    _.values(frequencies), function (total, val) {
                        return total += val;
                    }, 0);

                get_word_frequency = function (word) {
                    var size = frequencies[word] * 20 / Math.sqrt(total_count);
                    return {
                        text: word,
                        size: Math.min(20, size)
                    };
                };
            }
            // if nothing has changed, there's no need to do anything
            if (_.isEqual(bucket_list, this.previous_buckets) && !force) {
                return;
            }
            result = word_list.map(get_word_frequency);
            this.cloud.words(result).start();
            this.previous_buckets = bucket_list;
        },
        draw_cloud: function (data, bounds) {
            var scale, words, text,
                exitGroup, exitGroupNode, fill, w, h, center;
            w = this.w;
            h = this.h;
            fill = this.fill;
            var wi = bounds[1].x - bounds[0].x;
            var hi = bounds[1].y - bounds[0].y;
            scale = bounds ? Math.min(w / wi, h / hi) : 1;
            center = bounds ? [
                (w/2-bounds[0].x)*scale,
                (h/2-bounds[0].y)*scale+h/2-hi/2*scale
            ] : [w/2, h/2];
            words = data;
            text = this.vis.selectAll('text')
                .data(words, function (d) { return d.text; });
            text.transition()
                .attr(
                    'transform',
                    function (d) { return 'translate(' + [d.x, d.y] + ')'; })
                .style('font-size', function (d) { return d.size + 'px'; });
            text.enter().append('text')
                .attr('text-anchor', 'middle')
                .attr(
                    'transform',
                    function (d) { return 'translate(' + [d.x, d.y] + ')'; })
                .style('font-size', function (d) { return d.size + 'px'; })
                .style('opacity', 1e-6)
                .transition()
                .style('opacity', 1);
            text.style('font-family', function (d) { return d.font; })
                .style(
                    'fill',
                    function (d) { return fill(d.text.toLowerCase()); })
                .text(function (d) { return d.text; });
            exitGroup = this.background.append('g')
                .attr('transform', this.vis.attr('transform'));
            exitGroupNode = exitGroup.node();
            text.exit().each(function () {
                exitGroupNode.appendChild(this);
            });
            exitGroup.transition()
                .style('opacity', 1e-6)
                .remove();
            var trans = 'translate(' + center + ')scale(' + scale + ')';
            this.vis.transition()
                .attr('transform', trans);
            window.vis = this.vis;
        },
        render: function () {
            // pass the cid to generate unique id attributes
            // there might be multiple copies of this view for this model
            // so we can't use the model id
            var html = _.template(wordcloud_template, {id: this.cid});
            this.$el.html(html);
            this.fill = d3.scale.category20();

            this.w = 450;
            this.h = 300;
            this.svg = d3.select(this.$('.word_cloud_target')[0]).append('svg');
            this.svg.attr('width', this.w)
                .attr('height', this.h)
                .attr('viewBox', '0 0 450 300')
                .attr('class', 'magnify_scale_pixel')
                .append('g')
                .attr('transform', 'translate(150,150)');

            this.background = this.svg.append('g');
            this.vis = this.svg.append('g').attr(
                'transform', 'translate(' + [this.w / 2, this.h / 2] + ')');

            this.cloud = d3.layout.cloud().size([this.w, this.h])
                .words([])
                .rotate(function () { return 0; })
                .font('Impact')
                .fontSize(function (d) { return d.size; })
                .on('end', this.draw_cloud.bind(this));
            this.set_data();
            this.options.parent.trigger('remagnify');
        }
    });
    WordCloudReport.types = {
        BY_ANSWER: 0,
        BY_WORD: 1
    };

    SessionSelector = Backbone.View.extend({
        template: _.template(sessions_template),
        className: 'sessions',
        initialize: function () {
            this.listenTo(this.model, 'change', this.render, this);
        },
        events: {
            'change select': 'select',
            'click a': 'new_session'
        },
        select: function (e) {
            this.model.set({current_session: $(e.target).val()});
        },
        new_session: function (e) {
            e.preventDefault();
            this.model.add_session();
        },
        render: function () {
            this.$el.html(this.template({
                sessions: this.model.get_filtered_sessions(),
                selected: this.model.get('current_session')
            }));
        }
    });

    ModuleItemReportView = Backbone.View.extend({
        template: _.template(report_template),
        className: 'mi_report',
        defaults: {
            report_types: [
                {
                    className: 'graph active',
                    title: 'Graph',
                    view: GraphReport
                }
            ]
        },
        events: {
            'click .types a': 'set_type'
        },
        initialize: function (options) {
            this.options = options || {};
            this.created_at = new Date();
            this.created_at.setMilliseconds(0);
            this.options.rendered = false;
            this.options.report_types = _.clone(this.defaults.report_types);
            this.options.report_id = (
                this.options.report_id || this.model.get_id());
            this.options.report = reporting.Reports.request(
                this.options.report_id, this);

            this.listenTo(
                this.options.report, 'change:data', this.update_arrivals, this);

            this.session_selector = new SessionSelector({
                model: this.options.report});
            this.active_report = new GraphReport({
                model: this.model,
                report: this.options.report,
                parent: this
            });

            this.listenTo(
                this.active_report, 'render',
                this.render_correct_answers, this);
            this.on('remagnify', this.remagnify, this);
            this.listenTo(
                this.model, 'change:show_answer',
                this.render_correct_answers, this);
            // HACK; Only setup auto sessions if course is defined globally.
            // This is a hack to let us use ModuleItemReport in the new
            // Gradebook SPA.
            if (
                window.course &&
                window.course.get('course_data').get('settings').get(
                    'auto_create_sessions')
            ) {
                // this has to happen here unfortunately.
                if (this.model.previous('status') !== 'uninitialized' &&
                    this.model.previous('status') !== 'active_visible') {
                    this.auto_new_session();
                }
                this.listenTo(
                    this.model, 'change:status', this.auto_new_session, this);
            }
            this.data_arrival = {};
            this.listenTo(this.model, 'change:status', this.log_arrivals, this);
        },
        update_arrivals: function () {
            var data = this.options.report.current_data();
            _.each(data, function (d, username) {
                if (! (username in this.data_arrival)) {
                    this.data_arrival[username] = new Date().toISOString();
                }
            }.bind(this));
        },
        auto_new_session: function () {
            if (this.model.get('status') === 'active_visible') {
                this.options.report.add_session();
            }
        },
        render_correct_answers: function () {
            /* this function needs to die */
            this.$('span.correct_answers').remove();
            this.$('.correct_answers').removeClass('correct_answers');

            if (!this.model.get('show_answer')) {
                return;
            }

            // convert all correct answers to strings
            var correct_answers = this.model.get('correct_answers');
            var all_correct = this.model.get('all_correct');
            correct_answers = _.map(correct_answers, function (answer) {
                // decode any special html chars
                return $('<div/>').html(answer).text();
            });

            if(this.active_report instanceof GraphReport) {
                this.active_report.$('.brRow').each(function () {
                    // get the bucket's value, and remove &nbsp;s
                    var nbsp = new RegExp(String.fromCharCode(160), 'g');
                    var value = $(this).find('.brLabel').text().replace(
                        nbsp, ' ');

                    // determine if bucket value is a correct answer
                    var does_correct_answers_include_value = _.include(_.map(
                        correct_answers, function (str) {
                            return str.replace(ANSWER_REGEX, ANSWER_SEPARATOR);
                        }
                    ), value);
                    var concatenated_correct_answers = (
                        correct_answers.join(', ').replace(
                            ANSWER_REGEX, ANSWER_SEPARATOR));
                    if (
                        does_correct_answers_include_value &&
                        all_correct !== true ||
                        concatenated_correct_answers === value &&
                        all_correct === true
                    ) {
                        $(this).addClass('correct_answers');
                    }
                });
            }

            // Don't show correct answer div for click on target questions
            if (this.model.get('type') !== 'target') {
                // show the correct answer if required (might be better as
                // individual report render fn)
                var correct_answer_string = correct_answers.join(', ');
                correct_answer_string = _.escape(correct_answer_string);
                correct_answer_string = correct_answer_string.replace(
                    ANSWER_REGEX, ANSWER_SEPARATOR);
                var html = (
                    '<span class="correct_answers">Correct Answer: <b>' +
                    correct_answer_string +
                    '</span>');
                this.$('#correct_answer_container').html(html);
                mathjax.execute_mathjax(this.$('#correct_answer_container')[0]);
            }
        },
        remagnify: function () {
            if (this.options.panel) {
                this.options.panel.trigger('redo_magnify');
            }
        },
        remove: function () {
            reporting.Reports.release(this.options.report_id, this);
            this.session_selector.remove();
            Backbone.View.prototype.remove.call(this);
        },
        log_arrivals: function () {
            var last_activated = new Date(this.model.get('last_activated_at')),
                was_active_visible = (
                    this.model.previous('status') === 'active_visible'),
                dt = last_activated - this.created_at,
                dt_tolerance = -2000; // accounts for slow question fetch (hack)

            if (
                window.user.get('role') === 'teacher' &&
                dt >= dt_tolerance &&
                was_active_visible
            ) {
                $.ajax({
                    url: '/api/v2/report_update/',
                    type: 'POST',
                    dataType: 'json',
                    contentType: 'application/json',
                    data: JSON.stringify({
                        item_id: this.model.get('id'),
                        data: this.data_arrival,
                        now: new Date().toISOString()
                    })
                });
            }
        },
        set_type_with_el: function (link) {
            var report_type;
            if (link.hasClass('active')) { return; }
            this.$('.types a.active').removeClass('active');
            link.addClass('active');
            // get the report type and add it to the report area
            report_type = _.findWhere(
                this.options.report_types, {title: link.text()});
            this.active_report.remove();
            this.active_report = new report_type.view({
                model: this.options.model,
                report: this.options.report,
                confirmed: this.options.confirmed,
                parent: this
            });
            this.$('.report').append(this.active_report.el);
            this.active_report.render();
            this.remagnify();
            if (
                Browser.is_presentation_tool() &&
                window.user.get('role') === 'teacher'
            ) {
                if (window.quickadd_view) {
                    window.quickadd_view.maximize_text();
                }
            }
        },
        set_type: function (e) {
            e.preventDefault();
            e.stopPropagation();
            this.set_type_with_el($(e.target));
        },
        set_type_by_name: function (name) {
            /**
             * Sets the report type by name.
             * @method set_type_by_name
             * @param {String} name One of the names available in
             * options.report_types.
             */
            var $link = this.$('.types .' + name);
            this.set_type_with_el($link);
        },
        add_custom_types: function () {
            // add the custom  report types
            // must be called AFTER get_required_attributes

            // push these to all types if not anonymous
            if (this.options.model.get('is_anonymous') !== true) {
                this.options.report_types.push({
                    className: 'table-report',
                    title: 'Table',
                    view: TableReport
                });
            }

            switch (this.options.model.get('type')) {
            case 'na':
                this.options.report_types.push({
                    className: 'numeric',
                    title: 'Numeric',
                    view: NumericReport
                });
                break;
            case 'target':
                this.options.report_types.push({
                    className: 'heatmap',
                    title: 'Heat Map',
                    view: HeatMapReport
                });
                break;
            case 'wa':
                this.options.report_types.push({
                    className: 'wordcloud',
                    title: 'Word Cloud',
                    view: WordCloudReport
                });
                break;
            }

            // push these to all types if not anonymous
            if (this.options.model.get('is_anonymous') !== true) {
                this.options.report_types.push({
                    className: 'side_by_side',
                    title: 'Compare Sessions',
                    view: CompareSessionsReport
                });
                this.options.report_types.push({
                    className: 'compare',
                    title: 'Compare Questions',
                    view: CompareQuestionsReport
                });
            }
        },
        render: function () {
            if (this.options.rendered) { return; }
            this.options.rendered = true;
            this.add_custom_types();
            this.$el.html(this.template({
                types: this.options.report_types
            }));
            this.$('.sessions_container').append(this.session_selector.el);
            this.session_selector.render();
            this.$('.report').append(this.active_report.el);
            this.active_report.render();
       }
    });

    return ModuleItemReportView;
});
