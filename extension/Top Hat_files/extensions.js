// extensions.js
// random extensions to libraries that we've already loaded

(function(undefined){
    //Un-hack - Jero
    Backbone.RelationalModel.prototype.idAttribute = 'resource_uri';

    if (String.prototype.trim === undefined) {
        String.prototype.trim=function(){return this.replace(/^\s+|\s+$/g, '');};
    }
})();