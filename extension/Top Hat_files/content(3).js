/* global _ */
define([
    'views/ModuleItemContent',
    'views/files/Annotation',
    'models/Annotation',
    'util/retry',
    'text!templates/spinner.html',
    'util/accessibility',
    'text!templates/files/embed.html',
    'text!templates/files/preview.html',
    'text!templates/files/download.html',
    'text!templates/files/archive.html',
    'text!templates/files/pages_download.html',
    'util/Browser',
    'docviewer'
], function (
    ModuleItemContentView,
    AnnotationView,
    Annotation,
    retry,
    spinner_html,
    Accessibility,
    embed_html,
    preview_html,
    download_html,
    archive_html,
    pages_download_html,
    Browser
) {
    'use strict';

    var FilesView = ModuleItemContentView.extend({
        className: 'files_content app-styles',
        spinner_template: _.template(spinner_html),
        embed_template: _.template(embed_html),
        preview_template: _.template(preview_html),
        download_template: _.template(download_html),
        archive_template: _.template(archive_html),
        pages_download_template: _.template(pages_download_html),
        events: {
            'click .embed_controls_prev': 'prev',
            'click .embed_controls_fullscreen': 'fullscreen',
            'click .embed_controls_next': 'next',
            'click .embed_mobile_pagination .embed_prev_page': 'prev',
            'click .embed_mobile_pagination .embed_next_page': 'next',
            'click .embed_controls_draw': 'draw',
            'click .embed_controls_color_select': 'toggle_color_select',
            'click .color_picker a': 'pick_color',
            'click .embed_controls_thickness_select': 'toggle_stroke_select',
            'click .stroke_picker a': 'pick_stroke',
            'click .embed_controls_erase': 'toggle_erase',
            'click a.make_fancybox': 'zoom_image'
        },
        initialize: function () {
            ModuleItemContentView.prototype.initialize.apply(this, arguments);
            // need to bind this so that we can refer to it later
            // without calling .bind again
            // see bind_keys and unbind_keys
            this.keydown = this.keydown.bind(this);
            this.resize = this.resize.bind(this);
            this.teacher_page_change = this.teacher_page_change.bind(this);
            this.viewer_page_change = this.viewer_page_change.bind(this);
            this.current_page = 1;
            if (this.model.has('current_page')) {
                this.current_page = this.model.has('current_page');
            }
            this.annotation = new Annotation({id: this.model.get_id()});
            window.Houdini.on('page_change', this.teacher_page_change);

            if (this._is_android()) {
                var android_version = window.navigator.userAgent.match(/Android\s+([\d\.]+)/);
                if (android_version && android_version.length > 1 && parseFloat(android_version[1]) < 4 && !/chrome/i.test(window.navigator.userAgent) && !/firefox/i.test(window.navigator.userAgent)) {
                    window.alert('Please upgrade to a more modern browser to use Top Hat on your Android device. We recommend installing Firefox.');
                }
            }
        },
        zoom_image: function (e) {
            e.preventDefault();
            $.fancybox({
                href: this.model.get('url'),
                fitToView: false,
                maxWidth: '100%'
            });
        },
        toggle_color_select: function (e) {
            e.preventDefault();
            this.$('.color_picker_container').fadeToggle(100);
        },
        pick_color: function (e) {
            var color = $(e.target).data('color');
            this.$('.embed_controls_color_select').css('background-color', color);
            this.$('.color_picker_container').fadeOut(100);
            e.preventDefault();
        },
        toggle_stroke_select: function (e) {
            e.preventDefault();
            this.$('.stroke_picker_container').fadeToggle(100);
        },
        pick_stroke: function (e) {
            var stroke = $(e.target).attr('data-stroke');
            this.$('.embed_controls_thickness_select').attr('data-stroke', stroke);
            this.$('.stroke_picker_container').fadeOut(100);
            e.preventDefault();
        },
        remove: function () {
            this.cleanup();
            window.Houdini.off('page_change', this.teacher_page_change);
            ModuleItemContentView.prototype.remove.apply(this, arguments);
        },
        mobile_hide_scrollable: function() {
            /* In mobile web, the student is shown a scrollable list of slides for PPTs. This works
             * differently compared to web, where students are shown one slide at a time and
             * are prevented from advancing past the professor's slide. This function adds a
             * class to the necessary pages which hides/shows them.
             */
            if (Browser.is_mobile() && (this.model.get('type') === 'ppt' || this.model.get('type') === 'pptx')) {
                _.each(this.page_elements, function(page, index) {
                    if (index < this.current_page) {
                        $(page).removeClass('hide_slide_mobile');
                    } else {
                        $(page).addClass('hide_slide_mobile');
                    }
                }.bind(this));
            }
        },
        teacher_page_change: function (data) {
            /**
             * Handler for the Houdini page_change event which is sent to
             * students.
             * @param {Object} data Houdini event data.
             */
            // If this instance originated the page_change event, ignore it.
            if (this.sent_here) {
                this.sent_here = false;
                return;
            }
            if (data.item_id === this.model.get_id() && this.docviewer) {
                this.current_page = parseInt(data.page, 10);
                this.current_teacher_page = this.current_page;
                this.mobile_hide_scrollable();
                this.docviewer.scrollTo(this.current_page);

                Accessibility.SR_alert('Professor moved to page' + this.current_page);
            }
        },
        _current_max_flippable_page: function () {
            if (window.user.get('role') === 'student' &&
                    this.model.get('status') === 'active_visible' &&
                    this.current_teacher_page !== null &&
                    !this._is_android()) {
                return this.current_teacher_page;
            }

            return this.num_pages;
        },
        flip_page: function (direction) {
            /**
             * Changes the docviewer page in the given direction.
             * @method flip_page
             * @param {Number} direction -1 to go to previous page, 1 to go to
             * next page.
             */
            if (!this.docviewer) {
                return;
            }

            var new_page = this.current_page + direction;

            if (direction === 1 && new_page > this._current_max_flippable_page()) {
                return;
            }

            if (new_page > 0 && new_page < this.num_pages + 1) {
                this.docviewer.scrollTo(new_page);
                this.docviewer.zoom(Crocodoc.ZOOM_AUTO);
            }
        },
        handle_page_button: function (e, direction) {
            // Indicate that this instance has sent a page_change event.
            if (window.user.get('role') === 'teacher') {
                this.sent_here = true;
            }
            e.preventDefault();
            this.flip_page(direction);
        },
        prev: function (e) {
            Accessibility.SR_alert(this.model.get('title') + ', page' + this.current_page);
            this.handle_page_button(e, -1);
            /* debounce makes it so that we buffer page changes for 0.5s
               before saving, in case the prof is spamming "next" to skip
               slides */
            _.debounce(this.save_current_page(), 500);
        },
        next: function (e) {
            Accessibility.SR_alert(this.model.get('title') + ', page' + this.current_page);
            this.handle_page_button(e, 1);
            _.debounce(this.save_current_page(), 500);
        },
        save_current_page: function () {
            if (window.user.get('role') === 'teacher' && !this.model.isNew()) {
                this.model.save({ current_page: this.current_page }, { patch: true });
            }
        },
        keydown: function (e) {
            if (e.which === 37) {
                // left arrow
                this.prev(e);
            } else if (e.which === 39) {
                // right arrow
                this.next(e);
            }
        },
        resize: function () {
            if (this.docviewer) {
                // Fill viewer height to entire container
                var new_height = this.$('.docviewer').height() - 1;
                if (new_height <= 0) {
                    // Reset height when closing magnification
                    new_height = '';
                }
                this.$('.crocodoc-viewport').css('height', new_height);
                this.docviewer.zoom(Crocodoc.ZOOM_AUTO);
            }

            if (window.is_fullscreen) {
                this.bind_keys();
            } else {
                // the user hit escape to exit fullscreen
                this.unbind_keys();
            }
            this.fit_page();
        },
        cleanup: function () {
            if (this.docviewer) {
                this.docviewer.destroy();
            }
            this.unbind_keys();
            $(window).off('resize', this.resize);
            this.$el.removeClass('fullscreen');
        },
        requestFullScreen: function () {
            if (_.isFunction(this.el.requestFullScreen)) {
                this.el.requestFullScreen();
            } else if (_.isFunction(this.el.webkitRequestFullScreen)) {
                this.el.webkitRequestFullScreen();
            }else if (_.isFunction(this.el.mozRequestFullScreen)) {
                this.el.mozRequestFullScreen();
            }
        },
        cancelFullScreen: function () {
            if (_.isFunction(document.cancelFullScreen)) {
                document.cancelFullScreen();
            } else if (_.isFunction(document.webkitCancelFullScreen)) {
                document.webkitCancelFullScreen();
            } else if (_.isFunction(document.mozCancelFullScreen)) {
                document.mozCancelFullScreen();
            }
            this.cleanup();
        },
        isFullScreen: function () {
            return document.fullScreen || document.webkitIsFullScreen || document.mozfullScreen;
        },
        bind_keys: function () {
            $(window)
                .unbind('keydown', this.keydown)
                .bind('keydown', this.keydown);
        },
        unbind_keys: function () {
            $(window).unbind('keydown', this.keydown);
        },
        viewer_page_change: function (e) {
            /**
             * Handler for the viewer.js pagefocus event which occurs after
             * the docviewer has switched to a different page.
             * @param {Object} data Houdini event data.
             */
            this.current_page = e.data.page;
            this.fit_page();
            this._update_page_flip_controls();
        },
        _is_android: function () {
            return /android/i.test(navigator.userAgent);
        },
        _update_page_flip_controls: function () {
            var prev_controls = this.$el.find('.embed_controls_prev, .embed_mobile_pagination .embed_prev_page a');
            var next_controls = this.$el.find('.embed_controls_next, .embed_mobile_pagination .embed_next_page a');

            if (this._is_android()) {
                prev_controls.removeClass('disabled');
                next_controls.removeClass('disabled');
                return;
            }

            if (this.current_page > 1) {
                prev_controls.removeClass('disabled');
            } else {
                prev_controls.addClass('disabled');
            }

            if (this.current_page < this._current_max_flippable_page()) {
                next_controls.removeClass('disabled');
            } else {
                next_controls.addClass('disabled');
            }
        },
        fit_page: function () {
            if (!this.docviewer) {
                return;
            }

            var doc = this.$el.find('.crocodoc-doc');

            this.docviewer.zoom(Crocodoc.ZOOM_AUTO);
        },
        draw: function (e) {
            if (e) {
                e.preventDefault();
            }
            this.$el.toggleClass('draw_active');
            $('body').removeClass('erase_annotation');
        },
        toggle_erase: function (e) {
            e.preventDefault();
            $('body').toggleClass('erase_annotation');
            this.$el.removeClass('draw_active');
        },
        render_annotations: function () {
            this.annotation.fetch().done(function () {
                this.$el.find('.crocodoc-page').each(function (index, el) {
                    var annotationView = new AnnotationView({
                        model: this.annotation.get('pages').get(index)
                    });
                    $(el).append(annotationView.el);
                    annotationView.render();
                }.bind(this));
            }.bind(this));
        },
        render: function () {
            this.$el.html(this.spinner_template());
            var spinner = this.$el.find('.spinner-container').hide();
            var loading_error = this.$el.find('.loading-error').hide();

            var retries_attempted = 0;

            var render_content = function () {
                var FileModel = require('models/File');
                if (_.contains(FileModel.EMBED_TYPES, this.model.get('type')) && this.model.get('box_viewer_url')) {
                    // we only want to show docviewer if a panel is defined
                    // if a panel isn't defined, then there was a problem or the file was added to a page
                    // currently, docviewer (crocodocs) doesn't work in pages, so we hide it if it's been added to one
                    if (this.panel !== undefined) {
                        // generate a unique id for this element
                        var el_id = Math.uuid();
                        var data = this.model.toJSON();
                        data.el_id = el_id;
                        this.$el.html(this.embed_template(data));
                        $('#'+el_id).attr('aria-label', this.model.get('title'));

                        // Loads a file with Box View!
                        require('Modules').get_module('files').embed_file(this.model, $('#' + el_id), function (docviewer, num_pages) {
                            this.docviewer = docviewer;
                            this.num_pages = num_pages;
                            this.fit_page();

                            this.docviewer.on('pagefocus', this.viewer_page_change);
                            this.resize();

                            // Unfortunate hack to fix IE11 (WEB-6431),
                            // and possibly other browsers (Chrome?).
                            setTimeout(function () {
                                $(window).resize();
                            }, 100);

                            if (this.$el.closest('.ui-mobile').length) {
                                var page_height = this.$el.find('.crocodoc-page-visible').outerHeight();
                                this.$el.find('.crocodoc-viewer').css('height', page_height);
                                $(window).resize();
                            }

                            if (Browser.is_web()) {
                                this.draw();
                            }
                            this.render_annotations();
                            this.current_teacher_page = this.model.get('current_page');
                            this.docviewer.scrollTo(this.current_teacher_page);
                            this._update_page_flip_controls();
                            /* prevent students from seeing slides past the professor's current slide
                               on mobile web */
                            this.page_elements = this.$el.find('.page-outer');
                            this.mobile_hide_scrollable();
                        }.bind(this));
                    } else if (this.$el.attr('class') === 'details_target') {
                    // currently, docviewer is not supported in pages. when it is, this can be removed
                        this.$el.html(this.pages_download_template(this.model.toJSON()));
                        this.$el.find('#'+this.model.get('id')).click(function(){
                            window.open(this.model.get('url'), '_blank');
                        }.bind(this));
                    } else {
                        return;
                    }
                } else if (_.contains(FileModel.PREVIEW_TYPES, this.model.get('type'))) {
                    this.$el.html(this.preview_template(this.model.toJSON()));
                } else if (_.contains(FileModel.ARCHIVE_TYPES, this.model.get('type')) && this.model.get('html_path')) {
                    this.$el.html(this.archive_template(this.model.toJSON()));
                } else {
                    // same as above, don't want to display a download prompt within pages
                    if (this.panel !== undefined) {
                        this.$el.html(this.download_template(this.model.toJSON()));
                    } else if (this.$el.attr('class') === 'details_target') {
                    // if a panel isn't defined, then we are trying to display a file in pages
                        this.$el.html(this.pages_download_template(this.model.toJSON()));
                        this.$el.find('#'+this.model.get('id')).click(function(){
                            window.open(this.model.get('url'), '_blank');
                        }.bind(this));
                    }
                }
                $(window).on('resize', this.resize);
            }.bind(this);

            var get_deferred = function () {
                return this.model.fetch().done(function () {
                    render_content();
                });
            }.bind(this);
            retries_attempted = retry.retry_on_fail(spinner, loading_error, get_deferred);
        }
    });

    return FilesView;
});
