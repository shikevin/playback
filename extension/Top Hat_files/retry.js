/* globals _, define */
define([], function () {
    'use strict';
    var Retry = {
        retry_on_fail: function (spinner, loading_error, deferred_callback, options){
            /* retry_on_fail: Retries on xhr failure.
                    deferred_callback needs to a function which returns a deferred object.
                    Optional params: retry_interval_values
                Returns retries_attempted
            */
            var retries_attempted = 0;
            var retry_on_fail_inner = function (spinner, loading_error, deferred_callback, retries_attempted, options){
                var loading_retry_interval_seconds = 3;
                var loading_retry_interval_fuzz_seconds = 2;
                var loading_retry_interval_backoff_factor = 0.333;
                var loading_retry_interval_backoff_max_seconds = 10;

                if (!_.isUndefined(options)) {
                    loading_retry_interval_seconds = options.loading_retry_interval_seconds;
                    loading_retry_interval_fuzz_seconds = options.loading_retry_interval_fuzz_seconds;
                    loading_retry_interval_backoff_factor = options.loading_retry_interval_backoff_factor;
                    loading_retry_interval_backoff_max_seconds = options.loading_retry_interval_backoff_max_seconds;
                }

                loading_error.hide();
                spinner.show();

                var xhr = deferred_callback();

                xhr.done(function () {
                    spinner.hide();
                });

                xhr.fail(function () {
                    var countdown = loading_retry_interval_seconds;

                    retries_attempted += 1;
                    countdown += Math.min(
                        loading_retry_interval_backoff_max_seconds,
                        Math.round(
                            countdown *
                            (retries_attempted - 1) *
                            loading_retry_interval_backoff_factor)
                    );

                    var interval_id;
                    var tick = function () {
                        if (countdown === 0) {
                            clearInterval(interval_id);

                            loading_error.hide();

                            var fuzz_interval = (
                                Math.random() *
                                loading_retry_interval_fuzz_seconds * 1000);
                            _.delay(retry_on_fail_inner, fuzz_interval, spinner, loading_error, deferred_callback, retries_attempted, options);

                            return retries_attempted;
                        }

                        loading_error.html(
                            '<strong>Connection to Top Hat failed.</strong> Retrying in ' +
                            countdown + '…');
                        loading_error.show();

                        countdown -= 1;
                    }.bind(this);
                    interval_id = setInterval(tick, 1000);
                    tick();
                }.bind(this));

                return retries_attempted;
            };

            return retry_on_fail_inner(spinner, loading_error, deferred_callback, retries_attempted, options);
        }
    };
    return Retry;
});
