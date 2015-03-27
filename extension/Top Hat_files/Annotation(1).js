/* global Backbone, _ */
define([
], function () {
    'use strict';

    var Path = Backbone.Model.extend({
        defaults: function () {
            return {
                color: null,
                thickness: null,
                points: []
            };
        },
        toJSON: function () {
            var json = Backbone.Model.prototype.toJSON.apply(this);
            _.each(json.points, function (point) {
                point[0] = Math.round(point[0]*1000) / 1000;
                point[1] = Math.round(point[1]*1000) / 1000;
            });
            return json;
        }
    });

    var PathCollection = Backbone.Collection.extend({
        model: Path,
        get: function (id, create) {
            // this behaves kinda like a defaultdict in python
            var result = Backbone.Collection.prototype.get.apply(this, [id]);
            if (_.isUndefined(result) && !_.isObject(id) && create) {
                result = new this.model({id: id});
                this.add(result);
            }
            return result;
        },
        parse: function (data) {
            return _.map(data, function (path_data) {
                var path = this.get(path_data.id);
                if (!path) {
                    path = new Path();
                }
                path.set(path.parse(path_data));
                return path;
            }.bind(this));
        }
    });

    var Layer = Backbone.Model.extend({
        defaults: function () {
            return {
                id: null,
                owner_username: null,
                paths: new PathCollection()
            };
        },
        parse: function (data) {
            var paths = this.get('paths');
            paths.set(paths.parse(data.paths));
            data.paths = paths;
            return data;
        }
    });

    var LayersCollection = Backbone.Collection.extend({
        model: Layer,
        get: function (id) {
            // this behaves kinda like a defaultdict in python
            var result = Backbone.Collection.prototype.get.apply(this, [id]);
            if (_.isUndefined(result) && !_.isObject(id)) {
                result = new this.model({id: id});
                this.add(result);
            }
            return result;
        },
        parse: function (data) {
            return _.map(data, function (layer_data) {
                var layer = this.get(layer_data.id);
                if (!layer) {
                    layer = new Layer();
                }
                layer.set(layer.parse(layer_data));
                return layer;
            }.bind(this));
        }
    });

    var Page = Backbone.Model.extend({
        urlRoot: '/api/v3/files/annotations/',
        idAttribute: 'id',
        initialize: function () {
            // rate limit the save method to 1/sec
            this.save = _.throttle(this.save, 1000);
        },
        save: function () {
            Backbone.Model.prototype.save.apply(this, arguments);
        },
        defaults: function () {
            return {
                id: null,
                layers: new LayersCollection()
            };
        },
        parse: function (data) {
            if (!data) {
                return;
            }
            var layers = this.get('layers');
            layers.set(layers.parse(data.layers));
            data.layers = layers;
            return data;
        },
        url: function () {
            return this.urlRoot + this.get('file_id') + '/';
        },
        toJSON: function () {
            var json = {
                file_id: this.get('file_id'),
                page_id: this.get('id'),
                paths: this.get('layers').get(window.user.get('id')).get('paths').toJSON()
            };
            return json;
        },
        newPath: function (layer_id) {
            if (_.isUndefined(layer_id)) {
                layer_id = window.user.get('id');
            }
            var layer = this.get('layers').get(layer_id);
            var path_id = Math.uuid(4);
            var path = new Path({id: path_id});
            layer.get('paths').add(path);
            return path;
        },
        delete_path: function (path_id, page_id) {
            var url = this.url();
            url += '?path_id=' + path_id;
            url += '&page_id=' + page_id;
            $.ajax(url, {
                type: 'DELETE'
            });
        }
    });

    var PageCollection = Backbone.Collection.extend({
        model: Page,
        get: function (id) {
            // this behaves kinda like a defaultdict in python
            var result = Backbone.Collection.prototype.get.apply(this, [id]);
            if (_.isUndefined(result) && !_.isObject(id)) {
                result = new this.model({id: id});
                this.add(result);
            }
            return result;
        },
        parse: function (data) {
            return _.map(data, function (page_data) {
                var page = this.get(page_data.id);
                page.set(page.parse(page_data));
                return page;
            }.bind(this));
        }
    });

    var Annotation = Backbone.Model.extend({
        urlRoot: '/api/v3/files/annotations/',
        idAttribute: 'resource_uri',
        defaults: function () {
            return {
                pages: new PageCollection()
            };
        },
        initialize: function () {
            this.get('pages').on('add', function (page) {
                page.set({file_id: this.get('id')});
            }.bind(this));
        },
        parse: function (data) {
            var pages = this.get('pages');
            pages.set(pages.parse(data.pages));
            data.pages = pages;
            return data;
        },
        toJSON: function () {
            var json = Backbone.Model.prototype.toJSON.apply(this);
            json.pages = json.pages.toJSON();
            return json;
        }
    });

    return Annotation;
});
