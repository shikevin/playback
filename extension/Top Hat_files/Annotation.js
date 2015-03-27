/*global define, _, Backbone*/
define([], function () {
    'use strict';
    var svgns = 'http://www.w3.org/2000/svg';
    var ns_element = function (type) {
        return $(document.createElementNS(svgns, type));
    };
    var AnnotationView = Backbone.View.extend({
        className: 'annotation_container',
        events: {
            'mousedown svg': 'down_event',
            // 'mouseup svg': 'up_event',
            'touchstart svg': 'down_event',
            // 'touchend svg': 'up_event',
            'click path': 'erase',
            'touchend svg': 'erase_intersecting'
        },
        initialize: function () {
            window.Houdini.on('draw_points', this.on_draw_points_event, this);
            window.Houdini.on('erase_path', this.on_erase_path_event, this);
        },
        erase_intersecting: function (e) {
            if ($('body').hasClass('erase_annotation')) {
                // If we've drawn a path, don't erase anything.
                if (this.path.get('points').length > 1) { return; }
                var $svg = this.$('svg');
                var svg = $svg[0];
                var offset = $svg.offset();
                var rect = svg.createSVGRect();
                var touch = e.originalEvent.changedTouches[0];
                var rect_size = 10;

                rect.x = touch.clientX - offset.left - rect_size / 2;
                rect.y = touch.clientY - offset.top - rect_size / 2;
                rect.width = rect.height = rect_size;

                var paths = svg.getIntersectionList(rect);
                var file_id = this.model.get('file_id');

                var i, path_to_erase, path_id;
                for (i = 0; i < paths.length; i++) {
                    path_to_erase = paths[i];
                    path_id = this.get_svg_path_id(file_id, this.path.id);
                    // If the path_to_erase is not the current path, erase it.
                    if (path_to_erase.id !== path_id) {
                        this.erase({target: path_to_erase});
                    }
                }
            }
        },
        erase: function (e) {
            if ($('body').hasClass('erase_annotation')) {
                var id = $(e.target).attr('id').split('_')[2];
                var layer = this.model.get('layers').get(Number(window.user.get('id')));
                if (_.isUndefined(layer)) { return; } // user doesnt have any own anntations

                var path = layer.get('paths').get(id);
                if (_.isUndefined(path)) { return; } // that path isn't owned by the user

                // Trigger a destroy event instead of calling destroy() in order
                // to avoid an invalid DELETE request. (Paths don't have a REST
                // endpoint.)
                path.trigger('destroy', path, path.collection);
                $(e.target).remove();
                this.model.delete_path(id, this.page - 1);
            }
        },
        on_erase_path_event: function (data) {
            /**
            When we recieve a realtime 'erase_path' event, and the event was
            triggered by someone, find the path in the
            layer and remove it from the svg.
            **/
            var layer = this.model.get('layers').get(Number(data.owner_id));
            var path = layer.get('paths').get(data.path_id);
            if (!path) { return; }

            // Trigger a destroy event instead of calling destroy() in order
            // to avoid an invalid DELETE request. (Paths don't have a REST
            // endpoint.)
            path.trigger('destroy', path, path.collection);

            var svg = this.$('svg');

            // TODO: These ids are constructed in several places. Refacator
            // to reduce duplication.
            var layer_id = 'layer_'+data.item_id+'_'+data.owner_id;
            var layer_el = svg.find('g#'+layer_id);
            var path_id = this.get_svg_path_id(data.item_id, data.path_id);
            var path_el = layer_el.find('path#'+path_id);

            $(path_el).remove();
        },
        on_draw_points_event: function (data) {
            var parsed_page = parseInt(data.page.split('Page')[1], 10);
            if (data.item_id === this.model.get('file_id') && parsed_page === this.page) {
                var layer = this.model.get('layers').get(data.owner_id);
                var path = layer.get('paths').get(data.path_id, true);

                if (path === this.path) {
                    // we're the one drawing this path
                    return;
                }

                var points = path.get('points');
                points = points.concat(data.points);
                path.set({
                    points: points,
                    thickness: data.thickness,
                    color: data.color
                });
                this.render_layers();
            }
        },
        convert_touch_event: function (e) {
            var touches = e.originalEvent.touches;
            var offset = this.$el.offset();
            e.offsetX = touches[0].pageX - offset.left;
            e.offsetY = touches[0].pageY - offset.top;
            return e;
        },
        move_event: function (e) {
            if (e.type === 'touchmove') {
                e = this.convert_touch_event(e);
            }
            this.process_event(e);
        },
        process_event: function (e) {
            e.preventDefault();

            if (e.offsetX === undefined) { // this works for Firefox
                var offset = this.svg.parent().offset();
                e.offsetX = e.pageX-offset.left;
                e.offsetY = e.pageY-offset.top;
            }

            var w = this.svg.width() || 1;
            var p = [e.offsetX / w, e.offsetY / w];

            this.path.get('points').push(p);
            this.draw_current_path();
        },
        draw_current_path: function () {
            var path_id = this.get_svg_path_id(
                this.model.get('file_id'), this.path.get('id'));
            this.render_points(this.$('#'+path_id), this.path.get('points'));
        },
        down_event: function (e) {
            if (this.$el.parents('.draw_active').length === 0) {
                // draw mode is OFF
                return;
            }
            this.path = this.model.newPath();

            // color/thickness is set by the parents controls
            var parent = this.$el.closest('.files_content');
            this.path.set({
                color: parent.find('.embed_controls_color_select').css('background-color'),
                thickness: parent.find('.embed_controls_thickness_select').attr('data-stroke')
            });
            this.render_layers();

            // See related .bg-img comment in render() for an explanation of
            // this code.
            if (e.target.nodeName.toLowerCase() === 'img') {
                $(e.target).mousemove(this.move_event.bind(this));
                $(e.target).on('touchmove', this.move_event.bind(this));
            }
            else {
                this.svg.mousemove(this.move_event.bind(this));
                this.svg.on('touchmove', this.move_event.bind(this));
            }

            if (e.type === 'touchstart') {
                e = this.convert_touch_event(e);
            }
            this.process_event(e);

            // just in case the mouse goes up elsewhere
            var quiet_up = function () { this.up_event(e); }.bind(this);
            $('body').on('mouseup', _.once(quiet_up));
            $('body').on('touchend', _.once(quiet_up));
        },
        up_event: function (e) {

            // See related .bg-img comment in render() for an explanation of
            // this code.
            if (e.target.nodeName.toLowerCase() === 'img') {
                $(e.target).off('mousemove');
                $(e.target).off('touchmove');
            }
            else {
                this.svg.off('mousemove');
                this.svg.off('touchmove');
            }
            this.model.save(null, {
                type: 'POST'
            });
        },
        render: function () {
            this.parent = this.$el.closest('.crocodoc-page');
            if (this.parent.length === 0) {
                throw 'AnnotationView must have a parent before rendering';
            }
            this.page = this.parent.index() + 1;

            this.svg = ns_element('svg');
            this.svg.attr('xmlns', this.svgns);
            this.svg.attr('preserveAspectRatio', 'none');
            this.$el.append(this.svg);

            // In IE<11, the viewer's .bg-img element intercepts DOM events
            // before the svg element (even though the svg element appears to
            // be on top of the .bg-img element). So we bind mouse events to
            // .bg-img instead.
            this.$el.parents('.page').find('.bg-img').mousedown(
                this.down_event.bind(this));

            this.render_layers();

            this.resize();
            $(window).resize(this.resize.bind(this));
        },
        get_svg_path_id: function (file_id, path_id) {
            return 'path_' + file_id + '_' + path_id;
        },
        render_layers: function () {
            var svg = this.$('svg');
            var render_points = this.render_points;
            var file_id = this.model.get('file_id');
            var get_svg_path_id = this.get_svg_path_id;
            var that = this;
            this.model.get('layers').each(function (layer) {
                var layer_id = 'layer_'+file_id+'_'+layer.get('id');
                var layer_el = svg.find('g#'+layer_id);
                if (layer.get('id') === Number(window.user.get('id'))) {
                    layer_el.attr('class', 'own');
                }
                if (layer_el.length === 0) {
                    layer_el = ns_element('g');
                    layer_el.attr('id', layer_id);
                    svg.append(layer_el);
                }
                layer.get('paths').each(function (path) {
                    var path_id = get_svg_path_id(file_id, path.get('id'));
                    var path_el = layer_el.find('path#'+path_id);
                    if (path_el.length === 0) {
                        path_el = ns_element('path');
                        path_el.attr('id', path_id);
                        layer_el.append(path_el);
                    }
                    if (path.get('color')) {
                        path_el.css('stroke', path.get('color'));
                    }
                    if (path.get('thickness')) {
                        path_el.css('stroke-width', that._stroke_width(Number(path.get('thickness'))));
                    }
                    render_points(path_el, path.get('points'));
                });
            });
        },
        render_points: function (path_el, points) {
            var pts = [];
            _.each(points, function (p) {
                // scale up so firefox works
                pts.push(1000*p[0] + ',' + 1000*p[1]);
            });
            if (pts.length === 0) {
                // we can't render an empty path
                return;
            }
            path_el.attr('d', 'M' + pts.join('L'));
        },
        resize: function () {
            // A hack to compensate for docviewer resizing after
            // backbone processes resizes - forces it to happen
            // after docviewer resizes.
            setTimeout(function () {
                var w = this.parent.width();
                var h = this.parent.height();
                var aspect_ratio = h / w;

                // scale up so firefox works
                this.svg[0].setAttribute('viewBox', '0 0 1000 ' + 1000*aspect_ratio);
                this.svg.attr('width', w);
                this.svg.attr('height', h);
            }.bind(this), 100);
        },
        _canonical_width: 618, // Taken from sampling the max size of this window in the web app.
        _thickness_factor: 5,
        _scale_stroke_width: function (stroke_width) {
            return (this.parent.width() / this._canonical_width) * stroke_width;
        },
        _stroke_width: function (thickness) {
            return this._scale_stroke_width(this._thickness_factor * thickness);
        }
    });
    return AnnotationView;
});
