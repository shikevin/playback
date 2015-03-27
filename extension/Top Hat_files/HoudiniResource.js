/* global Backbone, Houdini */
/*
 * Description:
 * This file contains the implementation of the basic functionality
 * of the Houdini class, which is responsible for:
 *    - Setting up communication with the MQ servers.
 */

window.HoudiniResource =  Backbone.RelationalModel.extend({
    uses_polling: false,
    idAttribute: 'resource_uri',
    initialize: function () {
        'use strict';
        Backbone.RelationalModel.prototype.initialize.call(this);
        var update_fields = function (fields) {
            this.set(fields);
        }.bind(this);

        var on_id_change = function () {
            if (this.id === undefined) {
                return;
            }
            var tokens = this.id.split('/');
            // since URIs are in the form /api/v1/something/324/
            // if we split on "/", we will get tokens like
            // "", "api", "v1", "something", "324", ""
            if (tokens.length < 5) {
                return;
            }
            var name = tokens[3];
            var pk = tokens[4];
            Houdini.on('__houdini_resource_update:'+name+'{'+pk+'}', update_fields);
        }.bind(this);

        this.on('change:resource_uri', on_id_change);
        if (this.id !== undefined) {
            on_id_change();
        }

        // bind all the houdini polling events
        if (this.uses_polling) {
            this.listenTo(Houdini, 'poll', this.fetch, this);
        }
        this.fetch();
        this.on('destroy', function () {
            this.off();
            this.stopListening();
        }, this);
    }
});
