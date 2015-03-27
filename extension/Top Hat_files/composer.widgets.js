/* global _, publisher */

/**
# COMPOSER WIDGETS

Widgets are dictionary objects that contain all the logic for creating, populating, and serializing form types.

This page covers how to add widgets to Composer, as well as
initializing the built-in widgets.

## Creating a new widget object.

Widget objects must have the following structure:

    {
        //renders the form element in the dom and binds any necessary events
        //do not set the value of the element here - it will be done automatically (by calling 'set_value' after initialization)

        //the intialize command should update the composerItem's value when the form element is changed (see example)
        initialize: function() {},

        //updates the form element with the item's value (accessible via this.get('value'))
        set_value: function( val ) {},

        //takes a validation message and renders it on the screen; may take a string value or a false boolean, which should
        //cause the validation message to be hidden
        set_validation_message: function(msg) {}
    }

Widget objects are called by composerItem instances, and calling the `this` variable inside of a function will return the
`composerItem` instance that is being validated. The item's value, DOM element, data, and more should be accessed by calling
this.get(...). These are common properies that will be accessed by most widget objects:

    - this.get('id');
    - this.get('el'); //the DOM element assigned to the widget
    - this.get('label');
    - this.value(); //get the value set in the composerItem instance
    - this.value( val ); //set the composerItem instance's value (will call widget's 'set_value' function)

Validation functions are stored in the $.fn.composerWidgets dictionary. To add a new function, simply add another value
to the dictionary. The key will be used to identify the validation type.

Example:

    $.fn.composerWidgets.test_type = {
        initialize: function() {
            var html = '<input type=\'text\' id=\'' + this.get('id') + '\'>';
            $(this.get('el')).html(html);
            this.value( this.value() );

            //bind for value change
            var item = this;
            $(this.get('el')).find('input').bind('change', function(tst) {
                item.value( $(this).val() );
            });
        },
        set_value: function( val ) {
            $(this.get('el')).find('input').val( val );
        },
        set_validation_message: function(msg) {
            $(this.get('el')).find('.error').html(msg);
        }
    };


    $('#form').composer({
        id: 'test_item',
        type: 'test_type',
        label: 'This is a test item',
    });

When a form is created, the $.fn.composerWidgets dictionary is cloned. Extending the composerWidgets dictionary after a
form is initalized will not propagate the new widget object to exiting forms. Forms can be provided with widgets
on-the-fly through the .addWidget method

Example:

    var form = $('#form').composer();

    form.addWidget('test_type', { ... });

    form.add({
        id: 'test_item',
        type: 'test_type',
        label: 'This is a test item',
    });

If a widget needs additional data (such as a list of options for a set of radio buttons), the values should be specified as part
of the form item's data dictionary:

Example:

    var form = $('#form').composer();

    form.addWidget('type_with_additional_data', {
        initialize: function() {
            var additional_data = this.get('additional_data_for_widget');
        }
    });

    form.add({
        id: 'test_item',
        type: 'type_with_additional_data',
        additional_data_for_widget: 'This is the additional data value'
    });
@module composer.widgets
**/

/**
@class jQuery
**/

