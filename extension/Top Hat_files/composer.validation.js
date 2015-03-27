/* global _ */
/*
    COMPOSER VALIDATION:

    This page covers how to add validation functions to Composer, as well as
    initializing the built-in validation functions

    Creating a new validation function:

    Validation functions take one variable, which provides the value of the form item. The validation form
    then determines if the value is valid, and returns a true boolean value if true, or a false or string value if the value is invalid.
    If a false boolean is returned, the item will be simply marked as invalid. If a string is returned, the item will be marked as invalid,
    and the string of text will be shown to inform the user why their input was invalid.

    Validation functions are called by composerItem instances, and calling the `this` variable inside of a function will return the
    `composerItem` instance that is being validated.

    Validation functions are stored in the $.fn.composerValidation dictionary. To add a new function, simply add another value
    to the dictionary. The key will be used to identify the validation type.

    Example:

        $.fn.composerValidation.test_validation = function(item_val) {
            return 'This will always fail';
        }

        $('#form').composer({
            'id': 'test_item',
            'type': 'checkbox',
            'label': 'This is a test checkbox',
            'validation': ['test_validation']
        });

    When a form is created, the $.fn.composerValidation dictionary is cloned. Extending the composerValidation dictionary after a
    form is initalized will not propagate the new validation function to exiting forms. Forms can be provided with validation functions
    on-the-fly through the .addValidation method

    Example:

        var form = $('#form').composer();

        form.addValidation('test_validation', function(item_val) {
            return 'This will always fail';
        });

        form.add({
            'id': 'test_item',
            'type': 'checkbox',
            'label': 'This is a test checkbox',
            'validation': ['test_validation']
        });
*/

