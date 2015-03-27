/*
 *
 */

function ThmForm()
{
    // form defaults
    this.option_section = false;
    this.option_name = false;
    this.option_tooltip = false;
    this.option_error = false;
    this.option_row_width = 350;
    this.option_name_width = 60;
    this.option_section_width = 70;
    this.option_item_width = -1;
    this.option_row_height = 20;
    this.option_image_path = '';
    this.option_titles_visible = false;
    this.option_horizontal = false;

    this.option_checkbox_image = 'icon_checkbox.png';
    this.option_checkbox_checked_image = 'icon_checkbox_checked.png';
    this.option_radio_image = 'icon_radio.png';
    this.option_radio_checked_image = 'icon_radio_selected.png';
    this.option_tooltip_image = 'icon_tooltip.png';
    this.option_checkmark_image = 'icon_checkmark.png';
    this.option_error_image = 'icon_error.png';
    this.option_empty_image = 'icon_blank.png';
    this.option_plus_image = 'icon_plus.png';
    this.option_minus_image = 'icon_minus.png';

    this.option_uploadify_url = "";// question.upload_question_file_url;
    this.validation_callbacks = {};
    this.vars = {};

    this.root = undefined;
    this.callback_object = undefined;

    this.validation_func = function validation_func( text, callback_func )
    {
        return '';
    }

    /*
     * Returns true if all fields in the form are valid, otherwise false
     */
    this.validate_form = function validate_form()
    {
        var form = this;
        var result = true;

        // ensure that all items are valid
        $(form.root).find('li').each( function(e){
            var item = this;
            if( !form.validate_item(item) ) result = false;
        });

        return result;
    }

    this.validate_item = function validate_item( item, event_name ) {
        // get item parameters
        var form = this;
        var item_id = $(item).attr('id');
        var item_value = this.get_item_value(item);
        var error = '';

        // check if item is hidden; if so, we don't check the validation
        // we check the css display: property rather then using jquery's
        // $(item).is(":hidden") property, because
        // we may be validating forms that have not yet been added to the page
        // (and are therefore technically not visible)
        if( $(item).css("display") == "none" ) {
            form.set_validation_icon( item, 'valid' );
            return true;
        }

        // validate based on css classes
        error = this.validate_item_value( item );
        if( error )
        {
            form.set_validation_icon( item, 'invalid', true, error );
            return false;
        }

        // validate using callback
        if( item_id in this.validation_callbacks )
        {
            var callback_func = function(error){
                if( error ) {
                    form.set_validation_icon( item, 'invalid', true, error );
                }
                else {
                    form.set_validation_icon( item, 'valid' );
                }
            };

            error = this.validation_callbacks[item_id]( item_value, callback_func, form );
            if( error )
            {
                this.set_validation_icon( item, 'invalid', true, error );
                return false;
            }
        }

        // attachment items have two states - upload_started and upload_completed
        // validation should fail for attachment item after upload_started (and pass after completed)
        if( ($(item).attr("type") == "attachment") && event_name == "upload_started" ) {
            this.set_validation_icon( item, 'invalid', true, error );
            return false; }

        this.set_validation_icon( item, 'valid' );
        return true;
    }

    this.serialize_form = function serialize_form()
    {
        var form = this;
        var result = {};

        // for all items in form
        $(this.root).find('li').each( function(e){
            // get item value
            var item_id = $(this).attr('id');
            if( item_id )
                result[item_id] = form.get_item_value( $(this) );
        });

        // for all vars
        for( variable in form.vars )
        {
            result[variable] = form.vars[variable];
        }

        return result;
    }

    this.deserialize_form_from_json = function deserialize_form_from_json( values )
    {
        if( typeof values == "string" )
            values = $.parseJSON(values);

        if( values )
            this.deserialize_form( values );
    }

    this.deserialize_form = function deserialize_form( values )
    {
        for( value in values )
        {
            var item = this.get_item_by_id( value );
            if( item )
                this.set_item_value( item, values[value] );
            else
                this.vars[value] = values[value];
        }
    }

    this.get_item_value_by_id = function get_item_value_by_id( item_id )
    {
        return this.get_item_value( this.get_item_by_id( item_id ) );
    }

    this.get_item_by_id = function get_item_by_id( item_id )
    {
        return $(this.root).find('li[id='+item_id+']');
    }

    this.hide_item_by_id = function hide_item_by_id( item_id ) {
        this.get_item_by_id(item_id).hide();
    }

    this.show_item_by_id = function show_item_by_id( item_id ) {
        this.get_item_by_id(item_id).show();
    }

    this.event_callback = function event_callback( item, event_name )
    {
        // call item validation
        this.validate_item(item, event_name );
    }
  // copied from edumacation_utilities.js, removing dependency
    this.get_property_count = function get_property_count(object) {
        var count = 0;
        for (k in object) {
            count++;
        }
        return count;
    }
    this.validate_item_value = function validate_item_value( item )
    {
        // for all classes belonging to this item
        var item_val = this.get_item_value( item );
        var classes = $(item).attr('class');

        if( classes )
        {
            classes = classes.split(' ');
            var error = '';

            // For optional items, return valid if item value is an empty string.
            var indexOptionalClass = classes.indexOf('thmv_optional');
            if (indexOptionalClass != -1) {
                classes.splice(indexOptionalClass, 1);
                if( item_val.length === 0 ) {
                    return false;   // Item value is valid.
                }
            }

            var idx = 0;
            for( idx = 0; idx < classes.length; idx++ )
            {
                var type = classes[idx];
                if( type == 'thmv_not_empty' )
                {
                    var valid = false;
                    if( typeof(item_val) == "string" ) {
                        //"value" == :), "    " == :(, "" == :(
                        if( item_val.trim() != "" ) {
                            valid = true;
                        }
                    } else if( typeof(item_val) == "object" ) {
                        //{0: "value 1", 1: "value 2"} == :), {0: "value 1"} == :), {0: "   "} == :(, {} == :(

                        //loop through items and return list with true/false based on if they have empty values
                        var results = _.map(item_val, function(item) { return item.trim() == ""; });
                        if( results.length > 0 && !_.include(results, true) ) {
                            valid = true;
                        }
                    }

                    if( !valid ) {
                        return 'Value must not be empty';
                    }
                }
                else if( type == 'thmv_integer' )
                {
                    if( parseInt(item_val) != (item_val-0) )
                        return 'Value must be an integer';
                }
                else if( type == 'thmv_number' )
                {
                    if( parseFloat(item_val) != (item_val-0) )
                        return 'Value must be a number';
                }
                else if( type == 'thmv_alphanum' )
                {
                }
                else if( type == 'thmv_alpha' )
                {
                }
                else if( type == 'thmv_less_than' )
                {
                    var c = parseInt($(item).attr('thmv_less_than'));
                    if( isNaN(parseFloat(item_val)) || (parseFloat(item_val) >= c) )
                        return 'Value must be less than ' + c;
                }
                else if( type == 'thmv_greater_than' )
                {
                    var c = parseInt($(item).attr('thmv_greater_than'));
                    if( isNaN(parseFloat(item_val)) || (parseFloat(item_val) <= c) )
                        return 'Value must be greater than ' + c;
                }
                else if( type == 'thmv_greater_than_equal' )
                {
                    var c = parseInt($(item).attr('thmv_greater_than_equal'));
                    if( isNaN(parseFloat(item_val)) || (parseFloat(item_val) < c) ) {
                        return 'Value must be greater than or equal to ' + c;
                    }
                }
                else if( type == 'thmv_longer_than' )
                {
                    var c = parseInt($(item).attr('thmv_longer_than'));
                    if( item_val.length <= c )
                        return 'Value must be more than ' + c + ' characters long';
                }
                else if( type == 'thmv_shorter_than' )
                {
                    var c = parseInt($(item).attr('thmv_shorter_than'));
                    if( item_val.length >= c )
                        return 'Value must be less than ' + c + ' characters long';
                }
                else if( type == 'thmv_all_caps' )
                {
                }
                else if( type == 'thmv_all_lower' )
                {
                }
                else if( type == 'thmv_contains' )
                {
                }
                else if(  type == 'thmv_format' )
                {
                }
                else if( type == 'thmv_is_date' )
                {
                }
                else if( type == 'thmv_is_time' )
                {
                }
                else if( type == 'thmv_email' )
                {
                    var reg = /^([A-Za-z0-9_\-\.])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,4})$/;
                    if( !reg.test(item_val) )
                        return 'Value must be a valid email address';
                }
                else if( type == 'thmv_filename' )
                {
                    var exp = /^[0-9a-zA-Z_-]+[0-9a-zA-Z_\- ]*$/;
                    if( !item_val.match(exp) ){
                        return 'Value must be valid filename';
                    }
                }
            }
        }

        return error;
    }

    this.set_item_value_by_id = function set_item_value_by_id( item_id, value )
    {
        this.set_item_value( this.get_item_by_id(item_id), value );
    }

    this.set_item_value = function set_item_value( item, value )
    {
        var item_type = $(item).attr('type');
        if( (item_type == 'text_field') || (item_type == 'password') || (item_type == 'text_box') || (item_type == 'dropdown') )
        {
            var inputs = $(item).find('.thm_form_'+ item_type +'_input');
            if( inputs.length > 1 )
            {
                var ct = 0;
                result = {};
                inputs.each( function(e){
                    $(this).val( value[ct++] );
                });
            }
            else if( inputs.length > 0 )
            {
                inputs.val( value );
            }
        }
        else if( (item_type == 'checkbox') || (item_type == 'radio') )
        {
            var option = this['option_'+item_type+'_checked_image'];
            var img_src_checked = this.option_image_path + option;
            var inputs = $(item).find('.thm_form_' + item_type);
            for( idx in value )
            {
                var txt = value[idx];
                var ct = 0;
                inputs.each( function(e){
                    if( ($(this).parents('tr:first').find('span').text() == txt) ||
                        (ct == idx) )
                    {
                            $(this).attr('src',img_src_checked);
                            $(this).attr('is_checked','1');
                    }
                    ct++;
                });
            }
        }
        else if( item_type == 'number_box' )
        {
            $(item).find('.thm_form_number_box_value').text( value );
        }
        else if( item_type == 'alpha_box' )
        {
            if( _.isNumber(value) ) {
                var options = "abcdefghijklmnopqrstuvwxyz";
                value = options[parseInt(value) - 1];
                if( !value ) { value = options[0]; }
            }
            $(item).find('.thm_form_alpha_box_value').text( value );
        }
        else if( item_type == 'label' )
        {
            $(item).find('.thm_form_label').text( value );
        }
        else if( item_type == 'var' )
        {
            this.vars[$(item).attr('id')] = value;
        }
        else if( item_type == 'attachment' )
        {
            // $(item).find('.thm_form_label').text( value );
        }
    }

    this.get_item_value = function get_item_value( item )
    {
        var result = undefined;
        var item_type = $(item).attr('type');
        if( (item_type == 'text_field') || (item_type == 'password') || (item_type == 'text_box') || (item_type == 'dropdown') )
        {
            var inputs = $(item).find('.thm_form_'+ item_type +'_input');
            if( inputs.length > 1 )
            {
                var ct = 0;
                result = {};
                inputs.each( function(e){
                    result[ct++] = $(this).val();
                });
            }
            else if( inputs.length > 0 )
            {
                result = inputs.val();
            }
        }
        else if( (item_type == 'checkbox') || (item_type == 'radio') )
        {
            var inputs = $(item).find('.thm_form_' + item_type);
            result = {}
            inputs.each( function(e){
                if( $(this).attr('is_checked') == 1 )
                    result[e] = $(this).parents('tr:first').find('span').text();
            });
        }
        else if( item_type == 'button' )
        {
        }
        else if( item_type == 'number_box' )
        {
            result = $(item).find('.thm_form_number_box_value').text();
        }
        else if( item_type == 'alpha_box' )
        {
            var value = $(item).find('.thm_form_alpha_box_value').text();
            var options = "abcdefghijklmnopqrstuvwxyz";
            result = _.indexOf(options, value) + 1;
        }
        else if( item_type == 'label' )
        {
            result = $(item).find('.thm_form_label').text();
        }
        else if( item_type == 'var' )
        {
            result = this.vars[$(item).attr('id')];
        }
        else if( item_type == 'attachment' || item_type == 'screenshot')
        {
            result = this.vars[$(item).attr('set_var')];
        }

        return result;
    }

    this.add_item = function add_item( form, item_id )
    {
        var item = form.get_item_by_id( item_id );
        form.set_form( item, $(item).attr('type'), '<ul><li></li></ul>', true );

        //for when a text field is added via a button, it should be focused automatically
        $(item).find('.thm_form_table_item').find('input:last').focus();

        //react to enter key press on last input item
        $(item).find(".thm_form_table_item").find("input").unbind("keydown");
        $(item).find(".thm_form_table_item").find("input:last").bind("keydown", function(e) {
            if( e.which == 13 ) {
                form.add_item( form, item_id );
            }
        });
    }

    this.remove_item = function remove_item( form, item_id )
    {
        var item = form.get_item_by_id( item_id );
        if( item )
        {
            var type = $(item).attr('type');
            var td = $(item).find('.thm_form_table_item');
            // remove last item
            if( type == 'checkbox' )
            {
                td.find('table.thm_form_table:last').remove();
            }
            else if( type == 'text_field' )
            {
                if( td.find('form input.thm_form_text_field_input').length > 1 )
                    td.find('form input.thm_form_text_field_input:last').remove();

                //react to enter key press on last input item
                $(item).find(".thm_form_table_item").find("input").unbind("keydown");
                $(item).find(".thm_form_table_item").find("input:last").bind("keydown", function(e) {
                    if( e.which == 13 ) {
                        form.add_item( form, item_id );
                    }
                });
            }
            else if( type == 'password' )
            {
                td.find('form input.thm_form_password_input:last').remove();
            }
            else if( type == 'text_box' )
            {
                td.find('textarea.thm_form_text_box_input:last').remove();
            }
            else if( type == 'radio' )
            {
                td.find('table.thm_form_table:last').remove();
            }
            else if( type == 'button' )
            {
                td.find('form button.thm_form_button_input:last').remove();
            }
            else if( type == 'dropdown' )
            {
                td.find('select option:last').remove();
            }
            else if( type == 'number_box' )
            {
                td.find('table.thm_form_table:last').remove();
            }
            else if( type == 'alpha_box' )
            {
                td.find('table.thm_form_table:last').remove();
            }
            else if( type == 'label' )
            {
                td.find('span.thm_form_label:last').remove();
            }
            else if( type == 'attachment' )
            {
                // $(item).find('.thm_form_label').text( value );
            }
            //form.validate_form();
        }
    }

    this.set_name = function set_name( item, name )
    {
        $(item).find('.thm_form_table_name').append( name );
    }

    this.set_section = function set_section( item, name )
    {
        $(item).find('.thm_form_table_section').append( name );
    }

    this.set_form = function set_form( item, type, list, no_form )
    {
        var form = this;
        var td = $(item).find('.thm_form_table_item');
        var img_path = this.option_image_path;
        var checkbox_image = this.option_checkbox_image;
        var radio_image = this.option_radio_image;
        var plus_image = this.option_plus_image;
        var minus_image = this.option_minus_image;

        // check for flag to not add new form... in case we're appending an item
        // to existing list
        if( !no_form )
        {
            if( (type == 'text_box') ||
                (type == 'text_field') ||
                (type == 'password') ||
                (type == 'button') ||
                (type == 'dropdown') ||
                (type == 'attachment') )
            {
                td.append( '<form onSubmit="return false" class="thm_form_'+type+'"></form>' );
            }
            if( type == 'dropdown' )
                td.find('form').append( '<select class="thm_form_dropdown_input"></select>' );
        }

        $(list).find('li').each( function(e){
            if( type == 'checkbox' )
            {
                td.append( '<table class="thm_form_table" style="width:100%;"><tbody class="thm_form_table_body">' +
                             '<tr><td width="26px"><img class="thm_form_checkbox" src="' + img_path + checkbox_image + '"/></td>' +
                             '<td><span>' + $(this).text() + '</span></td></tr>' +
                           '</tbody></table>' );
                if( $(this).attr('is_checked') == "1" )
                {
                    var img_src_checked = form.option_image_path + form.option_checkbox_checked_image;
                    td.find('.thm_form_checkbox').attr('src',img_src_checked);
                    td.find('.thm_form_checkbox').attr('is_checked','1');
                }
            }
            else if( type == 'text_field' )
            {
                td.find('form').append( '<input class="thm_form_text_field_input" type="text" name="'+escape($(this).text())+'"/>' );
                var text_value = escape($(this).text());
                var input = td.find('input').filter(function() { return $(this).attr("name") == text_value; }).filter(":last");
                input.val($(this).text());
            }
            else if( type == 'password' )
            {
                td.find('form').append( '<input class="thm_form_password_input" type="password" name="'+escape($(this).text())+'"/>' );
                var text_value = escape($(this).text());
                td.find('input').filter(function() { return $(this).attr("name") == text_value; });
            }
            else if( type == 'text_box' )
            {
                td.find('form').append( '<textarea class="thm_form_text_box_input" name="'+escape($(this).text())+'"/>' );
                var text_value = escape($(this).text());
                td.find('textarea').filter(function() { return $(this).attr("name") == text_value; }).val( $(this).text() );
            }
            else if( type == 'radio' )
            {
                var radio_inline = $(this).parent().parent("li").attr("form_inline") ? true : false;
                var style_html = radio_inline ? "display: inline-block; margin-right: 5px;" : "width: 100%";
                var el = $( '<table class="thm_form_table" style="' + style_html + '"><tbody class="thm_form_table_body">' +
                                '<tr><td width="26px" style="vertical-align:middle"><img class="thm_form_radio" src="' + img_path + radio_image + '"/></td>' +
                                '<td><span>' + $(this).html() + '</span></td></tr>' +
                              '</tbody></table>' );
                td.append(el);
                $(el).find("span").click(function() { $(el).find(".thm_form_radio").click(); });
                if( $(this).attr('is_checked') == "1" )
                {
                    var img_src_checked = form.option_image_path + form.option_radio_checked_image;
                    el.find('.thm_form_radio').attr('src',img_src_checked);
                    el.find('.thm_form_radio').attr('is_checked','1');
                }
            }
            else if( type == 'button' )
            {
                td.find('form').append( '<button class="thm_form_button_input" type="button">' + $(this).text() + '</button>' );
                if( $(this).attr('callback') )
                {
                    // check for module callback
                    var callback_name = $(this).attr('callback');
                    var callback_func = form.callback_object[callback_name];
                    if( callback_func )
                    {
                        td.find('form button.thm_form_button_input:last').unbind('click').bind('click',function(e){
                            callback_func( form );
                        });
                    }
                }
                if( $(this).attr('form_callback') )
                {
                    // check for form callback
                    var callback_name = $(this).attr('form_callback');
                    var callback_func = form[callback_name];
                    var callback_var = $(this).attr('form_callback_var');
                    if( callback_func )
                    {
                        td.find('form button.thm_form_button_input:last').unbind('click').bind('click',function(e){
                            callback_func( form, callback_var );
                        });
                    }
                }
            }
            else if( type == 'dropdown' )
            {
                var option_value = $(this).attr("id") ? $(this).attr("id") : $(this).text(); //WTF: requesting .attr("value") will return -1, regardless of what is in value attribute
                td.find('select').append( '<option value="' + option_value + '">' + $(this).text() + '</option>' );
            }
            else if( type == 'number_box' )
            {
                td.append( '<table class="thm_form_table"><tbody class="thm_form_table_body">' +
                              '<tr><td width="15px"><img class="thm_form_number_box" src="' + img_path + minus_image + '"/></td>' +
                              '<td><span class="thm_form_number_box_value" style="padding-right:2px; padding-left:2px;">0</span></td>' +
                              '<td width="15px"><img class="thm_form_number_box" src="' + img_path + plus_image + '"/></td></tr>' +
                                 '</tbody></table>' );

                // set value if it's present
                   if( $(this).attr('value') )
                       td.find('td span').text( $(this).attr('value') );
                   if( $(this).attr('min') )
                       td.find('td span').attr('min',$(this).attr('min'));
                   if( $(this).attr('max') )
                       td.find('td span').attr('max',$(this).attr('max'));
            }
            else if( type == 'alpha_box' )
            {
                td.append( '<table class="thm_form_table"><tbody class="thm_form_table_body">' +
                              '<tr><td width="15px"><img class="thm_form_alpha_box" src="' + img_path + minus_image + '"/></td>' +
                              '<td><span class="thm_form_alpha_box_value" style="padding-right:2px; padding-left:2px;">a</span></td>' +
                              '<td width="15px"><img class="thm_form_alpha_box" src="' + img_path + plus_image + '"/></td></tr>' +
                                 '</tbody></table>' );

                // set value if it's present
                   if( $(this).attr('value') ) {
                   var value = $(this).attr('value');
                   if( _.isNumber(value) ) {
                        var options = "abcdefghijklmnopqrstuvwxyz";
                        value = options[parseInt(value) - 1];
                        if( !value ) { value = options[0]; }
                    }
                    $(item).find('.thm_form_alpha_box_value').text( value );
                }
            }
            else if( type == 'label' )
            {
                td.append( '<span class="thm_form_label" style="padding-right:2px;">' + $(this).text() + '</span>' );
            }
            else if( type == 'attachment' )
            {
                td.find('form').append('<input id="uploadify_input_upload" type="file" />');
            }
        });
    }

    this.set_focus_indentifier = function(item){
        item.find("input:first").attr("focus", true);
    }

    this.autofocus = function(item){
        $(item).find("*[focus=true]").focus();
    }

    this.set_tooltip = function set_tooltip( item, text )
    {
        $(item).find('.thm_form_table_tooltip').append('<img src="' +
                this.option_image_path +
                this.option_tooltip_image + '">');
        /*
        $(item).find('.thm_form_table_tooltip img').qtip({ content: text, style: { border: {
                        width: 2,
                        radius: 5,
                        color: '#777'}}, });
         */
        $(item).find('.thm_form_table_tooltip img').attr('title',text);
        //$(item).find('.thm_form_table_tooltip img').tooltip();

    }

    this.bind_validation_callback = function bind_validation_callback( item, type )
    {
        // get callback function arg
        var callback_name = $(item).attr('callback');
        var callback_func = this.callback_object[callback_name];
        var item_id = $(item).attr('id');

        // bind callback based on the type of event
        if( callback_func && item_id )
        {
            this.validation_callbacks[item_id] = callback_func;
        }
    }

    this.set_validation_icon = function set_validation_icon( item, type, required, text )
    {
        // check if icon image is there
        if( $(item).find('.thm_form_table_error img').length == 0 )
        {
            $(item).find('.thm_form_table_error').append('<img src="' + this.option_image_path + this.option_empty_image + '">');
            if( !required )
                $(item).find('.thm_form_table_error img').hide();
        }

        if( type == 'valid' )
        {
            $(item).find('.thm_form_table_error img').attr( 'src', this.option_image_path + this.option_checkmark_image );
            $(item).find('.thm_form_table_error img').show();
            /*
            $(item).find('.thm_form_table_error img').qtip({ content: 'Valid input', style: { border: {
                width: 2,
                radius: 5,
                color: '#0a0'}}, });
            */
            $(item).find('.thm_form_table_error img').attr('title', 'Valid input');
            //$(item).find('.thm_form_table_error img').tooltip();
        }
        else if( type == 'invalid' )
        {
            $(item).find('.thm_form_table_error img').attr( 'src', this.option_image_path + this.option_error_image );
            $(item).find('.thm_form_table_error img').show();
            /*
            $(item).find('.thm_form_table_error img').qtip({ content: text, style: { border: {
                width: 2,
                radius: 5,
                color: '#a00'}}, });
            */
            //var api = $(item).find('.thm_form_table_error img').data("tooltip");
            //api.getTip().remove();
            $(item).find('.thm_form_table_error img').attr('title', text);
            //$(item).find('.thm_form_table_error img').tooltip();
        }
    }

    this.bind_item_events = function bind_item_events( item )
    {
        var form = this;
        var img_src_checked = this.option_image_path + this.option_checkbox_checked_image;
        var img_src_unchecked = this.option_image_path + this.option_checkbox_image;
        var img_src_selected = this.option_image_path + this.option_radio_checked_image;
        var img_src_unselected = this.option_image_path + this.option_radio_image;

        // set checkbox events
        $(item).find('.thm_form_checkbox').unbind('click').bind('click', function(e){
            if( !($(this).attr('is_checked')) || ($(this).attr('is_checked')=='')  )
            {
                $(this).attr('src',img_src_checked);
                $(this).attr('is_checked','1');
                form.event_callback( item, 'checked' );
            }
            else
            {
                $(this).attr('src',img_src_unchecked);
                $(this).attr('is_checked','');
                form.event_callback( item, 'unchecked' );
            }
        });

        // set radio button events
        $(item).find('.thm_form_radio').unbind('click').bind('click', function(e){
            if( !($(this).attr('is_checked')) || ($(this).attr('is_checked')=='')  )
            {
                // uncheck the rest
                $(item).find('.thm_form_radio[is_checked=1]').each( function(e){
                    $(this).attr('src',img_src_unselected);
                    $(this).attr('is_checked','');
                });
                // check this radio button
                $(this).attr('src',img_src_selected);
                $(this).attr('is_checked','1');
                form.event_callback( item, 'selected' );
            }
        });

        // text field events
        $(item).find('.thm_form_text_field').unbind('change keyup').bind('change keyup', function(e){
            form.event_callback( item, 'changed' );
        });

        // password events
        $(item).find('.thm_form_password').unbind('change keyup').bind('change keyup', function(e){
            form.event_callback( item, 'changed' );
        });

        // text box events
         $(item).find('.thm_form_text_box').unbind('change keyup').bind('change keyup', function(e){
            form.event_callback( item, 'changed' );
        });

         // number box events
         if( $(item).attr('type') == 'number_box' )
         {
             var span = $(item).find('td span');
               var min = -99999;
               var max = 99999;
               if( span.attr('min') )
                   min = parseInt( span.attr('min') );
               if( span.attr('max') )
                   max = parseInt( span.attr('max') );

               // bind event handlers for plus/minus buttons
               $(item).find('td img.thm_form_number_box:first').bind('click', function(e){
                   var val = parseInt(span.text());
                   if( val > min )
                       val--;
                   span.text( val );
                   form.event_callback( item, 'changed' );
               });
               $(item).find('td img.thm_form_number_box:last').bind('click', function(e){
                   var val = parseInt(span.text());
                   if( val < max )
                       val++;
                     span.text( val );
                   form.event_callback( item, 'changed' );
               });
         }

        // alpha box events
         if( $(item).attr('type') == 'alpha_box' )
         {
             var span = $(item).find('td span');
            var options = "abcdefghijklmnopqrstuvwxyz";

             // bind event handlers for plus/minus buttons
               $(item).find('td img.thm_form_alpha_box:first').bind('click', function(e){
                   var val = span.text();
                var index = _.indexOf(options, val);
                if( (index < 0) || (index >= options.length) ) {
                    return false;
                }

                   span.text( options[index - 1] );
                   form.event_callback( item, 'changed' );
               });
               $(item).find('td img.thm_form_alpha_box:last').bind('click', function(e){
                   var val = span.text();
                var index = _.indexOf(options, val);
                if( (index < 0) || (index >= options.length) ) {
                    return false;
                }

                   span.text( options[index + 1] );
                   form.event_callback( item, 'changed' );
               });
         }

        // bind validation callback
        if( $(item).attr('callback') && this.callback_object )
            form.bind_validation_callback( item, $(item).attr('type') );



        // bind uploadify
        $(item).find("#uploadify_input_upload").each( function(e){
            if( !jQuery().uploadify ) {
                $(this).parents("tr").remove();
                return true;
            }

            var var_name = $(item).attr('set_var');
            if(var_name) { form.vars[var_name] = Array(); } //initialize the variable containing the list of file objects
            var file_types = '';
            if( $(item).attr('file_types') )
                file_types = $(item).attr('file_types');
            multi = $(item).attr('multiple') ? $(item).attr('multiple') : false;
            var upload_complete_callback = form.callback_object[$(item).attr('upload_callback')];

            var uploadify_item = this;
            $(uploadify_item).parent().addClass("uploadifyLoading");//hide();//replaceWith("LOADING");
            publisher.post("publisher", "get_uploadify_properties", "", {}, function(data, args) {
                function fileUploaded(e,queueID,fileObj) {
                    // build the absolute location of the url; if the location
                    // includes a dynamic ${filename} reference, we replace it
                    // with the file name
                    var location = args["script"] + "/" + args["key"];
                    location = location.replace("${filename}", fileObj.name);

                    //modify the progress bar to show that we are waiting for the FileObj to be created
                    $("#uploadify_input_upload"+queueID).find("span.percentage").html(" - attaching");

                    //remove the progress bar
                    $('#uploadify_input_upload'+queueID).addClass("uploadifyUploaded");
                    $('#uploadify_input_upload'+queueID).find("span.percentage").after("<span class='post_upload_status'> - attaching</span>");

                    publisher.post("publisher", "add_uploaded_file", "", {
                        "location" : location,
                        "file_name" : fileObj.name,
                        "size" : fileObj.size
                    }, function(data, args) {
                        // callback after creating FileObj

                        var uploadify_id = $(item).attr("id");
                        if( !form.vars[uploadify_id] ) { form.vars[uploadify_id] = Array(); }
                        if( args["key"] )
                        {
                            //add the FileObj's properties to the list of uploaded files. This may be referenced by querying form.vars[] with the attachment input's id
                            form.vars[uploadify_id].push({"key":args["key"],"location":location, "file_name":fileObj.name, "size": fileObj.size});

                            //if the attachment object specifies a var_name to store the list of FileObj keys in, we add the FileObj's key
                            if( var_name )
                            {
                                if( typeof form.vars[var_name] == "string" ) { form.vars[var_name] = Array(); }
                                form.vars[var_name].push( args["key"] ); // get the key of the FileObj and store in the form input
                            }
                        }

                        //when all files uploaded, trigger a user-specified callback
                        if( upload_complete_callback && (form.vars[uploadify_id + "_fileCount"] == form.vars[uploadify_id].length))
                        {
                            upload_complete_callback( form.vars[uploadify_id] ); //call the item's callback function, if one is assigned
                        }

                        $('#uploadify_input_upload'+queueID).addClass("uploadifyComplete");

                        form.event_callback(item, "upload_completed");
                    });
                    return false; //prevent the default uploadify callback from occuring
                }
                // policy and signature files are base64 encoded, and will
                // sometimes contain characters that must be encoded; why this
                // must be done twice is beyond me
                // see: http://www.uploadify.com/forum/viewtopic.php?f=7&t=1416
                args['scriptData']['policy'] = encodeURIComponent(encodeURIComponent(args['scriptData']['policy']));
                args['scriptData']['signature'] = encodeURIComponent(encodeURIComponent(args['scriptData']['signature']));

                var uploadify_args = $.extend(args,{
                    'uploader'  : site_data.settings.MEDIA_URL + 'uploadify.swf',
                    'buttonImg' : site_data.settings.MEDIA_URL + 'images/edumacation/buttons/button_upload.png',
                    'cancelImg' : site_data.settings.MEDIA_URL + 'images/edumacation/buttons/button_cancel.png',
                    'auto'      : true,
                    'fileExt'     : file_types,
                    'fileDesc'    : file_types,
                    'buttonText': 'Upload',
                    'multi'     : multi,
                    'width'     : 71,
                    'height'     : 20,
                    'onSelectOnce' : function(e, d) {
                        //Store the number of files that will be uploaded
                        var uploadify_id = $(item).attr("id");
                        form.vars[uploadify_id + "_fileCount"] = d["fileCount"];
                        form.event_callback(item, "upload_started");
                    },
                    'onError':function(e, queueID, fileObj, errorObj){
                      if(errorObj.type == "File Size") {
                          var remaining_mb = Math.round(errorObj.info / 10485.76) / 100;
                          $('#uploadify_input_upload'+queueID).find("span.percentage").after(" (" + remaining_mb + "MB remaining in course)");
                      }else if(errorObj.info == 201){
                        fileUploaded(e,queueID,fileObj); // Flash for OSX
                                                            // treats 201
                                                            // success messages
                                                            // as errors;
                                                            // onComplete will
                                                            // be called in
                                                            // Windows
                      }
                    },
                    'onComplete':fileUploaded
                });
                $(uploadify_item).parent().removeClass("uploadifyLoading");
                $(uploadify_item).uploadify(uploadify_args);
            });
        });

        // set selected value of selection
        if( $(item).attr('type') == 'dropdown' )
         {
            var item_value = $(item).attr('val');
            if( item_value )
            {
                $(item).find('select option').each( function(e){
                    if( $(this).attr('value') == item_value )
                        $(this).attr('selected','selected')
                });
            }
         }
    }

    // utilities
    this.create_title_row = function create_title_row()
    {
    }

    this.create_item = function create_item()
    {
        var item_table = document.createElement("table");
        item_table.setAttribute("class", "thm_form_table");
        $(item_table).css('width',this.option_row_width);
        if( this.option_horizontal )
            $(item_table).css('display','inline');
        else
            $(this.root).css('width',this.option_row_width);
        // $(item_table).css('height',this.option_row_height);
        $(item_table).append('<tbody class="thm_form_table_body"><tr></tr></tbody>');

        if( this.option_section )
        {
            $(item_table).find('tbody tr').append('<td class="thm_form_table_section"></td>');
            $(item_table).find('tbody td.thm_form_table_section').css('width',this.option_section_width);
        }

        if( this.option_name )
        {
            $(item_table).find('tbody tr').append('<td class="thm_form_table_name"></td>');
            $(item_table).find('tbody td.thm_form_table_name').css('width',this.option_name_width);
        }

        $(item_table).find('tbody tr').append('<td class="thm_form_table_item"></td>');
        if( this.option_item_width != -1 )
        {
            $(item_table).find('tbody td.thm_form_table_item').css('width',this.option_item_width);
        }

        if( this.option_tooltip )
            $(item_table).find('tbody tr').append('<td class="thm_form_table_tooltip"></td>');

        if( this.option_error )
            $(item_table).find('tbody tr').append('<td class="thm_form_table_error"></td>');

        return item_table;
    }
}

