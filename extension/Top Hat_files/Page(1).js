/**
 * @fileoverview Page component
 * @author clakenen
 */

/**
 * Page component
 */
Crocodoc.addComponent('page', function (scope) {

    'use strict';

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    var CSS_CLASS_PAGE_PREFIX = 'crocodoc-page-',
        CSS_CLASS_PAGE_LOADING = CSS_CLASS_PAGE_PREFIX + 'loading',
        CSS_CLASS_PAGE_ERROR = CSS_CLASS_PAGE_PREFIX + 'error',
        CSS_CLASS_PAGE_TEXT = CSS_CLASS_PAGE_PREFIX + 'text',
        CSS_CLASS_PAGE_SVG = CSS_CLASS_PAGE_PREFIX + 'svg',
        CSS_CLASS_PAGE_LINKS = CSS_CLASS_PAGE_PREFIX + 'links';

    var support = scope.getUtility('support'),
        util = scope.getUtility('common');

    var $el,
        pageText, pageContent, pageLinks,
        pageNum, index,
        isVisible, status,
        loadRequested = false;

    return {
        errorCount: 0,

        messages: ['pageavailable', 'textenabledchange', 'pagefocus', 'zoom'],

        /**
         * Handle framework messages
         * @param {string} name The name of the message
         * @param {Object} data The related data for the message
         * @returns {void}
         */
        onmessage: function (name, data) {
            switch (name) {
                case 'pageavailable':
                    if (data.page === index + 1 || data.upto > index) {
                        if (status === Crocodoc.PAGE_STATUS_CONVERTING) {
                            status = Crocodoc.PAGE_STATUS_NOT_LOADED;
                        }
                    }
                    break;
                case 'textenabledchange':
                    if (data.enabled === true) {
                        this.enableTextSelection();
                    } else {
                        this.disableTextSelection();
                    }
                    break;
                case 'pagefocus':
                    // falls through
                case 'zoom':
                    isVisible = pageNum === data.page || (util.inArray(pageNum, data.visiblePages) > -1);
                    break;

                // no default
            }
        },

        /**
         * Initialize the Page component
         * @returns {void}
         */
        init: function ($pageEl, config) {
            var $text, $svg, $links;
            $el = $pageEl;
            $svg = $pageEl.find('.' + CSS_CLASS_PAGE_SVG);
            $text = $pageEl.find('.' + CSS_CLASS_PAGE_TEXT);
            $links = $pageEl.find('.' + CSS_CLASS_PAGE_LINKS);

            config.url = config.url || '';
            pageText = scope.createComponent('page-text');
            pageContent = support.svg ?
                    scope.createComponent('page-svg') :
                    scope.createComponent('page-img');

            pageText.init($text, config);
            pageContent.init($svg, config);

            if (config.enableLinks && config.links.length) {
                pageLinks = scope.createComponent('page-links');
                pageLinks.init($links, config.links);
            }

            status = config.status || Crocodoc.PAGE_STATUS_NOT_LOADED;
            index = config.index;
            pageNum = index + 1;
            this.config = config;
        },

        /**
         * Destroy the page component
         * @returns {void}
         */
        destroy: function () {
            this.unload();
        },

        /**
         * Preload the SVG if the page is not loaded
         * @returns {void}
         */
        preload: function () {
            if (status === Crocodoc.PAGE_STATUS_NOT_LOADED) {
                pageContent.preload();
                pageText.preload();
            }
        },

        /**
         * Load and show SVG and text assets for this page
         * @returns {$.Promise}    jQuery Promise object or false if the page is not loading
         */
        load: function () {
            var page = this,
                $pageTextPromise;
            loadRequested = true;

            if (status === Crocodoc.PAGE_STATUS_LOADED || status === Crocodoc.PAGE_STATUS_LOADING) {
                // try to load the text layer even though status is loaded,
                // because it might have been disabled the last time page
                // load was requested
                $pageTextPromise = pageText.load();
                // if the page is not loading, return false
                if ($pageTextPromise && $pageTextPromise.state() !== 'pending') {
                    return false;
                }
                return $pageTextPromise;
            }

            // don't actually load if the page is converting
            if (status === Crocodoc.PAGE_STATUS_CONVERTING) {
                return false;
            }

            $el.removeClass(CSS_CLASS_PAGE_ERROR);

            //load page
            status = Crocodoc.PAGE_STATUS_LOADING;
            return $.when(pageContent.load(), pageText.load())
                .done(function handleLoadDone() {
                    if (loadRequested) {
                        status = Crocodoc.PAGE_STATUS_LOADED;
                        $el.removeClass(CSS_CLASS_PAGE_LOADING);
                        scope.broadcast('pageload', { page: pageNum });
                    } else {
                        page.unload();
                    }
                })
                .fail(function handleLoadFail() {
                    status = Crocodoc.PAGE_STATUS_NOT_LOADED;
                    $el.removeClass(CSS_CLASS_PAGE_LOADING);
                });
        },


        /**
         * Mark the page as failed, i.e., loading will not be retried again for this page
         * and broadcast a pagefail event for this page
         * @param {Object} error The error object
         * @returns {void}
         */
        fail: function (error) {
            status = Crocodoc.PAGE_STATUS_ERROR;
            $el.addClass(CSS_CLASS_PAGE_ERROR);
            scope.broadcast('pagefail', { page: index + 1, error: error });
        },

        /**
         * Unload/hide SVG and text assets for this page
         * @returns {void}
         */
        unload: function () {
            loadRequested = false;
            pageContent.unload();
            pageText.unload();
            if (status === Crocodoc.PAGE_STATUS_LOADED) {
                status = Crocodoc.PAGE_STATUS_NOT_LOADED;
                $el.addClass(CSS_CLASS_PAGE_LOADING);
                $el.removeClass(CSS_CLASS_PAGE_ERROR);
                scope.broadcast('pageunload', { page: pageNum });
            }
        },

        /**
         * Enable text selection, loading text assets if the page is visible
         * @returns {void}
         */
        enableTextSelection: function () {
            pageText.enable();
            if (isVisible) {
                pageText.load();
            }
        },

        /**
         * Disable text selection
         * @returns {void}
         */
        disableTextSelection: function () {
            pageText.disable();
        }
    };
});


