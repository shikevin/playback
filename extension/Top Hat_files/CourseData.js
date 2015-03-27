/* global _, Backbone, panels */
define([
    'layouts/edumacation/LayoutCollection',
    'models/CourseMembership',
    'models/Course',
    'models/CourseSettings',
    'models/TreeData',
    'util/Browser'
], function (
    layouts,
    CourseMembership,
    Course,
    CourseSettings,
    TreeData,
    Browser
) {
    'use strict';
    var CourseData = window.HoudiniResource.extend({
        uses_polling: true,
        urlRoot: '/api/v1/course_module/',
        busted: false,
        relations: [
            {
                type: Backbone.HasOne,
                key: 'settings',
                relatedModel: CourseSettings
            },
            {
                type: Backbone.HasMany,
                key: 'trees',
                relatedModel: TreeData
            }
        ],
        course_uri: function () {
            return '/api/v2/courses/' + this.get('id') + '/';
        },
        url: function () {
            // the course module resource allows requests with the public code
            // we can use it when we don't know the id of the course
            var public_code = this.get('public_code');
            if (_.isUndefined(this.id) && !_.isUndefined(public_code)) {
                return this.urlRoot + 'public_code/' + public_code + '/';
            } else {
                return window.HoudiniResource.prototype.url.apply(this);
            }
        },
        fetch: function (options) {
            options = options ? _.clone(options) : {};
            if (!options.data) {
                options.data = {};
            }
            options.data.unitree = true;

            window.oldSuccess = options.success;
            if (this.busted) {
                return;
            }
            options.error = function (model, response, options) {
                var status = options.xhr.status;
                if (model.busted) {
                    return;
                }
                var cd = model;
                var panel;
                var http_response_codes = {
                    NOT_ENROLLED: 460,
                    PAYMENT_REQUIRED: 402,
                    COURSE_UNAVAILABLE: 465,
                    NOT_FOUND: 404,
                    INVITE_REQUIRED: 466,
                    PASSWORD_REQUIRED: 467,
                    COURSE_FULL: 463
                };

                clearInterval(model.polling_timeout);
                if (status === http_response_codes.NOT_ENROLLED) {
                    var c = new Course({public_code: model.get('public_code')});
                    model.busted = true;
                    c.fetch({data: {
                        public_code: model.get('public_code')
                    }}).done(function () {
                        panel = panels.get('enroll_dialog') || panels.add({
                            id: 'enroll_dialog',
                            layout: layouts.get('dialog'),
                            title: 'Enroll in Course',
                            body: 'You are about to enroll in : <b>' + c.get('course_name') + '</b><br />' + c.get('orgname'),
                            footer_buttons: {
                                Enroll: {
                                    bt_class: 'affirmative',
                                    callback: function () {
                                        var membership = new CourseMembership({course: c.get('resource_uri')});
                                        membership.save().done(function () {
                                            HoudiniResource.prototype.fetch.call(cd, {
                                                data: options.data,
                                                success: function (model, response, options) {
                                                    window.enrolled_courses.add(c);
                                                    panels.get('enroll_dialog').remove();
                                                    if (!_.isUndefined(window.oldSuccess)) {
                                                        window.oldSuccess(model, response, options);
                                                    }
                                                    if (window.is_mobile) {
                                                        window.location.reload();
                                                    }
                                                },
                                                error: function () {
                                                    window.location.reload();
                                                }
                                            });
                                            c.set({enrolled: true});
                                            if (Browser.is_web()) {
                                                window.enrolled_courses.add(c);
                                            }
                                        }).fail(function (xhr) {
                                            if (xhr.status === http_response_codes.COURSE_FULL) {
                                                panel.set({
                                                    title: 'Course full',
                                                    body: 'This course has reached its free user limit.  Please contact your instructor for details.',
                                                    footer_buttons: {
                                                        Okay: function () {
                                                            window.location.href = '/e';
                                                        }
                                                    }
                                                });
                                                window.Daedalus.track('freemium limit reached', {course_id: model.id});
                                            }
                                        });
                                    }
                                },
                                Cancel: function () {
                                    panels.get('enroll_dialog').remove();
                                    window.contentRouter.navigate('');
                                }
                            }
                        });
                    });
                } else if (status === http_response_codes.PAYMENT_REQUIRED) {
                    // payment required
                    if (options.xhr.responseText === 'subscription') {
                        model.busted = true;
                        panel = panels.get('subscription_required') || panels.add({
                            id: 'subscription_required',
                            layout: layouts.get('dialog'),
                            title: 'Top Hat Subscription required',
                            body: 'A valid Top Hat subscription is required to enter this course.',
                            footer_buttons: {
                                'Buy Subscription': {
                                    bt_class: 'affirmative',
                                    callback: function () {
                                        // oh god this is awful
                                        window.location.href = '/buy/subscription/' + window.site_data.settings.COURSE_PUBLIC_CODE;
                                    }
                                },
                                Cancel: function () {
                                    panel.remove();
                                    window.contentRouter.navigate('', {trigger: true});
                                }
                            }
                        });
                    } else {
                        model.busted = true;
                        panel = panels.get('payment_required') || panels.add({
                            id: 'payment_required',
                            layout: layouts.get('dialog'),
                            title: 'Course requirements not met',
                            body: 'This course requires additional materials to be purchased.',
                            footer_buttons: {
                                'Buy Requirements': {
                                    bt_class: 'affirmative',
                                    callback: function () {
                                        // oh god this is awful
                                        window.location.href = '/buy/checkout/' + window.site_data.settings.COURSE_PUBLIC_CODE;
                                    }
                                },
                                Cancel: function () {
                                    panel.remove();
                                    window.contentRouter.navigate('');
                                }
                            }
                        });
                    }
                } else if (status === http_response_codes.COURSE_UNAVAILABLE || status === http_response_codes.NOT_FOUND) {
                    // course unavailable
                    var text = 'This course is not available.';
                    if (options.xhr.responseText.length > 0) {
                        text = options.xhr.responseText;
                    }
                    panel = panels.get('course_unavailable') || panels.add({
                        id: 'course_unavailable',
                        layout: layouts.get('dialog'),
                        title: 'Course unavailable',
                        body: text,
                        footer_buttons: {
                            OK: function () {
                                panel.remove();
                                window.location = window.site_data.settings.BASE_URL;
                            }
                        }
                    });
                } else if (status === http_response_codes.INVITE_REQUIRED) {
                    // invite required
                    panel = panels.get('invite_required') || panels.add({
                        id: 'invite_required',
                        layout: layouts.get('dialog'),
                        title: 'Invite Required',
                        body: 'An invitation is required in order to enter this course. Your instructor should invite you with the Student Manager tool.',
                        footer_buttons: {
                            OK: function () {
                                panel.remove();
                                window.location = window.site_data.settings.BASE_URL;
                            }
                        }
                    });
                } else if (status === http_response_codes.PASSWORD_REQUIRED) {
                    window.course.prompt_password(cd, options, window.oldSuccess);
                }
            };
            HoudiniResource.prototype.fetch.call(this, options);
        },
        initialize: function () {
            /**
             * Provides access to the Course model as well as general course
             * information like settings, trees, etc.
             * @class CourseData
             * @constructor
             */
            window.HoudiniResource.prototype.initialize.call(this);
            this.on('sync', this._on_course_sync_once, this);
            this.get('trees').on('add', function (tree_data) {
                var module_id = tree_data.get('module_id');
                var module = require('Modules').get_module(module_id);
                if (_.isUndefined(module)) {
                    // a module is active that doesn't exist
                    return;
                }
                module.set({tree_data: tree_data});
                module.listenTo(tree_data, 'change:data', module.update_data, module);
                module.update_data(tree_data);
            });
        },

        _on_course_sync_once: _.once(function () {
            var course_id = this.get('id');
            window.ajax_headers['course-id'] = course_id;
            window.update_ajax_headers();
            require('models/course/module_item/Activation').set({id: course_id});
        })
    });
    return CourseData;
});
