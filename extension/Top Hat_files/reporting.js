/* globals _, publisher */
define([
    'HoudiniResource'
], function (
) {
    'use strict';
    var Report = window.HoudiniResource.extend({
        uses_polling: true,
        urlRoot: '/api/v1/reports/',
        defaults: {
            current_session: 'All Data',
            data: []
        },
        get_id: function () {
            return this.id.split('/')[4];
        },
        current_data: function (filters) {
            return this.session_data(this.get('current_session'), filters);
        },
        session_data: function (session, filters) {
            return this.extract_data(this.get('data')[session] || [], filters);
        },
        extract_data: function (data, filters) {
            // Convert map to result set.
            // data={"stevo+studentunverified@tophat.com":{"answer":"Deli meat","verified":false,"username":"stevo+studentunverified@tophat.com"},"stevolazyshark":{"answer":"Spaghetti","verified":true,"username":"stevolazyshark"}}
            // => result_set=[{"answer":"Deli meat","verified":false,"username":"stevo+studentunverified@tophat.com"},{"answer":"Spaghetti","verified":true,"username":"stevolazyshark"}]
            var result_set = [];
            _.each(data, function (properties, username, list) {
                properties.username = username;
                result_set.push(properties);
            });
            if (!_.isUndefined(filters)) {
                result_set = _.where(result_set, filters);
            }
            var data_filtered = {};
            _.each(result_set, function (element, index, list) {
                data_filtered[element.username] = element.answer;
            });
            return data_filtered;
        },
        current_details: function (filters) {
            return this.session_details(this.get('current_session'), filters);
        },
        session_details: function (session, filters) {
            return this.extract_details(this.get('data')[session] || [], filters);
        },
        extract_details: function (data, filters) {
            // Convert map to result set.
            // data={"stevo+studentunverified@tophat.com":{"answer":"Deli meat","verified":false,"username":"stevo+studentunverified@tophat.com"},"stevolazyshark":{"answer":"Spaghetti","verified":true,"username":"stevolazyshark"}}
            // => result_set=[{"answer":"Deli meat","verified":false,"username":"stevo+studentunverified@tophat.com"},{"answer":"Spaghetti","verified":true,"username":"stevolazyshark"}]
            var result_set = [];
            _.each(data, function (properties, username, list) {
                properties.username = username;
                result_set.push(properties);
            });
            // Filter result set.
            if (!_.isUndefined(filters)) {
                result_set = _.where(result_set, filters);
            }
            var data_filtered = {};
            _.each(result_set, function (element, index, list) {
                data_filtered[element.username] = element.answer.detail;
            });
            return data_filtered;
        },
        get_filtered_sessions: function () {
            var filtered_sessions = [];
            var data = this.get('data');
            if (_.isUndefined(data)) {
                return filtered_sessions;
            }
            var sessions = _.keys(data);
            _.each(sessions, function (session, index) {
                // if the session is the first in the list (the 'All Data' session), add it
                // even if it does not contain data; likewise, add the latest (and therefore current)
                // session, as data may still be added to it
                var session_data = data[session];
                if (session === 'All Data' || index === data.length - 1) {
                    filtered_sessions.push(session);
                } else if (session_data && !_.isEmpty(session_data)) {
                    // check to see if any data exists for the session; if so, add it to the filtered list
                    filtered_sessions.push(session);
                }
            }.bind(this));
            // always include the current session
            if (!_.contains(filtered_sessions, this.get('current_session'))) {
                filtered_sessions.push(this.get('current_session'));
            }
            // always show the most recent session
            var max = _.reduce(sessions, function (memo, session) {
                    if (session !== 'All Data') {
                        if (memo === 'All Data' || session > memo) {
                            memo = session;
                        }
                    }
                    return memo;
                }, 'All Data');
            if (!_.contains(filtered_sessions, max)) {
                filtered_sessions.push(max);
            }
            filtered_sessions.sort();
            return filtered_sessions;
        },
        generate_bucket_list: function (item, session, sort_answers) {
            var b_name, value;
            var QuestionItem = require('models/question/question');
            var bucket_list = [];
            var current_data = this.session_data(session);
            var buckets = {};
            // prepopulate the bucket list with the default buckets
            var report_buckets = [], correct_answers = item.get('correct_answers'), is_question = item instanceof QuestionItem;
            var undocumented_special_case = is_question && item.get('type') === 'mc' && item.get('all_correct') === true;
            if (correct_answers.length > 0 && !undocumented_special_case) {
                report_buckets = _.union(this.get('buckets'), item.get('correct_answers'));
            } else {
                report_buckets = this.get('buckets');
            }
            _.each(report_buckets, function (bucket) {
                buckets[bucket] = 0;
            });
            // for case-insensitive WA questions, we want to group answers in the same bucket
            // regardless of case difference
            var is_wa_insensitive = item instanceof QuestionItem && item.get('type') === 'wa' && item.get('case_sensitive') === false;
            var bucket_object_logic = function (bucket) {
                if (!_.isUndefined(bucket.answer) && _.isUndefined(buckets[bucket.answer])) {
                    buckets[bucket.answer] = 0;
                    delete buckets[bucket];
                }
                buckets[bucket.answer] += 1;
            };
            var bucket_case_insensitive_str = function (bucket) {
                if (_.isUndefined(buckets[bucket.toLowerCase()])) {
                    buckets[bucket.toLowerCase()] = 0;
                }
                buckets[bucket.toLowerCase()] += 1;
            };
            var bucket_case_sensitive_str = function (bucket) {
                if (_.isUndefined(buckets[bucket])) {
                    buckets[bucket] = 0;
                }
                buckets[bucket] += 1;
            };
            if (is_wa_insensitive) {
                _.each(current_data, function (bucket) {
                    if (typeof bucket === 'object') {
                        bucket_object_logic(bucket);
                    } else {
                        bucket_case_insensitive_str(bucket);
                    }
                });
            } else {
                // add user data to buckets
                _.each(current_data, function (bucket) {
                    if (typeof bucket === 'object') {
                        bucket_object_logic(bucket);
                    } else {
                        bucket_case_sensitive_str(bucket);
                    }
                });
            }
            // place bucket dictionary in a bucket list; allows for sorting
            _.each(buckets, function (value, name) {
                bucket_list.push([
                    value,
                    name
                ]);
            });
            // in some cases, all the options (names) in an mcq are numbers
            // hence we would like to treat them like numbers and sort by value
            var is_multiple_choice_question = item instanceof QuestionItem && item.get('type') === 'mc';
            var all_values = true;
            if (is_multiple_choice_question) {
                _.each(bucket_list, function (bucket) {
                    if (isNaN(parseFloat(bucket[1]))) {
                        // even a single string value will fail it all
                        all_values = false;
                        return;
                    }
                });
            }
            // Sort buckets
            if (!is_multiple_choice_question) {
                if (sort_answers) {
                    // If it's not a multiple choice question we need to:
                    // a) Sort by bucket count
                    // b) Within each bucket sort alphabetically the answer

                    // Indicides in buckets
                    var SUBMISSIONS = 0,
                        ANSWER = 1;
                    bucket_list.sort(function(bucket_one, bucket_two) {
                        // Attempt a sort by # of submissions first
                        if (bucket_one[SUBMISSIONS] < bucket_two[SUBMISSIONS]) {
                            return 1;
                        } else if (bucket_one[SUBMISSIONS] > bucket_two[SUBMISSIONS]) {
                            return -1;
                        } else {
                            // Otherwise we sort by answer
                            if (bucket_one[ANSWER] < bucket_two[ANSWER]) {
                                return -1;
                            } else if (bucket_one[ANSWER] > bucket_two[ANSWER]) {
                                return 1;
                            }
                        }

                        return 0;
                    });
                } else {
                    bucket_list = _.sortBy(bucket_list, function (bucket) {
                        return bucket[0];
                    });
                }
            } else if (is_multiple_choice_question && all_values) {
                bucket_list = _.sortBy(bucket_list, function (bucket) {
                    return parseFloat(bucket[1]);
                });
            }
            // limit number of buckets shown to 5
            // bucket_list = _.first(bucket_list, 5);
            // ... and ensure that all of the 'report_bucket' buckets are still shown; re-add them if they have been removed
            var detect_bucket = function (bucket) {
                return String(bucket[1]) === String(b_name);
            };
            _.each(report_buckets, function (bucket) {
                b_name = bucket;
                if (!_.detect(bucket_list, detect_bucket)) {
                    value = buckets[bucket];
                    bucket_list.push([
                        value,
                        bucket
                    ]);
                }
            });
            return bucket_list;
        },
        add_session: function () {
            // omg a publisher command
            // this was moved from module_item.js
            // todo: make this restful
            publisher.send({
                module: 'question',
                command: 'add_session',
                args: { 'id': this.get_id() },
                success: $.proxy(function (data, args) {
                    var new_session = args.session;
                    this.set({ current_session: new_session });
                }, this)
            });
        }
    });

    // a single report model might be used by multiple views at once
    // eg. click Answers while question open
    // since it is a backbone relational model, we can only have one
    // USAGE:
    // When you need the report: Reports.request(report_id, context)
    // When you are finished: Reports.release(report_id, context)
    var Reports = {
        _holds: [],
        request: function (id, requester) {
            var uri = Report.prototype.urlRoot + id + '/';
            var report = Report.findOrCreate({ resource_uri: uri });
            Reports._holds.push({
                id: id,
                requester: requester,
                report: report
            });
            return report;
        },
        release: function (id, requester) {
            // indicates that the report is no longer being used
            // if a report is fully released, it will no longer update
            var to_release = _.filter(Reports._holds, function (hold) {
                    return hold.id === id && hold.requester === requester;
                });
            Reports._holds = _.difference(Reports._holds, to_release);
            // check to see if this report is fully released
            _.each(to_release, function (hold) {
                var related_holds = _.where(Reports._holds, { id: hold.id });
                if (related_holds.length === 0) {
                    // there are no more holds for this id
                    hold.report.trigger('destroy', hold.report);
                }
            });
        }
    };

    var Reporting = {
        template: (function () {
            return _.template(
                '<div class="html_bar">' +
                '<% if( label ) { %><span class="label <% if( value >= 100 ) { %>obscured<% } %>"><%= label %></span><% } %>' +
                '<div class="bar" style="width: <%= value %>%"></div>' + '</div>'
            );
        })(),
        html_bar: function (value, label) {
            // return html string
            // value: 0.0 - 1.0
            // label (opn): shown on right side
            // error checking for number
            if (_.isNaN(value) || value < 0) {
                value = 0;
            } else if (value > 1) {
                value = 1;
            }
            return this.template({
                value: Math.min(value * 100, 100),
                label: label
            });
        }
    };

    if ($.fn.dataTableExt) {
        $.fn.dataTableExt.oApi.fnFindCellRowNodes = function (oSettings, sSearch, iColumn) {
            var i, iLen, j, jLen, aOut = [], aData;
            for (i = 0, iLen = oSettings.aoData.length; i < iLen; i++) {
                aData = oSettings.aoData[i]._aData;
                if (_.isUndefined(iColumn)) {
                    for (j = 0, jLen = aData.length; j < jLen; j++) {
                        if (String(aData[j]) === sSearch) {
                            aOut.push(oSettings.aoData[i].nTr);
                        }
                    }
                } else if (String(aData[iColumn]) === sSearch) {
                    aOut.push(oSettings.aoData[i].nTr);
                }
            }
            return aOut;
        };
    }

    return {
        Reports: Reports,
        Reporting: Reporting
    };
});
