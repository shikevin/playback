/* global _, Backbone */
define([
], function (
) {
    'use strict';

    var Error = function (message) {
        this.message = message;
    };
    _.extend(Error.prototype, {
        // Put class methods here.
    });

    /**
     * This module returns a user model populated with the current user
     * it does NOT give you something suitable for making multiple instances.
     */
    var User = Backbone.Model.extend({
        idAttribute: 'resource_uri',
        urlRoot: '/api/v2/user/',
        defaults: {
            email: null,
            first_name: null,
            last_name: null,
            opted_in: false,
            org: null,
            phone_number: null,
            phone_verified: false,
            student_id: null,
            terms: false,
            username: null
        },
        name: function () {
            var result = this.get('first_name') + ' ' + this.get('last_name');
            if (result.length === 1) {
                result = this.get('username');
            }
            return result;
        },
        initialize: function () {
            // As of jQuery 1.9.0, `""` and `false` are not considered valid
            // JSON. PATCH /api/v2/user/:id/ on success returns 202 `""`. Treat
            // `""` as `null`.
            $.ajaxSetup({
                dataFilter: function (data, type) {
                    if (type === 'json' && data === '') {
                        data = null;
                    }
                    return data;
                }
            });

            if (this.id) {
                this.ajaxSetup();
            }
            this.on('sync', this.ajaxSetup, this);
        },
        ajaxSetup: function () {
            if (!this.id) { return; }
            $.ajaxSetup({
                headers: {
                    'username': this.get('username'),
                    'user-id': this.id.split('/')[4],
                    'org-id': this.has('org') ? this.get('org').split('/')[4] : null,
                    'country-code': this.get('country_code')
                }
            });
        },
        prettyName: function () {
            var fname = this.get('first_name'),
                lname = this.get('last_name'),
                uname = this.get('username');

            if (fname && lname) {
                return fname + ' ' + lname;
            } else if (uname) {
                return uname;
            } else {
                return 'an unnamed user';
            }
        },
        has_perm: function (action, options) {
            var pass = (
                this.has('permissions') &&
                _.has(this.get('permissions'), action) &&
                this.get('permissions')[action] === true
            );

            if (!_.isUndefined(options)) {
                var has_permissions = this.has('permissions'),
                    permissions = this.get('permissions');

                if (has_permissions && !_.has(permissions, action)) {
                    // Action not defined. Deny with error.
                    if (_.has(options, 'denied') && _.isFunction(options.denied)) {
                        options.denied.call(undefined, new Error('An error has occured.'));
                    }
                } else if (has_permissions && _.has(permissions, action) && permissions[action] === true) {
                    // Action permitted.
                    if (_.has(options, 'permitted') && _.isFunction(options.permitted)) {
                        options.permitted.call(undefined);
                    }
                } else {
                    // Action denied.
                    if (_.has(options, 'denied') && _.isFunction(options.denied)) {
                        options.denied.call(undefined, null);
                    }
                }
            }
            return pass;
        },
        is_student: function is_student() {
            return this.get('role') === 'student';
        },
        is_teacher: function is_teacher() {
            return this.get('role') === 'teacher';
        }
    });

    return new User(window.user_data);
});
