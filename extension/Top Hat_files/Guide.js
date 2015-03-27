define([
    'text!templates/course/quickstart_guide.html'
], function (html) {
    'use strict';
    /* 3-step guide! */
    var Guide = {
        el: null,
        '$el': null,
        autoplay: function () {
            return window.user.get('is_new_prof') || false;
        },

        start: function () {
            // Force open the question panel
            $('.thm_panel_hidden').removeClass('thm_panel_hidden');

            // Set up the DOM
            $('body').addClass('guide').append(html);
            Guide.$el = $('body #guide');
            Guide.el = $('body #guide')[0];

            // Set up the canvas values
            Guide.canvas.$el = Guide.$el.find('canvas');
            Guide.canvas.el = Guide.canvas.$el[0];
            Guide.canvas.height = $(window).height();
            Guide.canvas.width = $(window).width();
            Guide.canvas.$el.prop('height', Guide.canvas.height);
            Guide.canvas.$el.prop('width', Guide.canvas.width);
            Guide.canvas.context = Guide.canvas.el.getContext('2d');

            // Deal with bindings
            Guide.$el.find('a.next').on('click', Guide.next);
            Guide.$el.find('a.stop').on('click', Guide.stop);
            Guide.$el.find('a.walkme').on('click', Guide.WalkMe);
            $(window).on('resize', Guide.canvas.resize);

            // Hide any WalkMe steps
            $('.walkme-custom-balloon-outer-div').hide();
            $('.walkme-custom-balloon-arrow').hide();

            // Let's start the tour...
            Guide.$el.show();
            Guide.showStep(1);

            // Track the event
            window.Daedalus.track('quick reference opened', {
                coursePublicCode: window.site_data.settings.COURSE_PUBLIC_CODE,
                role: window.user.get('role')
            });
        },

        stop: function (event) {
            if (event) {
                event.preventDefault();
            }
            $('body').removeClass('guide');
            $('.walkme-custom-balloon-outer-div').show();
            $('.walkme-custom-balloon-arrow').show();
            Guide.$el.remove();

            if (Guide.autoplay()) {
                Guide.showLink();
            }
        },

        WalkMe: function (event) {
            event.preventDefault();
            window.WalkMePlayerAPI.toggleMenu();
        },

        showStep: function (step_number) {
            var i, $old;
            // Clear the canvas
            Guide.draw.overlay();

            // Draw the old steps in grey
            for (i = 1; i < step_number; i += 1) {
                Guide.drawStepLine(i, false);
            }

            // set the steps offset
            Guide.$el.find('ul.steps').css('top', $('#region-navbar').offset().top);

            // Redraw the old steps as 'background' steps
            Guide.step = step_number;
            $old = Guide.$el.find('li:nth-child(' + (Guide.step - 1) + ')');
            if ($old.hasClass('stay')) {
                $old.addClass('inactive');
            } else {
                $old.hide();
            }

            // Show the new step
            Guide.$el.find('li:nth-child(' + Guide.step + ')').show();

            //Find out the coords for our arrows
            Guide.drawStepLine(Guide.step, true);
        },

        drawStepLine: function (step_number, primary_line) {
            var $step, $target, source, target, fillstyle;
            $step = $(Guide.$el.find('li:nth-child(' + step_number + ')'));
            if ($step.hasClass('line')) {
                $target = $($step.data('target'));

                if ($target.length > 0) {
                    // Determine our source
                    source = Guide.findCoords($step, $step.attr('my'));
                    target = Guide.findCoords($target, $step.attr('at'));

                    if (primary_line) {
                        fillstyle = 'rgba(255, 255, 255, 1)';
                    } else {
                        fillstyle = 'rgba(150, 150, 150, 0.5)';
                    }

                    Guide.draw.line(source.x, source.y, target.x, target.y, fillstyle);
                }
            }
        },

        next: function (event) {
            event.preventDefault();
            Guide.showStep(Guide.step + 1);
        },

        draw: {
            overlay: function () {
                Guide.canvas.context.clearRect(0, 0, Guide.canvas.width, Guide.canvas.height);
                Guide.canvas.context.fillStyle = 'rgba(100, 100, 100, 0.5)';
                Guide.canvas.context.fillRect(0, 0, Guide.canvas.width, Guide.canvas.height);
            },

            line: function (sx, sy, ex, ey, fillstyle) {
                var ctx = Guide.canvas.context;
                ctx.strokeStyle = fillstyle;
                ctx.fillStyle = fillstyle;
                ctx.lineWidth = 3;

                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.quadraticCurveTo(((sx + ex) / 2), sy, ex, ey);

                ctx.stroke();

                ctx.closePath();
                Guide.draw.circle(sx, sy, 4);
                Guide.draw.circle(ex, ey, 4);
            },

            circle: function (x, y, radius) {
                var ctx = Guide.canvas.context;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
                ctx.stroke();
                ctx.fill();
                ctx.closePath();
            }
        },

        findCoords: function (element, side) {
            var coords, height, width, top, left;
            // Build our return value
            coords = {
                side: side,
                el: element,
                x: 0,
                y: 0
            };

            // Set up our variables
            height = element.height();
            width = element.width();
            top = element.offset().top;
            left = element.offset().left;

            if (side === 'top') {
                coords.y = top - 10;
                coords.x = left + (width / 2);
            }

            if (side === 'bottom') {
                coords.y = top + height + 10;
                coords.x = left + (width / 2);
            }

            if (side === 'left') {
                coords.y = top + (height / 2);
                coords.x = left - 10;
            }

            if (side === 'right') {
                coords.y = top + (height / 2);
                coords.x = left + width + 10;
            }

            return coords;
        },

        showLink: function () {
            var $el = $('li em:contains(Quick Reference Guide)').parent();

            $el.addClass('guide-note');
            $el.qtip({
                content: '<b>Bring me back</b>If you ever need to access the guide again, just click here.',
                position: {
                    my: 'left center',
                    at: 'right center'
                },
                show: {
                    ready: true
                },
                style: {
                    classes: 'tooltip-light guide-tip',
                    tip: {
                        height: 10,
                        width: 20,
                        border: 1
                    }
                }
            });

            window.setTimeout(function () {
                $el.removeClass('guide-note');
                $el.qtip('hide');
                $el.qtip('destroy');
            }, 4000);
        },

        canvas: {
            el: null,
            '$el': null,
            context: null,
            height: null,
            width: null,

            resize: function () {
                var i;
                // Resize the canvas
                Guide.canvas.height = $(window).height();
                Guide.canvas.width = $(window).width();
                Guide.canvas.$el.prop('height', Guide.canvas.height);
                Guide.canvas.$el.prop('width', Guide.canvas.width);

                // Redraw the overlay and lines
                Guide.draw.overlay();
                for (i = 0; i < Guide.step; i += 1) {
                    Guide.drawStepLine(i, false);
                }
                Guide.drawStepLine(Guide.step, true);
            }
        },

        step: 0
    };

    $(window).on('redraw_guide', function () {
        // sometimes an event happens that shifts the content up or down
        // hopefully that event will trigger this and reposition the guide elements
        if ($('body').hasClass('guide')) {
            Guide.showStep(Guide.step);
        }
    });

    return Guide;
});
