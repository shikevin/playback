/* global Backbone */
define([
    'mixins/PUTUpdateFieldMixin',
    'backbone.cocktail'
], function (
    PUTUpdateFieldMixin,
    Cocktail
) {
    'use strict';
    var ModuleItemActivation = Backbone.Model.extend({
        url: function () {
            return ('/api/v3/course/' + this.get('id') +
                    '/module_item/activation');
        },
        idAttribute: 'resource_uri'
    });
    Cocktail.mixin(ModuleItemActivation, PUTUpdateFieldMixin);
    return new ModuleItemActivation();
});
