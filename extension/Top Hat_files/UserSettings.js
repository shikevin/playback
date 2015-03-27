/* global _ */
define([
], function (
) {
    'use strict';

    var UserSettings = {
        _values: {},
        get: function (setting_keys, callback, defaults) {
            var uncached_settings_keys = [];
            var are_settings_cached = true;
            // Return value of function. Returns #t if all settings are cached
            var compiled_settings = {};
            var values = this._values;
            // The final settings object that eventually gets passed to the callback function
            // Check if settings are stored locally, and compile a list of settings to retrieve from the server
            _.each(setting_keys, function (setting, key) {
                if (!values[setting]) {
                    // Key is not locally stored, add it to query
                    are_settings_cached = false;
                    uncached_settings_keys.push(setting);
                    // Set setting temporarily to default value
                    compiled_settings[setting] = defaults[key];
                } else {
                    // Keep track of cached settings to pass to callback function
                    compiled_settings[setting] = values[setting];
                }
            });

            if (!are_settings_cached) {
                // Request user_settings update from server
                window.publisher.send({
                    module: 'course',
                    command: 'get_user_setting',
                    args: {
                        keys: uncached_settings_keys
                    },
                    success: function (data, args, command_uuid) {
                        _.each(args.settings, function (setting) {
                            compiled_settings[setting.key] = setting.value;
                        });
                        // Call callback with updated settings
                        if (!_.isUndefined(callback)) {
                            callback(compiled_settings);
                        }
                    }
                });
            } else if (!_.isUndefined(callback)) {
                callback(compiled_settings);
            }
            return are_settings_cached;
        },

        set: function (new_settings, callback) {
            var settings_modified = false;
            var values = this._values;
            // Compare new values against cached values, and cache new values locally
            _.each(new_settings, function (setting, key) {
                if (setting !== values[key]) {
                    values[key] = setting;
                    settings_modified = true;
                }
            });

            // Send new settings to server if any have been changed
            if (settings_modified) {
                window.publisher.send({
                    module: 'course',
                    command: 'set_user_setting',
                    args: {
                        settings: new_settings
                    }
                });
            }
            return true;
        }
    };

    return UserSettings;
});