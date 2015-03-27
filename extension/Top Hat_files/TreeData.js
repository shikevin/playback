/*globals Backbone, _, diff_match_patch, Raven*/
define([
    'diff_match_patch'
], function (
) {
    'use strict';
    var TreeData = Backbone.RelationalModel.extend({
        urlRoot: '/api/v1/tree_data/',
        initialize: function () {
            this.on('change:resource_uri', this.set_patch_listener);
        },
        validate: function (attributes) {
            try {
                // data should always contain valid JSON
                JSON.parse(attributes.data);
            } catch (err) {
                return 'Invalid JSON in data attribute';
            }
            if (attributes.version < this.get('version')) {
                // Never let the version number go down
                return 'Cannot apply a regression';
            }
            if (this.get('module_id') !== undefined && this.get('module_id') !== attributes.module_id) {
                return 'TreeData module_id attribute is read-only.';
            }
        },
        set_patch_listener: function () {
            if (!this.has('id')) {
                return;
            }
            var id = this.get('id');
            window.Houdini.on('patch:tree{' + id + '}', this.patch, this);
        },
        patch: function (data) {
            var diff, patched, patch, new_data, results, success;
            // if the patch is for someone else, exit immediately
            if (!data || !data.i || data.i !== this.get('id')) {
                return this.fetch();
            }

            if (this.get('version') + 1 === data.v) {
                // good to patch
                diff = new diff_match_patch();
                try {
                    patch = diff.patch_fromText(data.p);
                    patched = diff.patch_apply(patch, this.get('data'));
                } catch (e) {
                    Raven.captureException(e);
                    return this.fetch();
                }
                new_data = patched[0];
                results = patched[1];
                // check that all the patches were successful
                // 'results' is an array of booleans, all should be true
                if (_.contains(results, false)) {
                    // one or more patches were not succesfully applied
                    return this.fetch();
                } else {
                    // all patches were applied! try to set the value
                    success = this.set({
                        data: patched[0],
                        version: data.v
                    }, {validate: true});
                    if (success === false) {
                        // the model did not pass validation
                        return this.fetch();
                    }
                }
            } else {
                // patch is out of sync, re-fetch
                return this.fetch();
            }
            return $.Deferred().resolve();
        }
    });

    return TreeData;
});
