/* global _ */
define([
    'modules/Module'
], function (Module) {
    'use strict';

    /**
     * @class GradebookV2Module
     *
     * This class exists purely as a declaration of the
     * gradebook_beta module.
     */
    var GradebookV2Module = Module.extend({
        defaults: _.extend({}, Module.prototype.defaults, {
            id: 'gradebook_beta',
            title: 'Gradebook'
        })
    });

    return GradebookV2Module;
});