/**
Generator function that makes it easy to build widgets.
@method composerWidgetsGenerator
@param {Function} input_html_generator_fn
@param {Object} extend_fn_dict
**/
$.fn.composerWidgetsGenerator = function(input_html_generator_fn, extend_fn_dict) {
    'use strict';
    /**
    The base widget.
    @class widget
    **/
    /**
    The jQuery object of the element associated with the widget.
    @property el
    @type jQuery
    **/
    /**
    The label displayed next to the widget.
    @property label
    @type String
    **/
    /**
    The tooltip shown next to the widget.
    @property tooltip
    @type String
    **/
    /**
    The placeholder shown in the widget.
    @property placeholder
    @type String
    **/
    /**
    The value underlying the widget.
    @property value
    @type String
    **/
    /**
    The id of the widget.
    @property id
    @type String
    **/
    var widget = {
        /**
        Generates the base DOM for the widget.
        @method initialize
        **/
        initialize: function() {
            $(this.get('el')).addClass('cTextInput');

            var html = '';
            if( this.get('label') ) {
                html += '<div class=\'cLabel\'><label for=\'' + this.get('id') + '\'>' + this.get('label') + '</label></div>';
            }
            html += '<div class=\'cInput\'></div>';
            $(this.get('el')).html(html);

            input_html_generator_fn.apply(this, [$(this.get('el')).find('.cInput')]);

            //bind for value change
            var item = this;
            $(this.get('el')).find('input').bind('change', function() {
                item.value( $(this).val() );
            });

            //placeholder handler
            this.get_widget().set_placeholder.apply(this);
            this.get_widget().set_tooltip.apply(this);
        },
        /**
        Sets the value of the input element associated with this widget.
        @method set_value
        @param {String} val
        **/
        set_value: function( val ) {
            $(this.get('el')).find('input').val( val );
        },
        /**
        Sets the text of the tooltip using the value of the widget's tooltip property.
        @method set_tooltip
        **/
        set_tooltip: function() {
            if( this.get('tooltip') ) {
                this.get('el').find('.cLabel:first').append('<div class=\'cTooltip icon\'><span style = \'max-width: 200px;\'>' + this.get('tooltip') + '</span></div>');
            }
        },
        /**
        Sets the text of the placeholder using the value of the widget's placeholder property.
        @method set_placeholder
        **/
        set_placeholder: function() {
            if( !this.get('placeholder') ) {
                return false;
            }

            //get the instances of 'input' and 'textarea' form elements
            var form_els = $(this.get('el')).find('input').add( $(this.get('el')).find('textarea') );

            //determine if the browser supports the native 'placeholder' property
            var input = document.createElement('input');
            var placeholder_support = 'placeholder' in input;

            if( placeholder_support ) {
                //easy, better approach
                form_els.attr('placeholder', this.get('placeholder'));
            } else {
                //otherwise, fake it
                this.get('el').find('.cInput').append('<span class=\'cPlaceholder\'>' + this.get('placeholder') + '</span>');

                //hide the placeholder if there is a value
                if( this.value() ) {
                    $(this.get('el')).find('.cPlaceholder').hide();
                }

                //re-run the set_placholder command on value change (e.g. a form element's value changed programmatically)
                var item = this;
                this.bind('change:value', function() {
                    item.get_widget().set_placeholder.apply(this);
                });

                //hide and show placeholder on click
                form_els.add( $(this.get('el')).find('.cPlaceholder') ).click(function() {
                    $(item.get('el')).find('.cPlaceholder').hide();
                    form_els.focus();
                });
                form_els.bind('blur', function() {
                    $(this).siblings('.cPlaceholder').css('display', ( !$(this).val() ) ? 'block' : 'none');
                });
            }

            return true;
        },
        /**
        Displays a validation message
        @method set_validation_message
        @param {String} msg
        **/
        set_validation_message: function(msg) {
            this.get('el').find('.cValidation').remove();
            if( msg ) {
                this.get('el').append('<div class=\'cValidation invalid\'><span>' + msg + '</span></div>');
            }
        }
    };

    if( extend_fn_dict ) {
        $.extend(widget, extend_fn_dict);
    }
    return widget;
};


//GENERIC WIDGETS

/**
Text input widget
@class text
@extends widget
**/
/**
If `true`, the text input accepts decimal numbers.
@property number
@type Boolean
**/
/**
If `true`, the text input accepts positive decimal number.
@property positive_decimal
@type Boolean
**/
$.fn.composerWidgets.text = $.fn.composerWidgetsGenerator(function(el) {
    'use strict';
    $(el).html('<input type=\'text\' id=\'' + this.get('id') + '\'>');
});

