/*global define, Backbone, _ */
define([
    // Collections.
    'collections/Courses',
    'text!templates/inst_admin/announcement_edit.html',
    'jquery.validate',
    'jquery.serializeJSON',
    'bootstrap-button'
], function (Courses, html) {
    'use strict';
    var MAX_LENGTH_ANNOUNCEMENT = 140;
    var AnnouncementView = Backbone.View.extend({
        template: _.template(html),
        events: {
            'submit form.form-announcements-edit': 'on_create_announcement',
            'keypress .form-group': 'update_comment_text_length',
            'keyup .form-group': 'update_comment_text_length',
            'blur .form-group': 'update_comment_text_length'
        },
        initialize: function(options) {
            this.courses = new Courses();
            this.course_resource_uri = undefined;

            // Often these properties of options will be undefined
            //  in which case, the properties inside the object will also be undefined
            if (typeof options !== 'undefined') {
                this.on_save_success = options.on_save_success;
                this.on_save_error = options.on_save_error;
                this.on_fetch_courses_error = options.on_fetch_courses_error;
                this.course_resource_uri = options.course_resource_uri;
            }

            // Re-render view on courses fetch success.
            this.listenTo( this.courses, 'reset', this.render, this );
            this.courses.fetch({
                data: {
                    available: true
                },
                reset: true,
                success: function(collection, response, options) {
                }.bind(this),
                error: function(collection, xhr, options) {
                    // Call courses fetch error callback.
                    if (_.isFunction(this.on_fetch_courses_error)) {
                        this.on_fetch_courses_error();
                    }
                }.bind(this)
            });

        },
        render: function () {
            var data = {
                content: this.model.get('content'),
                course_list: this.courses.toJSON(),
                // Sometimes this will be undefined
                course_resource_uri: this.course_resource_uri,
                loaded: Boolean(this.courses.length)
            };
            window.user.has_perm('add_announcement_org', {
                permitted: function() {
                    _.extend(data, { can_select_all_courses: true });
                }.bind(this),
                denied: function() {
                    _.extend(data, { can_select_all_courses: false });
                }.bind(this)
            });

            this.$el.empty().append(this.template(data));
            if (!data.loaded) {
                return;
            }

            // If course provided, set value of course select and hide it.
            if (!_.isUndefined(this.course_resource_uri)) {

                this.$('select[name="course"]').val(this.course_resource_uri);
                this.$('select[name="course"]').parent('.form-group').hide();
            }
            // Bind validation to form.
            this.validator = this.setValidator();

        },
        setValidator: function() {
            var ret = this.$('.form-announcements-edit').validate({
                // jquery.validation ignores elements that match ':hidden' selector.
                // Select2 adds 'display:none;' to the actual select, and thus the jquery.validation plugin ignores it.
                // Tell the validator not to ignore hidden items.
                ignore: null,
                onkeyup: false,
                errorElement: 'span',
                errorClass: 'help-block',
                highlight: function(element) {
                    $(element).parents().closest('div.form-group')
                        .addClass('has-error');
                },
                unhighlight: function(element) {
                    $(element).parents().closest('div.form-group')
                        .removeClass('has-error');
                },
                errorPlacement: function(error, element) {
                    if (element.attr('type') === 'checkbox' ||
                        element.attr('type') === 'radio') {
                        error.insertAfter(element.parent('label'));
                    }
                    else {
                        error.insertAfter(element);
                    }
                },
                rules: {
                    user_level: {
                        required: true
                    },
                    course: {
                        required: true
                    },
                    content: {
                        required: true,
                        maxlength: 140  // 160 char. limit for SMS; save 20 for the prof name.
                    }
                },
                messages: {
                    user_level: {
                        required: 'Please select a user group.'
                    },
                    course: {
                        required: 'Please select course(s).'
                    },
                    content: {
                        required: 'Please enter a message.'
                    }
                }
            });
            return ret;
        },
        update_comment_text_length: function (e) {
            if (e.keyCode === $.ui.keyCode.ENTER) {
              return false;
            }

            var text_area = $(e.target);
            var remaining = this.$('label[for=\'content\']');
            var current_comment_length = text_area.val().length;
            var remaining_chars = MAX_LENGTH_ANNOUNCEMENT - current_comment_length;
            var comment_exceeding_maximum = current_comment_length > MAX_LENGTH_ANNOUNCEMENT;

            if (comment_exceeding_maximum) {
                var how_much_longer_than_sms = current_comment_length - MAX_LENGTH_ANNOUNCEMENT;
                e.preventDefault();
                remaining.addClass('text-danger');
                remaining.html('Remaining Characters: Message too long by: ' + how_much_longer_than_sms + ' characters for SMS');
            } else {
                remaining.html('Remaining Characters: ' + remaining_chars);
                remaining.removeClass('text-danger');
            }

        },
        on_create_announcement: function(e) {
            e.preventDefault();

            // Set button loading state.
            this.$('.form-announcements-edit button').button('loading');

            // Convert HTML form into JavaScript object.
            var data = this.$('.form-announcements-edit').serializeJSON();
            // This view's model API endpoint expects `organization` OR
            // `course` in request payload.
            if (data.course === 'all') {
                data.organization = window.user_data.org;
                data.course = null;
            }
            else {
                data.organization = null;
            }

            this.model.save(data, {
                success: function (model, response, options) {
                    // Call announcement save success callback.
                    this.on_save_success();
                    // Reset button loading state.
                    this.$('.form-announcements-edit button').button('reset');
                }.bind(this),
                error: function (model, response, options) {
                    if (options.xhr.status === 400) {
                        var errors = JSON.parse(response);
                        this.validator.showErrors(errors);
                    }
                    else {
                        // Call announcement save error callback.
                        this.on_save_error();
                    }
                    // Reset button loading state.
                    this.$('.form-announcements-edit button').button('reset');
                }.bind(this)
            });
        }
    });

    return AnnouncementView;
});
