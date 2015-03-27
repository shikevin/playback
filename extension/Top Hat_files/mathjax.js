define(['underscore'], function (_) {
    'use strict';

    return {
        el_queue: [],
        is_loaded: !_.isUndefined(window.MathJax),
        math_tag_test: /(\[math\]|\$\$)/i,

        execute_mathjax: function (el) {
            /**
             * Loads and applies mathjax to the element if math tags exist.
             * 
             * @param {Object} el Node to apply mathjax to.
             */
            if (el) {
                // If an element is present, check if it has mathjax elements
                // if not, end the journey here
                var has_mathjax_data = this.math_tag_test.test(el.innerHTML);
                if (!has_mathjax_data) {
                    return false;
                }

                this._execute_mathjax_on_el(el);
            }
            return false;
        },

        execute_mathjax_on_queued_els: function () {
            _.each(this.el_queue, function (el) {
                window.MathJax.Hub.Queue(['Typeset', window.MathJax.Hub, el]);
            }.bind(this));
            this.el_queue = [];
        },

        _execute_mathjax_on_el: function (el) {
            this.el_queue.push(el);
            if (!this.is_loaded) {
                this._initialize_mathjax();
            } else if (!_.isUndefined(window.MathJax)) {
                this.execute_mathjax_on_queued_els();
            }
        },

        _initialize_mathjax: function () {
            /**
             * Load the mathjax script into window.MathJax.
             */
            this.is_loaded = true;
            var script = document.createElement('script');
            script.type = 'text/javascript';
            script.src  = '//cdn.mathjax.org/mathjax/latest/MathJax.js?config=TeX-AMS-MML_HTMLorMML';

            var config = 'MathJax.Hub.Config({' +
                'messageStyle: "none",' +
                'skipStartupTypeset: true,' +
                'tex2jax: {inlineMath: [["[math]","[/math]"]]},' +
                '"HTML-CSS": { "linebreaks": { "automatic": false, width: "container" } }, ' +
                '"SVG": { "linebreaks": { "automatic": false, width: "container" } }' +
                '});' +
                'MathJax.Hub.Startup.onload();' +
                'require("mathjax").execute_mathjax_on_queued_els();';
            script.text = config;

            document.getElementsByTagName('head')[0].appendChild(script);
        }
    };
});