(function () {
    'use strict';
    $.fn.composerValidation.does_not_contain_string = function(item_value) {
        var valid = true;
        var string_to_find = this.get('does_not_contain_string');
        var map_of_non_readables = {
            ',': 'comma'
        };

        var get_readable_string = function(string) {
            var readable_string = '\'' + string + '\'';

            if (_.keys(map_of_non_readables).indexOf(string) !== -1) {
                readable_string = map_of_non_readables[string];
            }

            return readable_string;
        };

        var contains_invalid_string = function(string_to_search) {
            if (string_to_search.indexOf(string_to_find) !== -1) {
                return 'Value cannot contain ' + get_readable_string(string_to_find);
            }

            return true;
        };

        var process_item_value = function(item_value) {
            if (_.isString(item_value)) {
                valid = contains_invalid_string(item_value);
            } else if (_.isArray(item_value)) {
                $.each(item_value, function(index, array) {
                    // No need to process the rest of the array
                    // if we found a error, so we can break out of the loop
                    if (valid !== true) {
                        return false;
                    }

                    process_item_value(array);
                });
            }
        };

        process_item_value(item_value);

        return valid;
    };
    $.fn.composerValidation.num_greater_than= function(item_val) {
        var c = parseInt( this.get('num_greater_than') , 10);
        if( isNaN(parseFloat(item_val)) || (parseFloat(item_val) <= c) ) {
            return 'Value must be greater than ' + c;
        } else {
            return true;
        }
    };
    $.fn.composerValidation.num_greater_than_equal = function(item_val) {
        var c = parseInt( this.get('num_greater_than_equal') , 10);
        var noLimit = _.isNaN(item_val);

        if( !noLimit && (parseFloat(item_val) < c) ) {
            return 'Value must be greater than or equal to ' + c;
        } else {
            return true;
        }
    };
    $.fn.composerValidation.num_less_than = function(item_val) {
        var c = parseInt( this.get('num_less_than') , 10);
        if( isNaN(parseFloat(item_val)) || (parseFloat(item_val) >= c) ) {
            return 'Value must be less than ' + c;
        } else {
            return true;
        }
    };
    $.fn.composerValidation.num_less_than_equal = function(item_val) {
        var c = parseInt( this.get('num_less_than_equal') , 10);
        if( isNaN(parseFloat(item_val)) || (parseFloat(item_val) > c) ) {
            return 'Value must be less than or equal to ' + c;
        } else {
            return true;
        }
    };
    $.fn.composerValidation.number = function(item_val) {
        if (isNaN(Number(item_val))) {
            return 'Value must be a valid number';
        } else {
            return true;
        }
    };
    $.fn.composerValidation.not_empty = function(item_val) {
        var valid = false;
        if( typeof(item_val) === 'string') {
            //"value" == :), "    " == :(, "" == :(
            //if( item_val.trim() !== "" ) {
            if( $.trim(item_val) !== '') {
                valid = true;
            }
        } else if( typeof(item_val) === 'object') {
            //{0: "value 1", 1: "value 2"} == :), {0: "value 1"} == :), {0: "   "} == :(, {} == :(

            //loop through items and return list with true/false based on if they have empty values
            var results = _.map(item_val, function(item) {
                if( typeof(item) === 'string' ) {
                    //return item.trim() === "";
                    return $.trim(item) === '';
                } else if (typeof(item) === 'object') {
                    if ($.isEmptyObject(item)) {
                        return true;
                    } else {
                        var recurse = $.fn.composerValidation.not_empty(item);
                        if (typeof recurse === 'string') {
                            return true;
                        } else {
                            return false;
                        }
                    }
                } else if (typeof (item) === 'boolean') {
                    return false;
                } else if( typeof(item) !== 'undefined' ) {
                    return false;
                } else {
                    return true;
                }
            });
            if( results.length > 0 && !_.include(results, true) ) {
                valid = true;
            }
        } else if (typeof (item_val) === 'number') {
            valid = true;
        }


    if( !valid ) {
        return 'Value must not be empty';
    } else {
        return true;
    }
};
$.fn.composerValidation.integer= function(item_val) {
    'use strict';
    if( parseInt(item_val, 10) !== (item_val-0) ) {
        return 'Value must be an integer';
    } else {
        return true;
    }
};
$.fn.composerValidation.number = function(item_val) {
    'use strict';
    if (!_.isNull(item_val) && !_.isUndefined(item_val) && _.contains(item_val.toString(), '^')) {
        item_val = item_val.replace('^', '');
        item_val = item_val.replace(/-/g, '');
        item_val = item_val.replace('.', '');
    }

    if( parseFloat(item_val) !== (item_val-0) ) {
        return 'Value must be a number';
    } else {
        return true;
    }

};
$.fn.composerValidation.longer_than = function(item_val) {
    'use strict';
    var is_empty = $.fn.composerValidation.not_empty.apply(this, [item_val]);
    if( is_empty !== true ) {
        return is_empty;
    }

    var c = parseInt( this.get('longer_than') , 10);
    if( item_val.length <= c ) {
        return 'Value must be more than ' + c + ' characters long';
    } else {
        return true;
    }
};
$.fn.composerValidation.shorter_than = function(item_val) {
    'use strict';
    var is_empty = $.fn.composerValidation.not_empty.apply(this, [item_val]);
    if( is_empty !== true ) {
        return is_empty;
    }

    var c = parseInt( this.get('shorter_than') , 10);
    if( item_val.length >= c ) {
        return 'Value must be less than ' + c + ' characters long';
    } else {
        return true;
    }
};
$.fn.composerValidation.not_zip = function(item_val) {
    'use strict';
    var is_empty = $.fn.composerValidation.not_empty.apply(this, [item_val]);
    var exp = /^.*\.zip$/;
    if( is_empty !== true ) {
        return is_empty;
    } else if ( exp.test(item_val) ) {
        return 'Freemium users cannot upload zip files.';
    } else {
        return true;
    }
};
$.fn.composerValidation.image = function(item_val) {
    'use strict';
    var is_empty = $.fn.composerValidation.not_empty.apply(this, [item_val]);
    var exp = /^.*\.(jpg|jpeg|gif|bmp|png)$/i;
    if( is_empty !== true ) {
        return is_empty;
    } else if ( !exp.test(item_val) ) {
        return 'File must have one of these extensions:  .jpeg  .gif  .bmp  .png';
    } else {
        return true;
    }
};
$.fn.composerValidation.filename = function(item_val) {
    'use strict';
    // This validator accepts blank values.
    if (!item_val) { return true; }
        var c = parseInt( this.get('longer_than') , 10);
        if( item_val.length <= c ) {
            return 'Value must be more than ' + c + ' characters long';
        } else {
            return true;
        }
    };
    $.fn.composerValidation.shorter_than = function(item_val) {
        var is_empty = $.fn.composerValidation.not_empty.apply(this, [item_val]);
        if( is_empty !== true ) {
            return is_empty;
        }

        var c = parseInt( this.get('shorter_than') , 10);
        if( item_val.length >= c ) {
            return 'Value must be less than ' + c + ' characters long';
        } else {
            return true;
        }
    };
    $.fn.composerValidation.not_zip = function(item_val) {
        var is_empty = $.fn.composerValidation.not_empty.apply(this, [item_val]);
        var exp = /\.zip$/i;
        if( is_empty !== true ) {
            return is_empty;
        } else if ( exp.test(item_val) ) {
            return 'Freemium users cannot upload zip files.';
        } else {
            return true;
        }
    };
    $.fn.composerValidation.image_if_not_empty = function(filename) {
        var is_not_empty = $.fn.composerValidation.not_empty.apply(this, [filename]);
        var exp = /\.(jpg|jpeg|gif|bmp|png|tiff)$/i;
        if(is_not_empty !== true ) {
            return true;
        } else if (!exp.test(filename)) {
            return 'File must have one of these extensions: .jpeg .gif .bmp .png .tiff';
        } else {
            return true;
        }
    };
    $.fn.composerValidation.filename = function(item_val) {
        // This validator accepts blank values.
        if (!item_val) { return true; }

        var exp = /^[^\\/:*?"<>|]*$/;
        if( !exp.test(item_val) ){
            return 'Value must be valid filename';
        } else {
            return true;
        }
    };
    $.fn.composerValidation._valid_email = function(email_str) {
        var reg = /^([A-Za-z0-9$-/:-?{-~!"^_`\[\]])+\@([A-Za-z0-9$-/:-?{-~\.{1}])+\.([A-Za-z]{1,15})\w+$/;
        return reg.test(email_str);
    };
    $.fn.composerValidation.email = function(item_val) {
        if(!$.fn.composerValidation._valid_email(item_val)) {
            return 'Value must be a valid email address';
        } else {
            return true;
        }
    };
    $.fn.composerValidation.email_list = function(item_val) {
        var pattern = new RegExp(',', 'g');
        var no_commas = item_val.replace(pattern, ' ');
        var email_list = no_commas.split(' ');
        var pass = true;
        $.each(email_list, function (i, email){
            if(email.length === 0) {
                return;
            }
            if($.fn.composerValidation._valid_email(email)) {
                return;
            }
            pass=false;
        });
        if(!pass) {
            return 'Value must be a list of email addresses, separated by spaces or commas.';
        }
        return true;

    };


    /**
    Validates that the file upload is complete for an 'upload' widget.
    **/
    $.fn.composerValidation.upload_completed = function (item_val){
        if (_.isArray(item_val)) {
            var fileobj_key = item_val[1];
            if (fileobj_key) {
                // Upload has completed.
                return true;
            }
        }
        else if (item_val === null || item_val === undefined) {
            // Upload failed or never started.
            return true;
        }

        // item_val should be a string with the file name selected. Upload should
        // be in progress.
        return 'Please wait until the file upload is complete.';
    };
})();
