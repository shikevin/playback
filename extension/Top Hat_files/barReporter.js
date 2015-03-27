/* global _ */
/* Copyright (c) 2012 Top Hat Monocle, http://tophatmonocle.com/
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 * of the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN
 * AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.*/

(function($) {
    'use strict';
    $.fn.barReporter = function(options) {
        
        options = $.extend({}, $.fn.barReporter.defaults, options);

        //add appropriate type css to barReport
        if( options.type === 'multi' ) {
            $(this).removeClass('brStacked').addClass('brMulti');
        } else if( options.type === 'stacked' ) {
            $(this).removeClass('brMulti').addClass('brStacked');
        }

        //determine graph scale
        var data_scale = $.fn.barReporter.calculate_scale(options);
        var pct_scale = $.fn.barReporter.calculate_pct_scale(options);
        var scale = options.scale || data_scale;

        //determine if non row-specfic values have been changed since last rendering
        //data must be removed, as modifying it is not indicative of change in other options
        var comp_options = $.extend({}, options, {'scale': scale, 'data':false});
        $.fn.barReporter.check_modified( this, comp_options );

        //Remove any rows that no longer exist
        if( $(this).find('.brRow').length >= options.data.length ) {
            $(this).find('.brRow').each(function(index) {
                if( index > options.data.length - 1 ) {
                    $(this).remove();
                }
            });
        }

        //get or create the overall report container
        $.fn.barReporter.get_or_create_report_container( this );
        var report_el = $(this).children('#brReportContainer');

        //set number of rows for bar graph
        var new_data;
        if (typeof options.row_limit === 'undefined') {
            new_data =_.first(options.data, 10);
        }
        else {
            new_data =_.first(options.data, options.row_limit);
        }

        //loop through rows and render them
        _.each(new_data, function (row_data, row_index) {
            if (row_data === undefined) {
                // Don't fool around with empty rows...
                return;
            }

            //get or create row
            var row_el = $.fn.barReporter.get_or_create_row(report_el, row_index);

            var data = $.isArray( row_data[0] ) ? row_data[0] : [ row_data[0] ];
            var label = row_data[1];

            if(label != null){
                label = label.replace(/\|,,\|/g, ',');
            }

            //Remove any bars that no longer exist
            if( row_el.find('.brBar').length >= data.length ) {
                row_el.find('.brBar').each(function(row_index) {
                    if( row_index > data.length - 1 ) {
                        $(this).remove();
                    }
                });
            }

            //Update bar data
            _.each(data, function (value, bar_index) {
                var color = options.colors[bar_index] || options.colors[0];
                var el = $.fn.barReporter.get_or_create_bar( row_el, bar_index );
                $(el).css('background-color', color);

                var width = scale ? value / scale * 100 : 0;
                if( width > 100 ) { width = 100; }
                $(el).css('width', width + '%');
                $(el).text(value);

                //if value > 0, add a brNonZero class
                if( value > 0 ) {
                    $(el).addClass('brNonZero');
                } else {
                    $(el).removeClass('brNonZero');
                }

            });

            //Update label
            label = $.fn.barReporter.format_label( label, options.num_no_wrap_chars );
            $(row_el).find('.brLabel').html( label );
            $(row_el).find('.brLabel').prop('title', label);
            //Render percent value for row
            if( options.show_percent ) {

                //calculate total pct for all row data based on data_scale
                var total_pct;
                if( pct_scale ) {
                    total_pct = 0;
                    _.each(data, function (datum) {
                        total_pct += datum / pct_scale * 100;
                    });
                    total_pct = Math.round(total_pct);
                } else {
                    total_pct = 0;
                }

                //render value
                $(row_el).find('.brPct').html('<div class="forcewidth">'  +total_pct + '%</div>' );
            } else {
                //render nothing
                $(row_el).find('.brPct').html( false );
            }
        });

        //Get or add legend container if we are in a stacked bar
        if( options.legends.length ) {

            //determine if the # of buckets in the legend are under the max number of buckets; use the lesser of the two
            var max_buckets = $.fn.barReporter.get_max_buckets_number( options.data );
            var max_num_legends = options.legends.length < max_buckets ? options.legends.length : max_buckets;

            //generate legends html
            var html = '';
            for( var index = 0; index < max_num_legends; index++ ) {

                //format legend text
                var legend = options.legends[index] || '';
                // Now that we have verified student data, this can be an object. Extract the string answer.
                if( typeof legend === 'object' && legend.answer !== undefined){
                    legend = legend.answer;
                }
                legend = legend.toString();
                if( legend.length > 50 ) { legend = legend.substr(0, 20) + '...'; }
                legend = _.escape(legend).replace(/\s/g, '&nbsp;').replace(/\|,,\|/g, ',');

                //add the legend
                var color = options.colors[index] || options.colors[0];
                html += (
                    '<div class="brLegend" id="brLegend' + index +
                    '"><span style="background-color:' + color +
                    '">&nbsp;</span><em>' + legend + '</em></div>');
            }

            if( options.legends.length && ((options.type === 'stacked') || (options.inlineLegends === false)) ) {
                var legend_container_el = $(this).children('#brLegendContainer');
                legend_container_el.html( html );
                legend_container_el.addClass('visible');
            } else {
                $(this).find('.brLegends').each(function() {  $(this).html(html); });
            }
        }
    };

    //returns the number of buckets in the row with the most buckets
    $.fn.barReporter.get_max_buckets_number = function(data) {
        var max_bucket_number = 0;

        _.each(data, function (row_data) {
            if( $.isArray(row_data) && (row_data[0].length > max_bucket_number) ) {
                max_bucket_number = row_data[0].length;
            }
        });

        return max_bucket_number;
    };

    /**
     * Updates the row's data if it has changed.
     * @method check_modified
     * @param row_el {Element} The DOM element representing the row.
     * @param row_data {Object} An object representing the new row data.
     * @returns {Boolean} Returns true if the row data has changed.
     */
    $.fn.barReporter.check_modified = function( row_el, row_data ) {
        var old_data = $(row_el).data('rowData');
        var new_data = JSON.stringify(row_data);

        if( new_data === old_data ) {
            return false;
        } else {
            $(row_el).data('rowData', new_data);
            return true;
        }
    };

    $.fn.barReporter.format_label = function( str, num_no_wrap_chars ) {
        //use default num_no_wrap_chars if no value provided
        if( !num_no_wrap_chars ) {
            num_no_wrap_chars = $.fn.barReporter.defaults.num_no_wrap_chars;
        }
        // Now that we have verified student data, this can be an object. Extract the string answer.
        if( typeof str === 'object' && str.answer !== undefined){
            str = str.answer;
        }

        str = str + ''; //force conversion to string
 
        return _.escape(str.substr(0, num_no_wrap_chars)).replace(
            /\s/g, '&nbsp;') + _.escape(str.substr( num_no_wrap_chars ));
        
    };

    //find the bar element or initialize & add to container
    $.fn.barReporter.get_or_create_row = function(parent, id) {
        var el = $(parent).children('#brRow' + id);

        if( !el.length ) {
            el = $('<div class="SpceRow"></div><div class="brRow" id="brRow' + id + '">' +
                '<div title="" class="brLabel"></div>' +
                '<div class="brBars"></div>' +
                '<div class="brLegends"></div>' +
                '<div class="brPct"></div>');
            $(parent).append( el );
        }
        return el;
    };

    //find or add a new bar
    $.fn.barReporter.get_or_create_bar = function(parent, index) {
        var el = $(parent).find('.brBars > #brBar' + index);

        if( !el.length ) {
            el = $('<div class="brBar" id="brBar' + index + '"></div>');
            $(parent).find('.brBars').append( el );
        }
        return el;
    };

    //find or add a bar legend
    $.fn.barReporter.get_or_create_legend = function(parent, index, color) {
        var el = $(parent).find('#brLegend' + index);

        if( !el.length ) {
            el = $('<div class="brLegend" id="brLegend' + index + '"><span style="background-color:' + color + '">&nbsp;</span><em></em></div>');
            $(parent).append( el );
        }
        return el;
    };

    //find or create the container that holds the report and legend
    $.fn.barReporter.get_or_create_report_container = function(parent) {
        var el = $(parent).children('#brReportContainer');

        if( !el.length ) {
            el = $('<div id= "brReportContainer"></div><div id="brLegendContainer"></div>');
            $(parent).append( el );
        }
        return el;
    };

    //calculates the scale to present items out of
    $.fn.barReporter.calculate_scale = function(options) {
        var scale = 0;

        _.each(options.data, function (data) {
            data = data[0];
            var total = 0;

            //if row does not have array of data, row's total is simply the value
            if( !$.isArray(data) ) {
                total = data;

            //if row has array of data, row is either sum of values or highest value (depends on report type)
            } else {
                $(data).each(function(i,value) {
                    if( options.type === 'stacked' ) {
                        total += value;
                    } else if( (options.type === 'multi') && (value > total) ) {
                        total = value;
                    }
                });
            }

            if( total > scale ) {
                scale = total;
            }
        });

        return scale;
    };

    //calculate the value to scale percent with
    //this should be equal to the sum of all values
    $.fn.barReporter.calculate_pct_scale = function(options) {
        var total = 0;
        _.each(options.data, function (data) {
            data = data[0];
            if( !$.isArray(data) ) { data = [data]; }
            $(data).each(function(i,value) { total += value; });
        });

        return total;
    };

    $.fn.barReporter.defaults = {
        'data': [],
        'type': 'multi',
        'scale': undefined,
        'num_no_wrap_chars': 20,
        'show_percent': true,
        'inlineLegends': false,
        'colors': ['#1270b6', '#5b9e3e', '#356022', '#242424'],
        'legends': []
    };

})(jQuery);
