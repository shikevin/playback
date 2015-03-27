//    _____  _____  ___  ____________________  _  __ ______________
//   / __/ |/_/ _ \/ _ \/ __/ __/ __/  _/ __ \/ |/ //  _/ __/_  __/
//  / _/_>  </ ___/ , _/ _/_\ \_\ \_/ // /_/ /    /_/ /_\ \  / /
// /___/_/|_/_/  /_/|_/___/___/___/___/\____/_/|_//___/___/ /_/
//
// Expressionist jQuery plugin
//
// Author: Anson MacKeracher, Matt Hughes
// Version: 0.1.4
// Date: Dec 5, 2012

(function($) {
    var methods = {
        "show" : function() {
            settings["hidden"] = false;
        },
        "hide" : function() {
            settings["hidden"] = true;
        },
        "init" : function(options) {
            // Respect chaining
            return this.each(function() {
                if(options) {
                    $.extend(settings, options);
                }

                $(this).data("state_paint", false);
                $(this).data("state_color", colors.black);
                $(this).data("state_size", sizes.medium);
                $(this).data("state_started", false);

                var wrapper = $("<div></div>");

                // Create canvas controls
                var html = "<div id='expressionist_colors'><span>Colors:</span>";
                html += "<a color='red' href='#'><img src='" + options.image_path + "red.png' /></a>";
                html += "<a color='purple' href='#'><img src='" + options.image_path + "purple.png' /></a>";
                html += "<a color='green' href='#'><img src='" + options.image_path + "green.png' /></a>";
                html += "<a color='blue' href='#'><img src='" + options.image_path + "blue.png' /></a>";
                html += "<a color='black' href='#'><img src='" + options.image_path + "black.png' /></a>";
                html += "<a color='white' href='#'><img src='" + options.image_path + "eraser.png' /></a>";
                html += "</div>";
                html += "<div id='expressionist_sizes'><span>Sizes</span>";
                html += "<a size='small' href='#'><img src='" + options.image_path + "pen.png' style='width:10px;' /></a>";
                html += "<a size='medium' href='#'><img src='" + options.image_path + "pen.png' style='width:15px;'/></a>";
                html += "<a size='large' href='#'><img src='" + options.image_path + "pen.png' style='width:20px'/></a>";
                html += "</div>";
                html += "<a id='canvas_clear' style='float:right; margin-top:10px;' href='#'>Clear canvas</a>";
                var html_el = $(html)

                // Initialize the control logic
                html_el.filter("#expressionist_colors").find("a").click($.proxy(function(event) {
                    event.preventDefault()
                    var color_str = $(event.currentTarget).attr("color");
                    $(this).data("state_color", colors[color_str]);

                    $(event.currentTarget).siblings().find("img").removeClass("color_selected");
                    $(event.currentTarget).find("img").addClass("color_selected");
                }, this));
                html_el.filter("#expressionist_sizes").find("a").click($.proxy(function(event) {
                    event.preventDefault()
                    var size_str = $(event.currentTarget).attr("size");
                    $(this).data("state_size", sizes[size_str]);

                    $(event.currentTarget).siblings().find("img").removeClass("color_selected");
                    $(event.currentTarget).find("img").addClass("color_selected");
                }, this));
                html_el.filter("a#canvas_clear").click($.proxy(function(event) {
                    event.preventDefault()
                    $(this).data('canvas')[0].width = $(this).data('canvas')[0].width;
                }, this));

                wrapper.append(html_el);

                // Create canvas element
                var canvas_el = $("<canvas style='border: 1px solid black;' width='465' height='320'><canvas>");
                wrapper.append(canvas_el);

                $(this).data('canvas', canvas_el);
                $(this).data('context', canvas_el[0].getContext("2d"));
                $(this).data('width', 465);
                $(this).data('height', 320);

                // Bind mouse events on the canvas element
                canvas_el.bind('mousedown touchstart', $.proxy(function(ev) {
                    ev.preventDefault();
                    c = get_canvas_coords.call(this, ev);
                    start_painting.call(this, c.x, c.y);
                }, this));

                // Fix for iPad using 'touchmove' TODO: support multi touch?
                canvas_el.bind('mousemove touchmove', $.proxy(function(ev) {
                    ev.preventDefault();
                    if ( $(this).data("state_paint") ) {
                        c = get_canvas_coords.call(this, ev);
                        add_click.call(this, c.x, c.y);
                    }
                }, this));

                canvas_el.bind('mouseup mouseleave touchend', $.proxy(function(ev) {
                    ev.preventDefault();
                    c = get_canvas_coords.call(this, ev);
                    stop_painting.call(this, c.x, c.y);
                }, this));

                $(this).append(wrapper);
            });
        },
        "is_empty": function() {
            return $(this).data("state_started");
        },
        "get_data": function() {
            if ( $(this).data("state_started") ) {
                var data = $(this).data('canvas')[0].toDataURL("image/png");
            } else {
                var data = "";
            }
            return data;
        },
        "clear": function() {
            if ($(this).data('context')) {
                $(this).data('context').clearRect(0, 0, $(this).data('width'), $(this).data('height'));
            }

            //mark image as having not been drawn
            $(this).data("state_started", false);
        },
        "background_image": function(background_image) {
            //mark image as having been 'drawn'
            $(this).data("state_started", true);

            settings.background_image = new Image();

            settings.background_image.onload = function() {
                // scale the image
                var max_width = $(this).data('width'),
                    max_height = $(this).data('height'),
                    image_width = settings.background_image.width,
                    image_height = settings.background_image.height;

                if (image_width == 0 || image_height == 0) {
                    // there is no image to draw
                    return
                }

                var h_scale = max_width / image_width,
                    v_scale = max_height / image_height;

                var scale = Math.min(h_scale, v_scale);

                var h_offset = Math.floor((max_width - image_width*scale) / 2),
                    v_offset = Math.floor((max_height - image_height*scale) / 2);

                $(this).data('context').drawImage(settings.background_image,
                                                  h_offset,
                                                  v_offset,
                                                  image_width*scale,
                                                  image_height*scale);
            }.bind(this);


            // Occasionally IE 9 will refuse to load the image.
            // We attempt to retry until it does.
            var attempts = 0;
            settings.background_image.onerror = function() {
                if (attempts < 3) {
                    settings.background_image.src =
                        settings.background_image.src + '#ie-cache-bust';
                }
                attempts++;
            };

            settings.background_image.src = background_image;
        }
    };

    var get_canvas_coords = function(e) {
        var offset = $(this).data('canvas').offset();

        if(e.type === 'touchstart' || e.type === 'touchmove') {
            e = e.originalEvent;
            e = e.touches[0]; // TODO: Support Multitouch?
        } else if(e.type === 'touchend') {
            e = e.originalEvent;
            e = e.changedTouches[0];
        }

        var mouse_x = e.pageX - offset.left;
        var mouse_y = e.pageY - offset.top;
        return {
            x: mouse_x,
            y: mouse_y
        };
    };

    var start_painting = function(x, y) {
        var state = $(this).data("state");
        $(this).data("state_paint", true); // Change paint state to true
        $(this).data("state_started", true); // Change started state to true

        // Draw stroke
        $(this).data('context').strokeStyle = $(this).data("state_color");
        $(this).data('context').lineWidth = $(this).data("state_size")
        $(this).data('context').beginPath();
        $(this).data('context').moveTo(x, y);
    };

    var stop_painting = function(x, y) {
        if ( $(this).data("state_paint") ) {
            add_click.call(this, x, y);
            $(this).data("state_paint", false);
        }
    };

    var add_click = function(x, y, dragging) {
        $(this).data('context').lineTo(x, y);
        $(this).data('context').stroke();
    };

    var colors = {
        purple: "#c986c5",
        green: "#80c23e",
        yellow: "#ffcf33",
        red: "#f75e4f",
        white: "#ffffff",
        black: "#000000",
        blue: "#4bb0e0"
    };

    var sizes = {
        small: 2,
        medium: 7,
        large: 20
    }

    var settings = {
        hidden: false,
        image_path: "../../images/edumacation/discussion/",
        background_image: undefined
    };

    $.fn.expressionist = function(method) {
        if (methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === "object" || ! method) {
            return methods.init.apply(this, arguments);
        } else {
            $.error("Method " + method + " does not exist on jQuery.expressionist!");
        }
    };
})(jQuery);


