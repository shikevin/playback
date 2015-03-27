/* globals Raven, mixpanel, _ */
/*
 * Daedalus is a wrapper around analytics.js that we use to send events
 * to Mixpanel or whatever other metric service we are using.
 * The wrapper makes sure that should we decide to drop analytics.js we
 * still have an agnostic way of calling events without changing a lot of code
 */

define([
    'util/Dashboard',
    'util/Browser',
    'util/DisplayEvent'
], function (
    Dashboard,
    Browser
) {
    'use strict';
    var Daedalus = function () {
        try {
            this.id = 'daedalus';
            this.test_mode = window.site_data.settings.DAEDALUS_DEBUG_MODE;
            this.student_submission_threshold = 10;
        } catch (e) {
            this._capture_exception(e);
        }
    };

    Daedalus.prototype._capture_exception = function (e) {
        if (typeof Raven === 'undefined') {
            return;
        }

        Raven.captureException(e);
    };

    Daedalus.prototype._get_default_properties = function () {
        try {
            if (!window.user_data) {
                this._debug_log('Skipping Daedalus._get_default_properties for lack of window.user_data');
                return {};
            }

            var defaults = {};

            defaults.isPresentationTool = Browser.is_presentation_tool() || false;
            defaults.isMobile = Browser.is_mobile() || false;

            if (window.course) {
                defaults.studentsOnline = window.course.get('num_online') || 0;
            }

            defaults.role = window.user_data.role || 'teacher';
            defaults.isAnon = window.user_data.is_anonymous_account || false;

            return defaults;
        } catch (e) {
            this._capture_exception(e);
        }
    };

    Daedalus.prototype._debug_log = function (msg) {
        if (!this.test_mode) {
            return;
        }

        // Console logging can be added here.
    };

    Daedalus.prototype.identify = function (user_data) {
        try {
            if (typeof window.mixpanel === 'undefined') {
                this._debug_log('Skipping Daedalus.identify for lack of window.mixpanel');
                return;
            }
            if (!user_data) {
                this._debug_log('Skipping Daedalus.identify for lack of user_data parameter');
                return;
            }
            var is_anon = window.user_data.is_anonymous_account;
            var the_name = '';
            if (is_anon) {
                the_name = 'Anonymous student';
            } else {
                the_name = window.user_data.first_name + ' ' + window.user_data.last_name;
            }
            if (!this.test_mode) {
                mixpanel.identify(window.user_data.id);
                mixpanel.people.set({
                    '$distinct_id': window.user_data.id,
                    '$email': window.user_data.email,
                    '$username': window.user_data.alias,
                    'orgName': window.user_data.org.orgname,
                    '$name': the_name,
                    'createdAt': new Date(window.user_data.created_date),
                    'role': window.user_data.role,
                    'isAnon': window.user_data.is_anonymous_account,
                    'isFreemium': window.user_data.freemium
                });
            }
        } catch (e) {
            this._capture_exception(e);
        }
    };

    Daedalus.prototype.identify_with_user = function (user) {
        try {
            if (!user) {
                this._debug_log('Skipping Daedalus.identify_with_user for lack of user parameter');
                return;
            }

            var the_name = user.prettyName();
            var user_id = user.id.split('/')[4];
            var username = user.get('username');
            var role = user.get('role');
            var email = user.get('email');

            if (!this.test_mode) {
                mixpanel.people.set({
                    '$email': email,
                    '$username': username,
                    '$name': the_name,
                    'role': role,
                    '$created': new Date(),
                    'newSignupFlow': true
                });
                mixpanel.alias(user_id);
            }
        } catch (e) {
            this._capture_exception(e);
        }
    };

    Daedalus.prototype.initialize = function (token) {
        try {
            if (typeof window.mixpanel === 'undefined') {
                this._debug_log('Skipping Daedalus.initialize for lack of window.mixpanel');
                return;
            }
            mixpanel.init(token);
        } catch (e) {
            this._capture_exception(e);
        }
    };

    Daedalus.prototype.track = function (eventName, properties, async) {
        this._debug_log('Daedalus.track("' + eventName + '", ' + JSON.stringify(properties) + ', ' + async + ')');

        if (!this.test_mode && _.isObject(window.user) && window.user.get('is_staff')) {
            return;
        }

        try {
            if (!eventName) {
                this._debug_log('Skipping Daedalus.track for lack of eventName parameter');
                return;
            }
            if (typeof properties === 'undefined') { properties = {} ;}
            _.extend(properties, this._get_default_properties());
            if (!this.test_mode) {
                if (typeof window.mixpanel !== 'undefined') {
                    mixpanel.track(eventName, properties);
                } else {
                    this._debug_log('Skipping logging to Mixpanel in Daedalus.track for lack of window.mixpanel');
                }
            }
        } catch (e) {
            this._capture_exception(e);
        }

        async = typeof async !== 'undefined' ? async : true;
        Dashboard.event(eventName, properties, async);
    };

    Daedalus.prototype.set_property = function (property_name, value) {
        try {
            if (!property_name) {
                this._debug_log('Skipping Daedalus.set_property for lack of property_name parameter');
                return;
            }
            if (!value) {
                this._debug_log('Skipping Daedalus.set_property for lack of value parameter');
                return;
            }
            if (!window.mixpanel || !window.mixpanel.people) {
                this._debug_log('Skipping Daedalus.set_property for lack of window.mixpanel or window.mixpanel.people');
                return;
            }
            if (!this.test_mode) {
                var elements = {};
                elements[property_name] = value;
                mixpanel.people.set(elements);
            }
        } catch (e) {
            this._capture_exception(e);
        }

    };

    Daedalus.prototype.increment = function (property, amount) {
        try {
            if (typeof window.mixpanel === 'undefined') {
                this._debug_log('Skipping Daedalus.increment for lack of window.mixpanel');
                return;
            }
            if (typeof window.mixpanel.people === 'undefined') {
                this._debug_log('Skipping Daedalus.increment for lack of window.mixpanel.people');
                return;
            }
            if (!property) {
                this._debug_log('Skipping Daedalus.increment for lack of property parameter');
                return;
            }
            if (typeof amount === 'undefined') {
                amount = 1;
            }
            if (!this.test_mode) {
                mixpanel.people.increment(property, amount);
            }
        } catch (e) {
            this._capture_exception(e);
        }
    };

    // This is one of our KPIs
    Daedalus.prototype.track_student_submission = function (num_submissions, questionType) {
        try {
            if (!num_submissions) {
                this._debug_log('Skipping Daedalus.track_student_submission for lack of num_submissions parameter');
                return;
            }

            questionType = questionType || false;
            var eventName = 'students answered question';

            if (num_submissions === this.student_submission_threshold ) {
                if (this.test_mode ) {
                    // logging?
                } else {
                    this.track(eventName, {'questionType': questionType});

                    this.increment('numKPI');
                    this.set_property('lastKPI', new Date());
                }
            }
        } catch (e) {
            this._capture_exception(e);
        }
    };

    Daedalus.prototype.track_checkout_start = function (product_slug) {
        try {
            if (!product_slug) {
                this._debug_log(
                    'Skipping Daedalus.track_checkout_start for lack of ' +
                    'product_slug parameter'
                );
                return;
            }
            var product_name = '';
            if (product_slug === 'four_months') {
                product_name = 'semester';
            } else if (product_slug === 'student_lifetime') {
                product_name = 'lifetime';
            } else if (product_slug === 'prepaid') {
                product_name = 'prepaid';
            } else {
                product_name = 'unknown';
            }
            var eventName = 'checkout start';
            var properties = {
                productName: product_name
            };
            if (!this.test_mode) {
                this.track(eventName, properties);
                this.set_property('planName',product_name);
            }
        } catch (e) {
            this._capture_exception(e);
        }
    };

    Daedalus.prototype.track_revenue = function (amount) {
        try {
            if (!amount) {
                this._debug_log('Skipping Daedalus.track_revenue for lack of amount parameter');
                return;
            }
            if (typeof window.mixpanel === 'undefined') {
                this._debug_log('Skipping Daedalus.track_revenue for lack of window.mixpanel');
                return;
            }
            if (!this.test_mode) {
                mixpanel.people.track_charge(amount);
            }
        } catch (e) {
            this._capture_exception(e);
        }
    };

    Daedalus.prototype.track_mi_status = function (module_item, status) {
        try {
            if (!module_item) {
                this._debug_log('Skipping Daedalus.track_mi_status for lack of module_item parameter');
                return;
            }
            if (!status) {
                this._debug_log('Skipping Daedalus.track_mi_status for lack of status parameter');
                return;
            }
            var properties = {
                moduleItemId: module_item.get('id'),
                questionType: module_item.get('type')
            };
            var module_name = module_item.get('module');
            var event_name = module_name + ' status ' + status;
            this.track(event_name, properties);
            // increment the property
            var inc_property_name = [
                '',
                'num',
                capitalise_first_letter(module_name),
                capitalise_first_letter(status)
            ].join('');
            this.increment(inc_property_name);
            // set last property
            var last_at_property_name = ['',
                'last',
                capitalise_first_letter(module_name),
                capitalise_first_letter(status)
            ].join('');
            this.set_property(last_at_property_name, new Date());
        } catch (e) {
            this._capture_exception(e);
        }
    };

    function capitalise_first_letter (string) {
        try {
            return string.charAt(0).toUpperCase() + string.slice(1);
        } catch (e) {
            this._capture_exception(e);
        }
    }

    window.Daedalus = new Daedalus();
    return window.Daedalus;
});
