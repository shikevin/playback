/**
 * @fileoverview common utility definition
 * @author clakenen
 */

/**
 * Common utility functions used throughout Crocodoc JS
 */
Crocodoc.addUtility('common', function () {

    'use strict';

    var util = {};

    util.extend = $.extend;
    util.each = $.each;
    util.map = $.map;
    util.parseJSON = $.parseJSON;

    return $.extend(util, {

        /**
         * Left bistect of list, optionally of property of objects in list
         * @param   {Array} list List of items to bisect
         * @param   {number} x    The number to bisect against
         * @param   {string} [prop] Optional property to check on list items instead of using the item itself
         * @returns {int}      The index of the bisection
         */
        bisectLeft: function (list, x, prop) {
            var val, mid, low = 0, high = list.length;
            while (low < high) {
                mid = Math.floor((low + high) / 2);
                val = prop ? list[mid][prop] : list[mid];
                if (val < x) {
                    low = mid + 1;
                } else {
                    high = mid;
                }
            }
            return low;
        },

        /**
         * Right bistect of list, optionally of property of objects in list
         * @param   {Array} list List of items to bisect
         * @param   {number} x    The number to bisect against
         * @param   {string} [prop] Optional property to check on list items instead of using the item itself
         * @returns {int}      The index of the bisection
         */
        bisectRight: function (list, x, prop) {
            var val, mid, low = 0, high = list.length;
            while (low < high) {
                mid = Math.floor((low + high) / 2);
                val = prop ? list[mid][prop] : list[mid];
                if (x < val) {
                    high = mid;
                } else {
                    low = mid + 1;
                }
            }
            return low;
        },

        /**
         * Clamp x to range [a,b]
         * @param   {number} x The value to clamp
         * @param   {number} a Low value
         * @param   {number} b High value
         * @returns {number}   The clamped value
         */
        clamp: function (x, a, b) {
            if (x < a) {
                return a;
            } else if (x > b) {
                return b;
            }
            return x;
        },

        /**
         * Returns the sign of the given number
         * @param   {number} value The number
         * @returns {number}       The sign (-1 or 1), or 0 if value === 0
         */
        sign: function(value) {
            var number = parseInt(value, 10);
            if (!number) {
                return number;
            }
            return number < 0 ? -1 : 1;
        },

        /**
         * Returns true if the given value is a function
         * @param   {*} val Any value
         * @returns {Boolean} true if val is a function, false otherwise
         */
        isFn: function (val) {
            return typeof val === 'function';
        },

        /**
         * Search for a specified value within an array, and return its index (or -1 if not found)
         * @param   {*} value       The value to search for
         * @param   {Array} array   The array to search
         * @returns {int}           The index of value in array or -1 if not found
         */
        inArray: function (value, array) {
            if (util.isFn(array.indexOf)) {
                return array.indexOf(value);
            } else {
                return $.inArray(value, array);
            }
        },

        /**
         * Constrains the range [low,high] to the range [0,max]
         * @param   {number} low  The low value
         * @param   {number} high The high value
         * @param   {number} max  The max value (0 is implicit min)
         * @returns {Object}      The range object containing min and max values
         */
        constrainRange: function (low, high, max) {
            var length = high - low;
            low = util.clamp(low, 0, max);
            high = util.clamp(low + length, 0, max);
            if (high - low < length) {
                low = util.clamp(high - length, 0, max);
            }
            return {
                min: low,
                max: high
            };
        },

        /**
         * Make the given path absolute
         *  - if path doesn't contain protocol and domain, prepend the current protocol and domain
         *  - if the path is relative (eg. doesn't begin with /), also fill in the current path
         * @param   {string} path The path to make absolute
         * @returns {string}      The absolute path
         */
        makeAbsolute: function (path) {
            var location = window.location,
                pathname = location.pathname;
            if (/^http|^\/\//i.test(path)) {
                return path;
            }
            if (path.charAt(0) !== '/') {
                if (pathname.lastIndexOf('/') !== pathname.length - 1) {
                    pathname = pathname.substring(0, pathname.lastIndexOf('/') + 1);
                }
                path = pathname + path;
            }
            return location.protocol + '//' + location.host + path;
        },

        /**
         * Return the current time since epoch in ms
         * @returns {int} The current time
         */
        now: function () {
            return (new Date()).getTime();
        },

        /**
         * Creates and returns a new, throttled version of the passed function,
         * that, when invoked repeatedly, will only actually call the original
         * function at most once per every wait milliseconds
         * @param   {int}      wait Time to wait between calls in ms
         * @param   {Function} fn   The function to throttle
         * @returns {Function}      The throttled function
         */
        throttle: function (wait, fn) {
            var context,
                args,
                timeout,
                result,
                previous = 0;

            function later () {
                previous = util.now();
                timeout = null;
                result = fn.apply(context, args);
            }

            return function throttled() {
                var now = util.now(),
                    remaining = wait - (now - previous);
                context = this;
                args = arguments;
                if (remaining <= 0) {
                    clearTimeout(timeout);
                    timeout = null;
                    previous = now;
                    result = fn.apply(context, args);
                } else if (!timeout) {
                    timeout = setTimeout(later, remaining);
                }
                return result;
            };
        },

        /**
         * Creates and returns a new debounced version of the passed function
         * which will postpone its execution until after wait milliseconds
         * have elapsed since the last time it was invoked.
         * @param   {int}      wait Time to wait between calls in ms
         * @param   {Function} fn   The function to debounced
         * @returns {Function}      The debounced function
         */
        debounce: function (wait, fn) {
            var context,
                args,
                timeout,
                timestamp,
                result;

            function later() {
                var last = util.now() - timestamp;
                if (last < wait) {
                    timeout = setTimeout(later, wait - last);
                } else {
                    timeout = null;
                    result = fn.apply(context, args);
                    context = args = null;
                }
            }

            return function debounced() {
                context = this;
                args = arguments;
                timestamp = util.now();
                if (!timeout) {
                    timeout = setTimeout(later, wait);
                }
                return result;
            };
        },

        /**
         * Insert the given CSS string into the DOM and return the resulting DOMElement
         * @param   {string} css The CSS string to insert
         * @returns {Element}    The <style> element that was created and inserted
         */
        insertCSS: function (css) {
            var styleEl = document.createElement('style'),
                cssTextNode = document.createTextNode(css);
            try {
                styleEl.setAttribute('type', 'text/css');
                styleEl.appendChild(cssTextNode);
            } catch (err) {
                // uhhh IE < 9
            }
            document.getElementsByTagName('head')[0].appendChild(styleEl);
            return styleEl;
        },

        /**
         * Append a CSS rule to the given stylesheet
         * @param   {CSSStyleSheet} sheet The stylesheet object
         * @param   {string} selector     The selector
         * @param   {string} rule         The rule
         * @returns {int}                 The index of the new rule
         */
        appendCSSRule: function (sheet, selector, rule) {
            var index;
            if (sheet.insertRule) {
                return sheet.insertRule(selector + '{' + rule + '}', sheet.cssRules.length);
            } else {
                index = sheet.addRule(selector, rule, sheet.rules.length);
                if (index < 0) {
                    index = sheet.rules.length - 1;
                }
                return index;
            }
        },

        /**
         * Delete a CSS rule at the given index from the given stylesheet
         * @param   {CSSStyleSheet} sheet The stylesheet object
         * @param   {int} index           The index of the rule to delete
         * @returns {void}
         */
        deleteCSSRule: function (sheet, index) {
            if (sheet.deleteRule) {
                sheet.deleteRule(index);
            } else {
                sheet.removeRule(index);
            }
        },

        /**
         * Get the parent element of the (first) text node that is currently selected
         * @returns {Element} The selected element
         * @TODO: return all selected elements
         */
        getSelectedNode: function () {
            var node, sel, range;
            if (window.getSelection) {
                sel = window.getSelection();
                if (sel.rangeCount) {
                    range = sel.getRangeAt(0);
                    if (!range.collapsed) {
                        node = sel.anchorNode.parentNode;
                    }
                }
            } else if (document.selection) {
                node = document.selection.createRange().parentElement();
            }
            return node;
        },

        /**
         * Cross-browser getComputedStyle, which is faster than jQuery.css
         * @param   {HTMLElement} el      The element
         * @returns {CSSStyleDeclaration} The computed styles
         */
        getComputedStyle: function (el) {
            if ('getComputedStyle' in window) {
                return window.getComputedStyle(el);
            }
            return el.currentStyle;
        },

        /**
         * Calculates the size of 1pt in pixels
         * @returns {number} The pixel value
         */
        calculatePtSize: function () {
            var width,
                px,
                testSize = 10000,
                div = document.createElement('div');
            div.style.display = 'block';
            div.style.position = 'absolute';
            div.style.width = testSize + 'pt';
            document.body.appendChild(div);
            width = util.getComputedStyle(div).width;
            px = parseFloat(width) / testSize;
            document.body.removeChild(div);
            return px;
        },

        /**
         * Count and return the number of occurrences of token in str
         * @param   {string} str   The string to search
         * @param   {string} token The string to search for
         * @returns {int}          The number of occurrences
         */
        countInStr: function (str, token) {
            var total = 0, i;
            while ((i = str.indexOf(token, i) + 1)) {
                total++;
            }
            return total;
        },

        /**
         * Apply the given data to a template
         * @param   {string} template  The template
         * @param   {Object} data The data to apply to the template
         * @returns {string}      The filled template
         */
        template: function (template, data) {
            var p;
            for (p in data) {
                if (data.hasOwnProperty(p)) {
                    template = template.replace(new RegExp('\\{\\{' + p + '\\}\\}', 'g'), data[p]);
                }
            }
            return template;
        },

        /**
         * Returns true if the given url is external to the current domain
         * @param   {string}  url The URL
         * @returns {Boolean} Whether or not the url is external
         */
        isCrossDomain: function (url) {
            var protocolRegExp = /^(http(s)?|file)+:\/\//;
            function getDomain(url) {
                return url.replace(protocolRegExp, '').split('/')[0];
            }
            return protocolRegExp.test(url) &&
                getDomain(location.href) !== getDomain(url);
        }
    });
});
