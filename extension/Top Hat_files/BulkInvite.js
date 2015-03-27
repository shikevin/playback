define([
],function () {
	'use strict';
	var BulkInvite = Backbone.Model.extend({
	    urlRoot: '/api/v2/bulk_invite/',
	    idAttribute: 'resource_uri',
        defaults: {
            result_list:[]
        }
	});
	return BulkInvite;
});