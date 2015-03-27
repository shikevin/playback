/*globals define, _, Marionette, Daedalus*/
define([
    // 'underscore',
    // 'marionette',
    'text!templates/course_list_item.html',
    'text!templates/registration/course_list_table.html',
    // 'models/User',
    'models/CourseMembership'
], function (html, course_table_html, CourseMembership) {
    'use strict';
    var CourseListItemView = Backbone.Marionette.ItemView.extend({
        tagName: 'tr',
        template: _.template(html),
        events: {
            //'click .enter_course button': 'enroll'
            'click': 'enroll'
        },
        serializeData: function () {
            var data = this.model.toJSON();
            data.enrolled = false; // _.contains(User.get('courses'), data.resource_uri);
            if (!data.non_paid) {
                data.requirements.push({
                    description: 'Top Hat Subscription'
                });
            }
            return data;
        },
        showError: function (error) {
            if (!_.isUndefined($.fn.SimpleModal)) {
                var modal = $.fn.SimpleModal({
                    btn_ok: 'Close',
                    hideHeader: true,
                    contents: error,
                    closeButton: false
                });
                modal.showModal();
            } else {
                window.alert(error);
            }
        },
        enroll: function (e) {
            e.preventDefault();
            // attempt to create a coursemembership between the current user and this course
            var membership = new CourseMembership({
                course: this.model
            });
            membership.save({}, {
                success: function () {
                    Daedalus.track('enrolled in course', {'courseName': this.model.get('course_name'), 'courseCode': this.model.get('course_code')});
                    window.location.href = this.model.public_url();
                }.bind(this),
                error: function (model, response, options) {
                    var status = options.xhr.status;
                    if (status === 402) {
                        Daedalus.track('enrolled in paid course', {'courseName': this.model.get('course_name'), 'courseCode': this.model.get('course_code')});
                        if (options.xhr.responseText === 'inventory') {
                            window.location.href = this.model.inventory_url();
                        } else {
                            window.location.href = this.model.subscription_url();
                        }
                    } else if (status === 463) {
                        this.showError('This course has reached its user limit.  Please contact your instructor for details.');
                        Daedalus.track('freemium limit reached', {'courseName': this.model.get('course_name'), 'courseCode': this.model.get('course_code')});
                    } else if (status === 409) {
                        // is this correct?
                        Daedalus.track('enrolled in freemium course', {'courseName': this.model.get('course_name'), 'courseCode': this.model.get('course_code')});
                        window.location.href = this.model.public_url();
                    } else {
                        this.showError('Error ' + status + ': ' + response);
                    }
                }.bind(this)
            });
        }
    });

    var CourseListEmptyView = Backbone.View.extend({
        tagName: 'tr',
        template: _.template('<td colspan="5"><p class="center">No results</p></td>'),
        render: function () {
            this.$el.html(this.template());
        }
    });

    var CourseSearchResultsView = Backbone.Marionette.CompositeView.extend({
        className: 'course_search_results search-result-listing',
        template: _.template(course_table_html),
        itemViewContainer: 'tbody',
        itemView: CourseListItemView,
        emptyView: CourseListEmptyView,
        events: {
            'mouseover tr': 'hover'
        },
        hover: function (e) {
            this.$('.pseudo-hover').removeClass('pseudo-hover');
            $(e.target).closest('tr').addClass('pseudo-hover');
        }
    });

    return CourseSearchResultsView;
});