/**
@class password
@extends widget
**/
$.fn.composerWidgets.password = $.fn.composerWidgetsGenerator(function(el) {
    'use strict';
    $(el).html('<input type=\'password\' id=\'' + this.get('id') + '\'>');
});

/**
@class textarea
@extends widget
**/
$.fn.composerWidgets.textarea = $.fn.composerWidgetsGenerator(
    function(el) {
        'use strict';
        $(el).html('<textarea id=\'' + this.get('id') + '\'></textarea>');

        var item = this;
        var initial_value = this.get('value');
        $(this.get('el')).find('textarea').bind('change', function() {
            item.value( $(this).val() );
        }).trigger('change');

        this.set({ value: initial_value });
    },
    {
        set_value: function( val ) {
            'use strict';
            $(this.get('el')).find('textarea').val( val );
        }
    }
);

/**
@class select
@extends widget
**/
/**
Options to be shown in the select element.
The value can be an array of strings whose values will be used as both the
text and the value of the option or the value can be an object whose
property names will be used as the values of the options and whose values
will be used as the text of the options.
@property options
@type Object|Array
**/
$.fn.composerWidgets.select = $.extend(
    {},
    $.fn.composerWidgetsGenerator(function(el) {
        'use strict';
        var render = function() {
           //generate select html
            var html = '<select id=\'' + this.get('id') + '\'>';

            var options = this.get('options');
            var options_html;
            if(_.isArray(options)) {
                options_html = _.map(options, function(option) { return '<option value=\'' + option + '\'>' + option + '</option>'; });
            } else {
                options_html = _.map(options, function(option, index) { return '<option value=\'' + index + '\'>' + option + '</option>'; });
            }
            html += options_html.join('');

            html += '</select>';

            var form_el = $(html);

            //update model value when form changes
            var item = this;
            $(form_el).bind('change', function(e) {
                var index = $(this).val();
                item.value( index );
            });

            // If a value has not been specified in the widget configuration,
            // trigger the change event so that the value is retrieved from the
            // DOM.
            if (this.get('value') === undefined) {
                $(form_el).trigger('change');
            }

            $(el).empty().append( form_el );
        };
        render.call(this);
        this.bind('change:options', render, this);
    }),
    {
        set_value: function(value) {
            'use strict';
            $(this.get('el')).find('select').val( value );
        }
    }
);

/**
The picker widget lets you pick a number by using arrow buttons to increase
and decrease the number.
@class picker
@extends widget
**/
/**
The number picked by the user
@property index
@type Number
**/
/**
The options that the picker can choose from. The value property of the picker is
set to the value of the option at the picker's index.
@property options
@type Array
**/
$.fn.composerWidgets.picker = $.extend({},
    $.fn.composerWidgetsGenerator(function(el) {
        'use strict';
        var html = '';
        html += '<div class=\'cInput\'>';
        html += '<a href=\'#\' class=\'cButton cPickerBack\'>&#9664</a>';
        html += '<span class=\'cButton cPicker\'></span>';
        html += '<a href=\'#\' class=\'cButton cPickerNext\'>&#9658</a>';
        html += '</div>';
        $(el).html(html);

        // Bind for value change
        var item = this;
        $(this.get('el')).find('a.cPickerBack').bind('click', function(e) {
            e.preventDefault();

            var new_index = Number(item.get('index')) - 1;
            if (new_index < 0) { return; }

            item.set({index: new_index});
        });
        $(this.get('el')).find('a.cPickerNext').bind('click', function(e) {
            e.preventDefault();

            var new_index = Number(item.get('index')) + 1;
            if (new_index >= item.get('options').length) { return; }

            item.set({index: new_index});
        });

        this.bind('change:options', function() {
            this.trigger('change:index');
        });

        this.bind('change:index', function() {
            var value = item.get('options')[ item.get('index') ];
            item.get('el').find('.cPicker').html( value );
            item.value( value );
        });
        if( !this.get('index') ) {
            this.set({index: 0});
        }
        this.trigger('change:index');
    }),
    {
        set_value: function(value) {
            'use strict';
            var index = false;
            _.each(this.get('options'), function (option, index_check) {
                if (value === option) {
                    index = index_check;
                }
            });

            if( index ) {
                this.set({index: index});
            }
        }
    }
);