ThmForm.prototype.convertHtml = function convertHtml( node )
{
    if( !node )
        return;

    // validate node structure
    var form = this;
    this.root = node;
    //$(form.root).addClass("thm_form_list");
    $(form.root).attr('class',"thm_form_list");
    var is_valid = true;

    // determine if there are any sections
    if( $(form.root).find('li[section]').length > 0 )
        form.option_section = true;
    // determined if there are any names
    if( $(form.root).find('li[name]').length > 0 )
        form.option_name = true;
    // determine if there are any tooltips
    if( $(form.root).find('li[tooltip]').length > 0 )
        form.option_tooltip = true;
    // determine if there are any callbacks for validation
    if( $(form.root).find('li[callback]').length > 0 )
        form.option_error = true;
    $(form.root).find('li[class]').each( function(e){
        var classes = $(this).attr('class').split(' ');
        for( idx in classes )
            if( classes[idx].indexOf('thmv_') != -1 )
                form.option_error = true;
    });

    // set options based on node attributes
    attributes = $(node).mapAttributes();
    for( attribute in attributes )
    {
        if( attribute.search("option_") != -1 )
        {
            form[attribute] = attributes[attribute];
        }
    }

    // create standard item table to be used for populating items
    var item_table = this.create_item();

    // add a title bar if necessary
    if( this.option_titles_visible )
        $(node).prepend( this.create_title_row() );

    // convert items
    $(node).find('li').each( function(e){
        // create item table clone
        var new_item = $(item_table).clone();

        // set paramteres of the new item
        $(this).attr('class', $(this).attr('class')+' thm_form_list_item');
        if( form.option_horizontal )
        {
            $(this).css('display','inline');
        }

        // set name
        if( $(this).attr('name') )
            form.set_name( new_item, $(this).attr('name') );
        // set section
        if( $(this).attr('section') )
            form.set_section( new_item, $(this).attr('section') );
        // set form item
        if( $(this).attr('type') )
        {
            if( $(this).attr('type') == 'var' )
            {
                form.vars[$(this).attr('id')] = $(this).text();
                $(this).remove();
                return;
            }
            else
                form.set_form( new_item, $(this).attr('type'), $(this).find('ul') );
        }
        // set tooltip
        if( $(this).attr('tooltip') )
            form.set_tooltip( new_item, $(this).attr('tooltip') );
        // bind validation callback
        if( form.option_error )
            form.set_validation_icon( new_item, 'empty', false );

        // Set a field to have autofocus on render
        if($(this).attr("focus")){
            form.set_focus_indentifier(new_item);
        }

        // clear li element
        $(this).children().remove();
        $(this).text('');

        // append item
        $(this).append(new_item);

        // bind events
        form.bind_item_events( this );

        // Give focus to the desired elements
        form.autofocus(this);
    });
}

ThmForm.prototype.convertJson = function convertJson( json_string )
{

}

ThmForm.prototype.convertObject = function convertObject( obj_literal )
{

}
