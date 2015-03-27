/* globals define, Backbone */
define([], function() {
    'use strict';
    
    var HiddenFolder = Backbone.Model.extend({
        urlRoot: '/api/v1/hidden_folder/',
        idAttribute: 'id',
        url: function() {
            if (this.get('id')) {
                return this.urlRoot + this.get('id');
            } else {
                return this.urlRoot;
            }
        }
    });

    return HiddenFolder;
});