/**
@class old_picker
@deprecated Use the picker widget instead.
**/
$.fn.composerWidgets.old_picker = $.extend({}, $.fn.composerWidgets.text, {
    get_index: function(value) {
        'use strict';
        var result = false;
        _.each(this.get('options'), function (option, index) {
            if (value === option) {
                result = index;
            }
        });
        return result;
    },
    initialize: function() {
        'use strict';
        if( !this.get('options') ) {
            this.set({options: []});
        }

        var html = '';
        if (this.get('label')) {
            html += '<div class=\'cLabel\'><label for=\'' + this.get('id') + '\'>' + this.get('label') + '</label></div>';
        }

        html += '<div class=\'cInput\'>';
        html += '<a href=\'#\' class=\'cButton back\'>Prev</a>';
        html += '<span class=\'cPicker\'>' + this.get('options')[this.get('index')] + '</span>';
        html += '<a href=\'#\' class=\'cButton next\'>Next</a>';
        html += '</div>';

        $(this.get('el')).html(html);

        // Bind for value change
        var that = this;
        $(this.get('el')).find('a.back').bind('click', function(e) {
            e.preventDefault();
            var new_index = Number(that.get('index')) - 1;
            if (new_index < 0) { return; }
            that.set({index: new_index});
            that.value(that.get('options')[that.get('index')]);
        });
        $(this.get('el')).find('a.next').bind('click', function(e) {
            e.preventDefault();
            var new_index = Number(that.get('index')) + 1;
            if (new_index >= that.get('options').length) { return; }
            that.set({index: new_index});
            that.value(that.get('options')[that.get('index')]);
        });
    },
    set_value: function(value) {
        'use strict';
        $(this.get('el')).find('span').text(value);
    }
});

