var custom_generic_widget = $.extend({}, $.fn.composerWidgets["text"], {
    "refresh": function() {
        this.trigger("change:value");
    },
    "bind_new_row_on_enter": function(form_item, el, new_val) {
        //convenience function to ease process of adding new item to set on enter key press
        $(el).bind("keydown", function(e) {
            if( e.keyCode == 13 ) {
                $(this).blur(); //forces a 'change' event before the data is re-calculated
                custom_generic_widget["add_item"](form_item, new_val);
            }
        });
    },
    "initialize": function() {

        //initialize value, if it is not passed in
        if( !this.value() ) { this.value([""]); }
        if( !this.get("set_wrapper") ) { this.set({"set_wrapper": "<ul class='cSetWrapper'></ul>"}); }
        if( !this.get("structure_wrapper") ) { this.set({"structure_wrapper": "<li></li>"}); }

        $(this.get("el")).addClass("cTextInput");

        var html = '';
        if( this.get("label") ) {
            html += "<div class='cLabel'><label for='" + this.get("id") + "'>" + this.get("label") + "</label></div>";
        }
        html += "<div class='cInput'>";
            html += this.get("set_wrapper");
            if (!this.get("immutable")) {
                var text = this.get("set_add_text") || "Add";
                html += "<a title='Add another option' href='#' class='cButton add'>" + text + "</a>";
            }
        html += "</div>";
        $(this.get("el")).html(html);


        //set up sorting event helper - this is used by click and drag sorting events
        this.changeSortValue = function(originIndex, currentIndex) {
            var value = $.extend([], this.value());
            if( currentIndex < 0 ) { return false; }
            if( currentIndex > (value.length - 1) ) { return false; }

            //swap indicies
            var temp = value[originIndex];
            value[originIndex] = value[currentIndex];
            value[currentIndex] = temp;

            this.value( value );

            return true;
        };

        //if conditions are perfect, add drag sorting
        if( this.get("sortable") && $.fn.sortable && !this.get("clickSort") ) {
            var that = this;
            $(this.get("el")).find(".cSetWrapper").sortable({
                "axis": "y",
                "handle": ".cSortHandle",
                "containment": "parent",
                "helper": 'clone',
                "start": function(evt, ui) {
                    //http://css.dzone.com/articles/keeping-track-indexes-while
                    ui.item.data("originIndex", ui.item.index());
                },
                "stop": function(evt, ui) {

                    var originIndex = ui.item.data("originIndex");
                    var currentIndex = ui.item.index();
                    that.changeSortValue(originIndex, currentIndex);
                }
            });
        }

        //bind for value change
        var item = this;
        $(this.get("el")).find("a.add").bind("click", function(e) {
            e.preventDefault();
            custom_generic_widget["add_item"](item);
        });

        //placeholder handler
        $.fn.composerWidgets["text"].set_placeholder.apply(this);
        $.fn.composerWidgets["text"].set_tooltip.apply(this);

    },
    "add_item": function(item, value){
        value = value ? value : "";
        var val = $.extend([],item.value());
        val.push(value);
        item.value( val );

        //trigger the add event
        var new_el = item.get("el").find("li:last");
        if( item.get("add") ) {
            item.get("add").apply(item, [new_el]);
        }
        item.trigger("add", new_el);

        // Focus the new item
        item.get("el").find("input[type='text']:last").focus();
    },
    "set_value": function(value) {
        var val = this.value();
        var this_get_el = this.get("el");
        var set_el = this_get_el.find(".cSetWrapper").html("");

        //we initize the elements first
        _.each(val, function () {
            var el = $( this.get("structure_wrapper") ).addClass("cSetItem");
            set_el.append(el);
        }, this);

        var item = this;

        //we call the 'structure' method for each initalized el
        //we do this seperately because the structure functions may modify the value,
        //which causes a recursive loop
        _.each(val, function (v, index) {
            index = parseInt(index, 10);
            el = this_get_el.find(".cSetWrapper .cSetItem:eq(" + index + ")");

            var method = {
                "id": this.get("id"),
                "index": index,
                "el": el,
                "value": function(item) {
                    var el = this;
                    return function(val) {
                        var value = $.extend([], item.value());

                        if( val !== undefined) {
                            //var value = item.value();
                            value[ el.index() ] = val;
                            item.value( value );
                            //item.value()[ el.index() ] = val;
                        }

                        return value[ el.index() ];
                    };
                }.apply(el, [this]),
                "generateSortButton": function() {
                    var isiPad = navigator.userAgent.match(/iPad/i) !== null;

                    if( !item.get("sortable") ) {
                        return "";
                    } else if( $.fn.sortable && !item.get("clickSort") && !isiPad ) {
                        return "<span class='cSortHandle'>|||</span>";
                    } else {
                        return "<span class='cClickSort'><a href='#' class='cButton cClickSortUp'></a><a href='#' class='cButton cClickSortDown'></a></span>";
                    }
                },
                "generateDeleteButton": function() {
                    return "<a title='Delete this option' href='#' class='cButton delete'>Delete</a>";
                },
                "generateUploadButton": function() {
                    return "<a title='Upload a file' href='#' class='cButton upload'>Upload</a>";
                }
            };
            this.get("structure").apply(this, [method]);
        }, this);


        // Bind delete button on newly created set item
        this_get_el.find("a.delete").unbind("click").click(function(e) {
            e.preventDefault();

            var index = $(this).parents(".cSetItem").index();
            var val = $.extend([],item.value());
            var removed_value = val.splice(index, 1);

            //trigger delete event
            if( item.get("delete") ) {
                item.get("delete").apply(item, [index, removed_value[0]]);
            }
            item.trigger("delete", index, removed_value[0]);

            //update the item's value list without the removed value
            item.value( val );
        });

        function tdSelectableClickHandler(e) {
            e.preventDefault();

            var $ = window.jQuery;
            var $this = $(this);
            var $cSetItem = $this.parent();
            var $cSetWrapper = $cSetItem.parent();

            var $tds = $cSetWrapper.find('td');
            $tds.filter('.selectable').addClass('disable').removeClass('current_selection');
            $tds.filter('.choosable').removeClass('disable');

            $this.removeClass("disable").addClass("current_selection");
            $this.siblings('.current_match').toggleClass("current_selection");

            var originIndex = $cSetItem.index();
            item.currentSelection = originIndex;
        }

        function tdChoosableClickHandler(e) {
            if (item.currentSelection !== false && item.currentSelection > -1) {
                e.preventDefault();

                var $ = window.jQuery;
                var $this = $(this);
                var $cSetItem = $this.parent();
                var $cSetWrapper = $cSetItem.parent();
                var $tds = $cSetWrapper.find('td');
                var originIndex = $cSetItem.index();

                var selection = item.currentSelection;

                $tds.filter('.selectable')
                    .removeClass('disable')
                    .removeClass('current_selection');
                var test = $tds.filter('.choosable').addClass('disable');

                item.currentSelection = false;
                // var value = $.extend([], this.value());
                 // item.choosenOnes

                if (item.changeSortValue(originIndex, selection)) {

                    // item.bind("change:value", function(e) {
                    //     console.log('here');
                    //     this_get_el.find('.selection_feedback').eq(selection).show().fadeOut();
                    // });

                    //TODO:
                    //i dont like this, but i cant figure out where the change:value is triggered on
                    //cause the dom refreshes and all dom references are lost
                    //need to wait a bit then fadeout
                    _.delay(function(selection) {
                        this_get_el.find('.cSetItem').eq(selection).find('.selection_feedback').show().fadeOut('slow');
                    }, 50, selection);
                }
            }
        }

        function clickSortClickHandler(e) {
            e.preventDefault();
            var originIndex = $(this).parents(".cSetItem").index();
            var diff = $(this).hasClass("cClickSortDown") ? 1 : -1;
            var currentIndex = originIndex + diff;

            if (item.changeSortValue(originIndex, currentIndex)) {
                //TODO:
                //i dont like this, but i cant figure out where the change:value is triggered on
                //cause the dom refreshes and all dom references are lost
                //need to wait a bit then fadeout
                _.delay(function(currentIndex) {
                    this_get_el.find('.cSetItem').eq(currentIndex).find('.selection_feedback').show().fadeOut('slow');
                }, 50, currentIndex);
            }
        }

        if ($().tap) {
            this_get_el.find("td.selectable").tap(tdSelectableClickHandler);
            this_get_el.find("td.choosable").tap(tdChoosableClickHandler);
            this_get_el.find(".cClickSort a").tap(clickSortClickHandler);
        } else {
            this_get_el.find("td.selectable").click(tdSelectableClickHandler);
            this_get_el.find("td.choosable").click(tdChoosableClickHandler);
            this_get_el.find(".cClickSort a").click(clickSortClickHandler);
        }
    }
});

$.fn.composerWidgets["set"] = custom_generic_widget;
