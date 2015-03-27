/* globals Backbone */
(function (root, factory) {
    'use strict';

    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else {
        factory();
    }
})(this, function () {
    'use strict';
    Backbone.Model.prototype.idAttribute = 'id';
    return Backbone;
});