/**
A widget for uploading files to S3. Relies on publisher/logic.py.
@class upload
@extends widget
**/
/**
If `true`, the widget will upload the file as soon as the user chooses it.
If `false`, the widget will attempt to read the file via the FileReader API.
@property autoUpload
@type Boolean
**/
/**
If `true`, the widget will warn the user before file upload if image is above 1MB in size.
If `false`, the widget will not warn the user before file upload if the image is above 1MB in size.
@property size_warning
@type Boolean
**/
/**
A comma separated list of mime types that the upload widget will accept.
@property mime_types
@type String
**/
/**
A data URL that will be set if the file is read via the FileReader API.
@property data
@type String
**/
/**
The URL of the uploaded image.
@property image_url
@type String
**/
$.fn.composerWidgets.upload = $.extend({},
    $.fn.composerWidgetsGenerator(function() {
        'use strict';
        if (this.get('autoUpload') === undefined) {
            this.set('autoUpload', true);
        }

        if (this.get('size_warning') === undefined) {
            this.set('size_warning', false);
        }

        var template = require('text!templates/composer/upload.html');
        var html = _.template(template, { widget: this.toJSON() });
        var el = $(this.get('el'));
        el.html(html);

        var upload_item = this;
        var acl = (this.has('upload_acl'))? this.get('upload_acl') : 'public-read';
        publisher.send({
            module: 'publisher',
            command: 'get_upload_properties',
            args: {
                acl : acl
            },
            success: function(data, args) {
                var upload_xhr;
                var percent_complete;
                var upload_start_time;

                var reset_upload_ui = function () {
                    percent_complete = 0;
                    var el = upload_item.get('el');
                    // Hide the progress info.
                    el.find('.fileupload-container').hide();
                    el.find('.fileinput-button').show();
                };

                var set_finished_ui = function (filename) {
                    var el = upload_item.get('el');
                    el.find('.upload_status').text(filename);
                    reset_upload_ui();
                };

                // A more stringent version of encodeURIComponent that matches
                // S3's encoder.
                var fixedEncodeURIComponent = function (str) {
                    return encodeURIComponent(str.replace(/"/g, window.escape)).
                        replace(/[!'()~]/g, window.escape);
                };

                var fatal_wrapper = function (data) {
                    return function (jq_xhr) {
                        // copy file info, etc. from data.
                        var fatal_data = _.extend({}, data);
                        // replace data's response function with one that
                        // returns the fatal xhr in an object that
                        // file_failed_fn expects.
                        fatal_data.response = function () {
                            return {jqXHR: jq_xhr};
                        };
                        file_failed_fn(null, fatal_data);
                    };
                };

                var file_uploaded_fn = function(e, data) {
                    var file = data.files[0];

                    var response = data.response().result,
                         loc,
                         aws_key;
                    if (response) {
                        // Read the location from the S3 response XML.
                        loc = $(response).find('Location').text().replace('%2F', '/');

                        aws_key = $(response).find('Key').text();
                    } else {
                        // For situations where we are using the iframe
                        // transport (IE<10), we have to construct the location.
                        loc = args.url + '/' + args.key;
                        // Replace the ${filename} placeholder with the real filename
                        loc = loc.replace('${filename}', fixedEncodeURIComponent(file.name));
                        aws_key = args.key.replace('${filename}', file.name);
                    }

                    // Display a status message to show that we are waiting for
                    // the FileObj to be created
                    upload_item.get('el').find('.upload_status').text('Loading…');

                    // Create FileObj on server
                    publisher.send({
                        module: 'publisher',
                        command: 'add_uploaded_file',
                        args: {
                            location: loc,
                            file_name: file.name,
                            aws_key: aws_key,
                            size: file.size
                        },
                        success: function(data, args) {
                            if (_.contains(['zip', 'presentation'], args.task_type)) {
                                var panel_title, Task_Class, Task_View_Class;

                                if (args.task_type === 'zip') {
                                    panel_title = 'Processing Zip File…';
                                    Task_Class = require('models/LongTask');
                                    Task_View_Class = require('views/LongTask');
                                } else if (args.task_type === 'presentation') {
                                    panel_title = 'Processing Document…';
                                    Task_Class = require('models/UnknownLengthTask');
                                    Task_View_Class = require('views/UnknownLengthTask');
                                }

                                var upload_panel = panels.add({
                                    id: 'upload_processing',
                                    module: 'files',
                                    title: panel_title,
                                    layout: require('layouts/edumacation/LayoutCollection').get('dialog'),
                                    body: $('#loading_template').html(),
                                    footer_buttons: {
                                        Cancel: function () {
                                            upload_panel.remove();
                                            file_failed_fn();
                                            upload_task.unbind('change:complete');
                                        }
                                    }
                                });

                                var upload_task = new Task_Class({
                                    id: args.task
                                });

                                var upload_task_view = new Task_View_Class({
                                    model: upload_task,
                                    el:upload_panel.$b()
                                });

                                upload_task.bind('change:complete', function() {
                                        if (this.get('complete') === 1) {
                                            if (upload_task.get('result')) {
                                                // AH - This is a whole separate upload mechanism for different file types
                                                //   We should probably move this conversion stage into a different part of the code
                                                //   and just let the uploader do uploads.  Clearly, this is not something we are going to do
                                                //   any time soon.
                                                //   In src/modules/Files.js, ok_func depends on this format

                                                upload_item.value([file.name, args.key, loc, aws_key, args.task_type, upload_task.get('result')]);
                                                upload_task.set('result', '100%');
                                            } else {
                                                upload_item.value([file.name, args.key, loc, aws_key]);
                                            }
                                            set_finished_ui(file.name);
                                            upload_item.set('image_url', loc);
                                            upload_panel.remove();
                                            upload_task.stopListening();
                                        }
                                    });
                                upload_task.fetch();
                                upload_task_view.render();
                            } else {
                                upload_item.value([file.name, args.key, loc, aws_key]);
                                set_finished_ui(file.name);
                                upload_item.set('image_url', loc);
                                $(upload_item.get('el')).trigger('composer_file_uploaded');
                            }
                        },
                        failure: file_failed_fn,
                        fatal: fatal_wrapper(data)
                    });
                };

                var update_data = function (file) {
                    var reader = new FileReader();

                    reader.onload = function(e) {
                        upload_item.set({data: e.target.result});
                        set_finished_ui(file.name);
                    }.bind(this);

                    reader.readAsDataURL(file);
                };

                var file_added_continue = function(data) {
                    var el = upload_item.get('el');
                    var file = data.files[0];
                    el.find('.upload_status').text('');

                    if (upload_item.get('autoUpload')) {
                        // Start the upload immediately
                        data.process().done(function () {
                            upload_start_time = new Date();
                            upload_xhr = data.submit();
                        });
                    } else {
                        update_data(file);
                    }
                };

                var file_added_fn = function (e, data) {
                    var el = upload_item.get('el');

                    el.find('.fileupload-container').show();
                    el.find('.fileinput-button').hide();

                    // If the client doesnn't support xhrFileUpload, we are
                    // probably going to fallback to an iframe transport so
                    // show an indeterminate progress bar.
                    if (!$.support.xhrFileUpload) {
                        el.find('.progress').
                            addClass('progress-animated').
                            attr('aria-valuenow', 100).
                            children().first().css('width', '100%');
                        percent_complete = 0;
                        update_percent();
                    }

                    var file = data.files[0];
                    el.find('.fileupload-name').text(file.name);
                    if (file.size) {
                        var file_size_in_mb = (file.size / 1024 / 1024);
                        var file_size_in_mb_pretty_print = file_size_in_mb.toFixed(2);
                        el.find('.fileupload-size').text(' (' + file_size_in_mb_pretty_print + 'MB) - ');

                        if (upload_item.get('size_warning') && file_size_in_mb > 1.0) {
                            var panel = panels.add({
                                id: 'confirm_upload',
                                title: 'Confirm Upload',
                                module: 'course',
                                body: 'This image is very large, and may cause problems in large classrooms or in areas with poor Internet connectivity. Are you sure you want to use this image?',
                                layout: require('layouts/edumacation/LayoutCollection').get('dialog'),
                                width: 600,
                                footer_buttons: {
                                    Cancel: function() {
                                        el.find('.fileupload-container').hide();
                                        el.find('.fileinput-button').show();
                                        data.abort();
                                        panel.remove();
                                    }.bind(this),
                                    Yes: function () {
                                        file_added_continue(data);
                                        panel.remove();
                                    }.bind(this)
                                }
                            });
                        } else {
                            file_added_continue(data);
                        }
                    } else {
                        file_added_continue(data);
                    }
                };

                var update_percent = function () {
                    var el = upload_item.get('el').find('.fileupload-percent');
                    if (percent_complete) {
                        el.text(percent_complete + '%');
                    } else {
                        el.text('');
                    }
                };

                var file_progress_fn = function (e, data) {
                    percent_complete =
                        (data.loaded / data.total * 100).toFixed(0);
                    update_percent();
                };

                var track_failure = function (data) {
                    var now = new Date();
                    var duration = now - upload_start_time;
                    upload_start_time = null;


                    var properties = {
                        duration: duration
                    };

                    if (data) {
                        var file = data.files && data.files[0];
                        var response = data.response && data.response();
                        var jqXHR = response && response.jqXHR;
                        var aws_error_code, aws_error_message, response_text;
                        if (jqXHR) {
                            var xml = $(jqXHR.responseXML);
                            aws_error_code = xml.find('Code').text();
                            aws_error_message = xml.find('Message').text();
                            response_text = jqXHR.responseText.substring(0, 256);
                        }
                        _.extend(properties, {
                            error_thrown: data.errorThrown,
                            file_key: data.key,
                            file_name: file && file.name,
                            file_size: file && file.size,
                            file_type: file && file.type,
                            response_status: jqXHR && jqXHR.status,
                            response_text: response_text,
                            aws_error_code: aws_error_code,
                            aws_error_message: aws_error_message,
                            publisher_error_msg: data.error_msg
                        });
                    }
                    window.Daedalus.track(
                        'composer widget file upload failed',
                        properties);
                };

                var file_failed_fn = function(e, data) {
                    upload_item.value(null);
                    reset_upload_ui();
                    // if the user cancelled the upload
                    if (data && data.errorThrown === 'abort') {
                        return;
                    }
                    var upload_status = upload_item.get('el').
                        find('.upload_status');

                    track_failure(data);

                    if (upload_xhr && /EntityTooLarge/.test(upload_xhr.responseText)) {
                        var remaining_mb =
                            (data.maxFileSize / 1024 / 1024).toFixed(2);
                        upload_status.text(
                            'Upload failed - File too large. Only ' +
                            remaining_mb + 'MB remaining in course.');
                    } else if (data && data.error_msg === 'Upload failed. Freemium users cannot upload zip files.') {
                        // Used upload_status to display error message because the
                        // error tooltip provided by composer validation is cleared
                        // when the upload_item value is set to null
                        upload_status.text(data.error_msg);
                    } else {
                        upload_status.text('Upload failed. Please try again.');
                    }
                };

                // If the client does not support xhrFileUpload,
                // we will probably fallback to iframe transport
                // so we won't be able to get a response.
                var dataType = $.support.xhrFileUpload ? 'xml' : '';

                var upload_args = $.extend(args, {
                    dataType: dataType,
                    add: file_added_fn,
                    progress: file_progress_fn,
                    fail: file_failed_fn,
                    done: file_uploaded_fn,
                    dropZone: null,
                    pasteZone: null
                });

                el.fileupload(upload_args);

                el.find('.close.icon').click(function () {
                    if (upload_xhr) {
                        upload_xhr.abort();
                    }
                });
            }
        });
    }),
    {
        set_value: function() {} //upload cannot be set to existing value
    }
);


/**
@class button
@extends widget
**/
$.fn.composerWidgets.button = $.fn.composerWidgetsGenerator(function(el) {
    'use strict';
    var that = this;
    $(el).html('<input type=\'button\' id=\'' + this.get('id') + '\'>');
    $(el).find('input').val( this.get('value') ).bind('click', function() {
        that.trigger('change:value');
    });
});



//FANCY WIDGETS

/**
Fieldset widget
@class fieldset
@extends widget
**/
/**
The value property should be an array of configuration object for widgets that
should appear inside the fieldset.
@property value
@type Array
**/
/**
Determines whether the fieldset can be collapsed.
@property collapsible
@type Boolean
**/
/**
`true` if the fieldset is curretly collapsed.
@property collapsed
@type Boolean
**/
$.fn.composerWidgets.fieldset = {
    initialize: function() {
        'use strict';
        this.get('el').html(
            '<fieldset id=\'cId_' + this.get('id') + '\'><legend class=\'icon\'>' +
            this.get('label') +
            '</legend><div class=\'cFieldsetData\'></div></fieldset>'
        );

        if( this.get('collapsible') ) {
            this.get('el').addClass('cCollapsible');

            //initialize collapsed property, if it has not been set
            if(this.get('collapsed') === undefined) {
               this.set({collapsed: false });
            }

            //bind function that hides or shows fieldset on collapsed property change
            this.bind('change:collapsed', function() {
                if( this.get('collapsed') === true ) {
                    this.get('el').addClass('cCollapsed');
                } else {
                    this.get('el').removeClass('cCollapsed');
                }
            });

            //trigger collapse handler in order to initialize with proper collapsed view
            this.trigger('change:collapsed');

            //update collapsed status, and re
            var item = this;
            this.get('el').find('legend').click(function(e){
                e.preventDefault();
                item.set({ collapsed: !item.get('collapsed') });
            });
        }
    },
    set_value: function (value) {
        'use strict';
        var val = $.extend([], value);
        _.each(val, function (v, index) {
            v.container_el = this.get('el').find('.cFieldsetData');
        }, this);
        this.collection.add(value, {merge: true});
    }
};

/**
Hidden widget
@class hidden
@extends widget
**/
$.fn.composerWidgets.hidden = {
    initialize: function() {
        'use strict';
        this.get('el').html('<input type=\'hidden\' id=\'' + this.get('id') + '\' value=\'' + this.value() + '\'/>');
    }
};

/**
HTML widget
@class html
@extends widget
**/
$.fn.composerWidgets.html = {
    initialize: function() {
        'use strict';
        this.get('el').html( this.value() );
    }
};

/**
Checkbox widget
@class checkbox
@extends text
**/
$.fn.composerWidgets.checkbox = $.extend({}, $.fn.composerWidgets.text, {
    initialize: function() {
        'use strict';
        $(this.get('el')).addClass('cClickInput');

        var html = '';
        html += '<div class=\'cInput\'><input type=\'checkbox\' id=\'' + this.get('id') + '\'></div>';
        if( this.get('label') ) {
            html += '<div class=\'cLabel\'><label title=\'Select ' + this.get('label') + '\' for=\'' + this.get('id') + '\'>' + this.get('label') + '</label></div>';
        }
        $(this.get('el')).html(html);

        //bind for value change
        var that = this;
        $(this.get('el')).find('input').bind('click', function() {
            that.value( $(this).is(':checked') );
        });

        //explicitely set value to false if undefined
        if (_.isUndefined(this.get('value'))) {
            this.value(false);
        }

        //placeholder handler
        $.fn.composerWidgets.text.set_placeholder.apply(this);
        $.fn.composerWidgets.text.set_tooltip.apply(this);

    },
    set_value: function( val ) {
        'use strict';
        $(this.get('el')).find('input').attr('checked', val ? true : false);
    }
});

/**
Fieldset radio
@class radio
@extends widget
**/
/**
Options to be shown as radio buttons. The object's keys will be used as labels.
@property options
@type Object
**/
$.fn.composerWidgets.radio = $.fn.composerWidgetsGenerator(function(el) {
        'use strict';
        var html = '';

        html += '<ul>';

        var raw_options = this.get('options');
        var options = [];

        if (!_.isArray(raw_options)) {
            _.each(raw_options, function (key, value) {
                options.push({ option: key, value: value });
            });
        } else {
            options = raw_options;
        }

        var counter = 0;
        _.each(options, function (option) {
            var id = this.get('id') + '_' + counter; counter++;
            html += '<li>';
            html += '<div class=\'cRadioInput\'><input type=\'radio\' name=\'' + this.get('id') + '\' id=\'' + id + '\' value=\'' + option.value + '\'></div>';
            html += '<div class=\'cRadioLabel\'><label title=\'Select ' + option + '\' for=\'' + id + '\'>' + option.option + '</label></div>';
            html += '</li>';
        }, this);
        html += '</ul>';

        $(el).html(html);

        //bind for value change
        var that = this;
        $(el).find('input').bind('click', function() {
            that.value( $(this).attr('value') );
        });

        //add inline class, if inline property specified
        if( this.get('inline') ) {
            $(el).addClass('cRadioInline');
        }
    },
    {
        set_value: function( val ) {
            'use strict';
            var matched_radio = $(this.get('el')).find('input').filter(function() { return $(this).attr('value') === val ? true : false; });
            matched_radio.attr('checked', true);

            //mark as selected
            matched_radio.parents('li').siblings().removeClass('cRadioSelected');
            matched_radio.parents('li').addClass('cRadioSelected');
        }
    }
);
