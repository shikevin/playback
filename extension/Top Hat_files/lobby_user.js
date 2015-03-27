/*globals Backbone, _*/
define([
    'underscore'
], function (_) {
    'use strict';

    var Error = function(message) {
        this.message = message;
    };
    _.extend(Error.prototype, {
        // Put class methods here.
    });

    var User = Backbone.Model.extend({
        idAttribute: 'resource_uri',
        urlRoot: '/api/v2/user/',
        name: function() {
            var result = this.get('first_name') + ' ' + this.get('last_name');
            if(result.length === 1) {
                result = this.get('username');
            }
            return result;
        },
        has_perm: function(action, options) {
            /*
            This function returns true if the user has the permission,
            and false if they do not.  It takes an optional options hash, if
            the action is not allowed, the 'denied' callback is called, if it is
            allowed, the 'permitted' callback is called
            */
            var pass = (
                this.has('permissions') &&
                _.has(this.get('permissions'), action) &&
                this.get('permissions')[action] === true
            );

            if (!_.isUndefined(options)) {
                if (pass) {
                    if ('permitted' in options && _.isFunction(options.permitted)) {
                        options.permitted.call(undefined);
                    }
                } else {
                    if ('denied' in options && _.isFunction(options.denied)) {
                        options.denied.call(undefined);
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
    return User;
});
