/*globals define, Backbone, _*/
define([
    'views/course/CourseSearchResults',
    'text!templates/course/course_search.html',
    'util/accessibility'
], function (
    CourseSearchResultsView,
    html,
    Accessibility
) {
    'use strict';
    var CourseSearchPageView = Backbone.View.extend({
        className: 'course_search_page',
        template: _.template(html),
        events: {
            'submit form[name=course_search]': 'do_search',
            'click #submit': 'do_search',
            'keyup #search_field': 'do_search',
            'click #add_course': 'go_home'
        },
        initialize: function (options) {
            this.options = options || {};
            this.course_results_view = new CourseSearchResultsView({
                collection: this.options.collection
            });
        },
        render: function () {
            this.$el.html(this.template());
            this.course_results_view.render();
            this.$('.results').append(this.course_results_view.el);
            this.$('input[name=search_terms]').focus();
        },
        do_search: function (e) {
            e.preventDefault();
            // If the input is over 3 chars long, this will fetch everytime input is updated
            // It will also get called if it was triggered by clicking the search button
            if (this.$('input[name=search_terms]').val().length > 3 || e.type === 'click') {
                // 'active' class is used to add/remove a spinner
                this.$('input').addClass('active');
                this.collection.fetch({
                    data: {
                        query: this.$('input[name=search_terms]').val()
                    },
                    success: function () {
                        this.$('input').removeClass('active');
                        //Add aria describedby to enroll buttons
                        $('tbody').children().each( function(index) {
                            var uniqueid = 'course-name-' + index;
                            $(this).find('.course-name').attr('id', uniqueid);
                            $(this).find('button').attr('aria-describedby', uniqueid);
                        });
                        //Alert user of results returned
                        Accessibility.SR_alert( this.options.collection.length +  ' Results found.' );
                    }.bind(this)
                });

            }
        },
        go_home: function (e) {
            e.preventDefault();
            window.contentRouter.navigate('', {trigger: true});
        },
        display_callback: function() {
            $('#sidebar').prependTo(this.$el);
        }
    });
    return CourseSearchPageView;
});
