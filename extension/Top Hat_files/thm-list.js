// TODO:
// SORTING: 2h?
// x render items appropriately
// o - if no folder defined when adding an item in the folder, add the folder
// o - test generation on tons and tons of trees
// o - performance
// o - selecting panel items and getting selected items
// x - maximizing and minimizing folders
// o - integrate with rest of site
// NOTE: events should be bound on panel instance, not panel element - panel element subject to re-rendering


var ListItem, StudentListItemView, List;
ListItem = Backbone.Model.extend({
    initialize: function() {
        this.set({ view: new StudentListItemView({ id: this.id, model: this }) });
        this.bind("change:title", function() {
            if( this.is_label() ) {
                folder_name = this.get("title");
                this.set({folder: folder_name});
                _.each( this.children(true), function(item) { item.set({folder: folder_name}); });
            }
            this.get("view").render();
        });
        this.bind("change:status_list", function() { this.get("view").render(); });
        this.bind("change:answered", function() { this.get("view").render(); });
        this.bind("change:minimized", function() { this.get("view").render(); });
        this.bind("change:status_list_name", function() { this.get("view").render(); });
        this.bind("change:folder", function() { this.trigger("set:folder"); });
        this.bind("change:selected", function() { this.trigger("set:selected"); });
        this.bind("change:tooltip", function() { this.get("view").render() });
        this.bind("change:status", function() {
            //if status changed on label, trigger it for all children
            if( this.is_label() ) {
                this.trigger("status_changed_bulk_start");

                status = this.get("status");
                _.each(this.children(), function(child_item, status_batch_current) {
                    //set the item's status
                    if( child_item.get("status") != status ) {
                        child_item.set({status: status});
                    }
                });
            }

            this.trigger("set:status");

            if( this.is_label() ) {
                this.trigger("status_changed_bulk_end");
            }

            this.get("view").render(); //re-render item
        });

        this.bind("remove", function() {
            //if item is in folder, change folder selected
             if( this.get("folder") ) {
                 var label = this.is_label() ? this : this.folder();
                 if( !label ) { return; }
                 var selected = undefined;
                 _.each(label.children(), function(child) {
                     if( selected == undefined ) {
                         selected = child.get("selected");
                     } else if( selected != child.get("selected") ) {
                         selected = "mixed";
                     }
                 });
                 label.set({selected: selected}, {silent:true});
                 label.get("view").render();
             }
        });

        this.bind("set:status", function() {
            //if item is in folder, change folder status
            if( this.get("folder") ) {
                if( this.is_label() ) { return; }

                var label = this.folder();
                if( !label ) { return; }

                var folder_children = label.children();
                folder_children.push(this); //on the item's initial set:status, the item will not be present in the list becuase it has not yet been assigned a folder; we must manually add it's status

                var folder_children_status_values = _.map(folder_children, function(item) { return item.attributes['status'] ? item.attributes['status'] : "inactive"; });
                var uniq_folder_children_status_values = _.uniq(folder_children_status_values);

                if( uniq_folder_children_status_values.length == 1 ) {
                    var status = uniq_folder_children_status_values[0];
                } else {
                    var status = "mixed";
                }

                label.set({status: status}, {silent: true});
                label.get("view").render(true);
            }
            this.get("view").render(); //re-render item
        });


        //if the item is in a folder, check if it is hidden or not & bind events for when folder is changed
        this.bind("set:folder", function() {
            if( !this.is_label() && !this.folder() && this.get("list") && !(this.get("folder") == "") ) {
                this.get("list").add({title: this.get("folder"), list: this.get("list"), folder: this.get("folder"), is_label_for_group:"folder"});
            }
            else if ( this.folder() && this.get("list") ) {
                curr = this;
                existing_folder_label = this.get("list").detect(function(item) { return item.get("cid") != curr.get("cid") && item.get("is_label_for_group") && item.get("title") == curr.get("title"); });
                if( existing_folder_label ) { this.remove(); }
            }
            if( !this.is_label() ) {

                if( this.is_label_minimized() ) {
                    this.$el().hide();
                }

                var folder = this.folder();
                if( folder ) {
                    var folder_status_list = status_lists["folder"];
                    if( folder.get("status_list") != folder_status_list ) { folder.set({status_list: folder_status_list}); }
                    this.trigger("set:status");
                }
            }
        });


        //change selected status for folder's children, or for child's folder, when status is selected
        this.bind("set:selected", function() {
            //if status changed on label, trigger it for all children
            if( this.is_label() ) {
                selected = this.get("selected");
                _.each(this.children(), function(child_item) { child_item.set({selected: selected}); });
            } else if( this.get("folder") ) {
               //if item is in folder, change folder selected
               var label = this.folder();
               if( !label ) { return; }

                var folder_children_selected_values = _.map(label.children(), function(item) { return item.attributes['selected'] == undefined ? false : item.attributes['selected']; });
                var uniq_folder_children_selected_values = _.uniq(folder_children_selected_values);
                if( uniq_folder_children_selected_values.length == 1 ) {
                    var selected = uniq_folder_children_selected_values[0];
                } else {
                    var selected = "mixed";
                }
                label.set({selected: selected}, {silent:true});
                label.get("view").render(true);
            }

            //re-render item
            this.get("view").render();
        });

        this.bind("folder.child_removed", function() {
            if( this.children().length == 0 ) {
                this.set({status: "mixed", status_list: status_lists["folder_empty"]});
            }
        });
        this.bind("folder.child_added", function() {
            //triggers folder_maximized command; the true argument informs the callback to send the maximized
            //command immediately, bypassing any delays
            if( this.get("minimized") == true ) { this.maximize(); }
        });

        //trigger events related to folder, selected, and label values on initialization
        if( this.get("folder") ) { this.trigger("set:folder"); }
        if( this.get("is_label_for_group") ) {
            if( this.get("minimized") ) { this.minimize(); } else { this.maximize(); }
            if( this.children().length == 0 ) {
                this.set({status: "mixed", status_list: status_lists["folder_empty"]});
            } else {
                this.set({status_list: status_lists["folder"]});
            }
        }
        if( this.get("selected") ) { this.trigger("set:selected"); }
        if( this.get("status") ) { this.trigger("set:status"); }
    },

    get: function(attributes, options) {
        if( this['_get_' + attributes] ) { return this['_get_' + attributes](); }
        // Backbone.Model.prototype.get.call(this, attributes, options);
        return this.attributes[attributes];
    },

    remove: function() {
        if( this.get("list") ) { this.get("list").remove(this); }
        //TODO: folder removed?
    },
    $el: function(selector) {
        jq = $(this.get("view").el);
        if( selector ) {
            return jq.find(selector);
        } else {
            return jq;
        }
    },
    //label-specific functions
    folder: function() {
        if ( this.get("list") && this.get("folder") ) {
            return this.get("list").get_folder_label(this.get("folder"));
        }
        return false;
    },
    is_label: function() {
        return this.get("is_label_for_group") ? this.get("is_label_for_group") : false;
    },
    children: function( include_self ) {
        return this.get("list").in_folder( this.get("title"), true );
    },
    is_label_minimized: function() { //returns true if the item is in a label (or is a label) and if that label's minimized status is true; returns false otherwise
        label = this.get("list") ? this.folder() : false;
        return ( label && label.get("minimized") ) ? true : false;
    },
    maximize: function() {
        this.set({minimized: false});
        var list = this.get("list");
        _.each(list.in_folder(this.get("folder"), true), function(item) { $(item.get("view").el).css("display", "table"); /* call display: table; instead of .show(), because that reverts it to 'block', which breaks formatting */ });
        list.trigger("folder_maximized", list, this);
        list.set_scrollbar();
    },
    minimize: function() {
        var list = this.get("list");
        this.set({minimized: true});
        _.each(list.in_folder(this.get("folder"), true), function(item) { $(item.get("view").el).hide(); });
        list.trigger("folder_minimized", list, this);
        list.set_scrollbar();
    },

    //GET overloaders
    _get_status_list: function() {
        status_list = this.attributes["status_list"];
        if( status_list == undefined ) { status_list = this.get("status_list_name") && status_lists && status_lists[this.get("status_list_name")]; }
        if( status_list == undefined ) { status_list = this.get("status_list_name") && status_lists && status_lists[this.get("status_list_name")]; }
        if( status_list == undefined ) { status_list = this.get("list") && this.get("list").get("status_list"); }
        if( status_list == undefined ) { status_list = this.get("list") && this.get("list").status_list_name && status_lists && status_lists[this.get("list").status_list_name]; }
        if( status_list == undefined ) { status_list = false; }
        return status_list;
    },
    _get_selectable: function() {
        selectable = this.attributes["selectable"];
        if( selectable == undefined ) { selectable = this.get("list") && this.get("list").selectable; }
        if( selectable == undefined ) { selectable = false; }
        return selectable;
    },
    _get_callback: function() {
        callback = this.attributes["callback"];
        if( callback == undefined && this.is_label() ) { return undefined; } //is this right? should labels not inherit the default callback?
        if( callback == undefined ) { callback = this.get("list") && this.get("list").callback; }
        return callback;
    },
    _get_tooltip: function() {
        return this.attributes["tooltip"] ? this.attributes["tooltip"] : "";
    },
    defaults: {
        answered: false,
        folder: '' //the system interprets '' folders as undefined; if an item does not have a folder, set to '' to prevent the synchronization script from going awol
    }
});


StudentListItemView = Backbone.View.extend({
    tagName: "div",
    className: "item",

    initialize: function() {
        var item_template = "" +
                 "<div class='title'>" +
                     (this.model.get("is_label_for_group") ? "<span class='bt_maxmin maxmin'></span>" : "") +
                     (this.model.get("selectable") ? "<span class='select'></span>" : "") +
                     (this.model.get("is_label_for_group") ? "<span class='icon_folder maxmin {{maxmin_status}}'></span>" : "") +
                     "<span title='" + this.model.get("tooltip") + "' class='title_text " + (this.model.get("callback") ? "callback" : "") + "'></span>" +
                 "</div>" +
                 (this.model.get("icon") ? "<div class='icon'><span class='" + this.model.get("icon") + "'></span></div>" : "") +
                 ((this.model.get("status") || this.model.get("status_list")) ? "<div class='status'><span class='" + (this.model.get("status_list") ? "modifiable" : "") +"'><div href='#' class='option' status='" + this.model.get("status") + "'></div></span></div>" : "");
        $(this.el).html(item_template);
        this.render(true);

        $(this.el).attr("cid", this.model.cid);
        if( this.model.get("order") != undefined ) { $(this.el).attr("order", this.model.get("order")); }
        if( this.model.get("folder") != undefined ) { $(this.el).attr("folder", this.model.get("folder")); }
        if( this.model.get("folder") != undefined ) { $(this.el).attr("group", this.model.get("folder")); } //COMPATIBILITY
        $(this.el).attr("answered", this.model.get("answered"));

        var item = this.model;

        //setup maximize/minimize button
        if( this.model.get("is_label_for_group") )
        {
            $(this.el).attr("is_label_for_group", this.model.get("is_label_for_group"));
            var bt_maxmin = $(this.el).find('.bt_maxmin');
            bt_maxmin.click(function() { if( item.get("minimized") == false ) { item.minimize(); } else { item.maximize(); } return false; });

            bt_maxmin.mousedown(function() { return false; }); // prevents easy_select conflicts
            bt_maxmin.mouseup(function() { return false; }); // prevents easy_select conflicts
        }

        $(this.el).find(".select").click(function() {
            if( item.get("selected") == true ) {
                item.set({selected:false});
            } else {
                item.set({selected:true});
            }
        });

        //setup item title callback
        $(this.el).find(".title span.title_text").click(function() { item.trigger("callback", item.get("callback"), list, item); });

        //setup status list buttons
        $(this.el).find('.status span').unbind('click').bind('click', function(event) {
            if( !item.get("status_list") ) { return; } //don't do anything if there is no status list to show
            event.stopPropagation();

            list = item.get("list") ? item.get("list") : undefined;
            $list_el = $(this.el).parents(".thm_tree");
             var bt_el = $(this).find("div.option");

             //removes any other status lists
             $(".status_list").remove();

             //makes resizable trees non-resizable, and adds special class to current tree for disabled effect
             if( $().resizable )
             {
                    $(".thm_panel_body").resizable("option", "disabled", true);
             }

             //reset on-click styling for all trees
             $(".thm_tree.thm_tree_resize_disabled").removeClass("thm_tree_resize_disabled");
             $(".thm_tree .thm_tree_list_item.hovered").removeClass("hovered");

             //set on-click styling for tree
             $list_el.addClass('thm_tree_resize_disabled');

            //hide the hover options
             var el = bt_el.parents(".status").find(".options");
             $list_el.find(".item").removeClass("hovered");
             el.parents(".item").addClass("hovered");
             bt_el.parents(".status").find(".options").hide();

             //create popup
            var status_list_template = "<div class='status_list'>" +
                 "<div class='options'>" +
                     "<span class='close'>x</span>" +
                             "{{#status_list}}" +
                             "<div class='group'>{{ group }}</div>" +
                             "{{#items }}" +
                             "<div href='#' class='option {{id}}' status='{{id}}'>{{title}}{{#description}}<span>- {{description}}</span>{{/description}}</div>" +
                             "{{/items}}" +
                             "{{/status_list}}" +
                 "</div>" +
            "</div>"
            var status_list_data = {
                status: item.get("status"),
                status_list: item.get("status_list")
            }
            var status_list_html = Mustache.to_html(status_list_template, status_list_data);
            var status_list = $(status_list_html);

            var top_pos = bt_el.offset().top, left_pos = bt_el.offset().left
            status_list.css("top", top_pos);
            status_list.css("left", left_pos);
            $("body").append(status_list);


            //calculate if the popup dialog is off screen; if so, move it up until it is on screen
            //this must be done after the element is added to the page, as its height cannot be calculated before
            //the status_list_bottom_pos is calculated relative to the top of the window, not the document
            //i.e. the scrollbar position should not affect the status_list_bottom_pos value
            //add 5px buffer
            var status_list_bottom_pos = $(status_list).height() + $(status_list).offset().top - $(window).scrollTop() + 5;
            var num_offscreen_pixels = status_list_bottom_pos - $(window).height();
            if( num_offscreen_pixels > 0 ) {
                top_pos -= num_offscreen_pixels;
                if( (top_pos - $(window).scrollTop()) > 0 ) {
                    status_list.css("top", top_pos);
                }
            }

            status = item.get("status");
            status_list.find("[status=" + status + "]").addClass('current');

            //hack to hide duplicate button from status list
            if( item.is_label() ) {

                //this is the worst hack i've ever written, but it's 3am - marc
                if( item.get("list") ) {
                    var module_name = $(item.get("list").elem).attr("status_list_name");
                    if( module_name == "feedback" ) { status_list.find(".options .visible").hide(); status_list.find(".options .active").hide(); status_list.find(".options .review").hide(); }
                }

                status_list.find(".options .duplicate").hide()
                status_list.find(".options .answers").hide()
            }

            //trigger status change event when user clicks status element
            $(status_list).find("div.option").unbind("click").bind('click', function(e) {

                var status = $(this).attr("status");

                // list.trigger("status_clicked", status, item, list);
                // list.trigger("status_clicked." + status, item, list);

                // $list_el.trigger("status_clicked." + $(this).attr("status"), item); //compatibility

                //if the option is a status change, change the item status
                if( _.indexOf(['active','active_visible','visible','review','inactive'], status) >= 0 ) {
                    item.set({status: status});
                }

                $(status_list).trigger("leave");

                item.trigger("status_clicked", status, item, list);

                return false;
            });

            status_list.bind("leave", function() {
                $(".status_list").remove();
                $list_el.find(".thm_tree_list_item").removeClass("hovered");
                if( $().resizable )
                {
                 $(".thm_panel_body").resizable("option", "disabled", false);
                }
                $list_el.removeClass('thm_tree_resize_disabled');
            });

            $("body").click(function(event) {
                status_list.trigger("leave");
                bt_el.unbind(event);
            });
            $(this).click(function(event) {
                event.stopPropagation();
            });

            item.trigger("status_list_added");
        });
        $(this.el).find('.status span').unbind('mousedown').bind('mousedown', function(event) { return false; }); // prevents conflict with easy_select
    },
    render: function(force_render) {
        if( true || force_render || this.model.hasChanged() ) {
            var changed = this.model.changedAttributes();
            if( force_render || changed['minimized'] != undefined ) {
                var curr_status = this.model.get("minimized") == false ? "maximized": "minimized";
                $(this.el).find(".maxmin").removeClass("maximized minimized").addClass(curr_status);
            }
            // if( force_render || changed["folder"] != undefined ) { $(this.el).attr("folder", this.model.get("folder") ); }
            // if( force_render || changed["title"] != undefined ) { $(this.el).find(".title_text").text( this.model.get("title") ); }
            // if( force_render || changed["selected"] != undefined ) { $(this.el).find(".select").removeClass("true false mixed").addClass( '' + this.model.get("selected") ); }
            // if( force_render || changed["status"] != undefined ) { $(this.el).find(".status .option").attr("status", this.model.get("status")); }

            $(this.el).attr("folder", this.model.get("folder") );
            $(this.el).find(".title_text").text( this.model.get("title") ).attr("title", this.model.get("tooltip"));
            $(this.el).find(".select").removeClass("true false mixed").addClass( '' + this.model.get("selected") );
            $(this.el).find(".status .option").attr("status", this.model.get("status"));
            $(this.el).attr("answered", this.model.get("answered"));
        }
    }
});

List = Backbone.Collection.extend({
    model: ListItem,
    elem: undefined,
    max_height: undefined,
    auto_order: true,
    status_list_name: undefined,
    callback_object: undefined,
    selectable: false,
    sortable: true,
    answered_item_keys: [],
    empty_message: 'No items here...',
    callback: undefined,
    easy_select: false,
    easy_select_callback: undefined,

    initialize: function() {
        this.bind("add", function(item) {
            var list = this;
            item.set({list: this}, {silent:true});
            item.bind("set:status", function() {
                //we have to check that the status is actually changed, because set:status is called to calculate the status of a folder
                //the culprit is in the "set:folder" binding
                //basically, this code is ridonculous needs to be cleaned up...
                if( this.get("status") != this.previous("status") ) {
                    this.trigger("status_changed", item.get("status"), item, list);
                }
            });

            //when an item's "answered" status changes, update the 'answered_item_keys' list
            item.bind("change:answered", function(list) {
                if( this.get("answered") ) {
                    if( !_.include(list.answered_item_keys, this.get("id")) ) {
                        list.answered_item_keys.push(this.get("id"));
                    }
                } else {
                    list.answered_item_keys = _.reject(list.answered_item_keys, function(key) { return key == this.get("id"); }.bind(this));
                }
            }.bind(item, list));

            if( this.auto_order ) { this.order(); }
            if( this.length > 0 ) { $(this.elem).find(".empty_message").hide(); }
            var text = "";
            var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

            for( var i=0; i < 5; i++ )
                text += possible.charAt(Math.floor(Math.random() * possible.length));
            $(this.elem).attr("id","test"+text);
            //set the item as answered, if it is in the .answered-item_keys list
            if( _.indexOf(this.answered_item_keys, item.get("id")) > -1 ) { item.set({answered:true}); }
        });
        this.bind("remove", function(item) {
            $(item.get("view").el).remove()
            if( this.length == 0 ) { $(this.elem).find(".empty_message").show(); }
        });
        $(window).trigger("tree_added", [this]);

        this.bind("status_clicked", function(status, item, list) {
            $(this.elem).trigger("status_clicked." + status, item); //compatibility
        });
    },
    set_scrollbar: function() {
        if( this.max_height > 0 ) {
            $(this.elem).css("max-height", this.max_height + "px");
            if( $().resizable ) {
                $(this.elem).parents(".thm_panel_body").resizable({
                    handles:"s",
                    minHeight: 40,
                    stop: $.proxy(function() {
                        var new_height = $(this.elem).parents(".thm_panel_body").height();
                        this.max_height = new_height;
                        $(this.elem).css("max-height", new_height + "px");
                    }, this)
                });
                $(this.elem).parents(".thm_panel_body").addClass("resizable");
            }
        }
    },
    convertHtml: function(elem) {
        //takes list of items and adds ListItems from their properties
        //EG:
        // <li id="" group="Lecture 2" is_group="1" is_maximized="1" is_minimized="" order="0" callback=""></li>
        // <li id="key__question_multiplechoicequestion__2212" group="Lecture 1" order="3" icon_type="item" tooltip="Which of the following is not one of Newton’s laws of motion?" callback="">Newton's Laws of Motion</li>
        // if( $(elem).parents(".thm_panel").attr("module_id") == "question") { console.profile("convertHtml"); }

        //make sure trees are only converted once
        if( $(elem).attr("thm_tree_converted") ) { return; }
        $(elem).attr("thm_tree_converted", true);

        this.elem = $(elem);
        this.elem.data("tree", this);
        var list = this;

        //get element's data, and clear it
        var children = $(elem).children().detach();
        $(elem).html("<div class='empty_message'>" + this.empty_message + "</div>");
        // $(elem).width($(elem).width() - 7 + "px"); //add space for jscrollpanel? HACKISH
        //get settings
        if( $(elem).attr("option_max_height") ) { this.max_height = $(elem).attr("option_max_height"); }
        if( $(elem).attr("selectable") ) { this.selectable = $(elem).attr("selectable"); }
        if( $(elem).attr("sortable") ) { this.sortable = $(elem).attr("sortable") == "false" ? false : true; }
        if( $(elem).attr("status_list_name") ) { this.status_list_name = $(elem).attr("status_list_name"); }
        if( $(elem).attr("option_default_callback") ) { this.callback = $(elem).attr("option_default_callback"); }
        if( $(elem).attr("easy_select")) { this.easy_select = $(elem).attr("easy_select") == "False" ? false : true }
        if( this.easy_select ) { this.selectable = true; }

        //loop through element's children, which each represent a list item
        children.each(function() {
            var $this = $(this);
            var is_label_for_group = ($this.attr("is_group") == "1") ? "folder" : false;
            var title = is_label_for_group ? $this.attr("group") : $this.text();
            if( title == list.empty_message ) { return; } //flaw in making empty item a <li> - it can be picked up again

            var status = $this.attr("status");
            if( !status && ($this.attr("is_sec_checked") || $this.attr("is_ter_checked") || $this.attr("is_visible"))) { status = list.calculate_item_status( $this.attr("is_visible"), $this.attr("is_sec_checked"), $this.attr("is_ter_checked") ); }

            list.auto_order = false;
            list.add({
                list: list,
                id: $this.attr("id"),
                folder: $this.attr("group"),
                order: parseInt($this.attr("order")),
                status: status,
                status_list_name: $this.attr("status_list_name"),
                title: title,
                callback: $this.attr("callback"),
                selected: $this.attr("is_checked") ? true : false,
                tooltip: $this.attr("tooltip"),
                easy_select: $this.attr("easy_select"),

                //folder specific properties
                is_label_for_group: is_label_for_group,
                minimized: $this.attr("is_maximized") ? false : true
            });
            list.auto_order = true;
        });
        if( this.sortable ) {
            this.elem.sortable({
                cancel: "div[is_label_for_group], .status",
                stop: function(event, details) {
                    //group all publisher commands that may be created as part of this statement into one request
                    publisher.pause();
                    var item_el = details.item;
                    var item = list.get_item_by_el(item_el);

                    //get the item's predecessor, and determine the item's new folder from it
                    var prev_item_el = item_el.prev();
                    var prev_item = list.get_item_by_el(prev_item_el);
                    var new_folder_name = prev_item ? prev_item.get("folder") : "";

                    //if the item has changed folders, trigger child_removed event on old folder and child_added on new folder
                    if( new_folder_name != item.get("folder") )
                    {
                        var old_folder = item.folder();
                        var new_folder = list.get_folder_label( new_folder_name );

                        item.set({folder: new_folder_name });

                        if( old_folder ) { old_folder.trigger("folder.child_removed", item); }
                        if( new_folder ) { new_folder.trigger("folder.child_added", item); }
                    }

                    //re-order everything - TODO: make more efficient?
                    list.elem.children().each(function(order,item_el){
                        var ordered_item = list.get_item_by_el(item_el);
                        if( ordered_item ) { ordered_item.set({order: order - 1}); } //thm list order is base 0
                    });

                    item.get("view").render(true);
                    list.trigger("order_changed", list, item);
                    publisher.play();
                }
            });
        }

        this.order();

        if(this.easy_select) {
            this.apply_easy_select();
        }
        // if( $(elem).parents(".thm_panel").attr("module_id") == "question") { console.profileEnd(); }
    },
    order: function()
    {
        /* warning: the order function will remove all events bound to the children */
        list = this;
        $el = $(this.elem);
        $el.children().detach(); //empty list element without removing each item's elements; this preserves event binding
        $el.html("<div class='empty_message'>" + this.empty_message + "</div>");
        if( this.length > 0 ) { $el.find(".empty_message").hide() } else { $el.find(".empty_message").show(); }

        sorted_list = [];

        root_items = list.filter(function(item) { return item.get("is_label_for_group") || !item.get("folder") });
        root_items = root_items.sort(function(i1, i2) {
            //folders always go first
            if( !i1.get("is_label_for_group") && i2.get("is_label_for_group") ) { return 1; }
            if( i1.get("is_label_for_group") && !i2.get("is_label_for_group") ) { return -1; }

            //folders are organized alphabetically
            if( i1.get("is_label_for_group") && i2.get("is_label_for_group") ) {
                return ( i1.get("title").toLowerCase() < i2.get("title").toLowerCase() ) ? -1 : 1;
            }

            //items are sorted by order; if two items have same order (should not happen), then sort alphabetically
            if ( i1.get("order") < i2.get("order") )
            {
                return -1;
            }
            else if ( i1.get("order") == i2.get("order") )
            {
                return ( i1.get("title").toLowerCase() < i2.get("title").toLowerCase() ) ? -1 : 1;
            }
            else
            {
                return 1;
            }
        });


        _.each(root_items, function(root_item) {
            sorted_list.push(root_item);
            if( root_item.get("is_label_for_group") ) {
                root_item_children = list.in_folder(root_item.get("title"), true);
                //sort root item's children by order
                root_item_children = root_item_children.sort(function(i1, i2) {
                    return ( i1.get("order") > i2.get("order") ) ? 1 : -1;
                });
                _.each(root_item_children, function(item) {
                    sorted_list.push(item);
                });
            }
        });

        _.each(sorted_list, function(item, order) {
            item.set({order: order}, {silent: true});
            $el.append(item.get("view").el);
        });

        if(this.length>0) {
            this.set_scrollbar();
        }
    },

    apply_easy_select: function() {
        // now that order is complete, we can bind events to the children
        if(this.easy_select === true) {
            var item = this
            function easy_select_mouseenter() {
                $(this).siblings().removeClass('easy_select_current');
                //$('.easy_select_initial').nextUntil($(this)).add($(this)).addClass('easy_select_current');
                var thisIndex = $(this).index();
                var initialIndex = $('.easy_select_initial').index();
                if(thisIndex < initialIndex) {
                    $(this).nextUntil($('.easy_select_initial'))
                        .add($(this)).add($('.easy_select_initial'))
                        .addClass('easy_select_current');
                } else if(thisIndex > initialIndex) {
                    $(this).prevUntil($('.easy_select_initial'))
                        .add($(this)).add($('.easy_select_initial'))
                        .addClass('easy_select_current');
                } else {
                    $(this).addClass('easy_select_current');
                }

            }



            function easy_select_mouseup(thisChild) {
                var context = $(thisChild).parent();

                var initial = context.find(".easy_select_initial");
                var current = context.find(".easy_select_current");

                var initial_li = item.getByCid($(initial).attr("cid"));

                if(initial_li.get("selected")) {
                    current.each(function() {
                        var li = item.getByCid($(this).attr("cid"));
                        li.set({"selected": false});
                    });

                } else {
                    current.each(function() {
                        var li = item.getByCid($(this).attr("cid"));
                        li.set({"selected": true});
                    });

                }



                $("body").unbind('mouseup');

                $(".easy_select_initial").each(function() {
                    $(this).removeClass("easy_select_initial");
                    $(this).siblings().add($(this)).unbind("mouseenter", easy_select_mouseenter);
                })
                $(".easy_select_current").removeClass("easy_select_current");



                $(this).unbind("mouseup");
                if(item.easy_select_callback) {
                    var selected = item.filter(function(li) {
                        return li.get("selected") && (!li.get("is_label_for_group"));
                    })
                    item.easy_select_callback(selected);
                }

                return false;
            }

            $el.children().each(function() {
                $(this).css({"cursor": "pointer"});
                $(this).mousedown(function(b) {
                    if(b.which != 1) { return; } // only use left clicks
                    $(this).addClass('easy_select_initial').addClass('easy_select_current');
                    $(this).siblings().add($(this)).mouseenter(easy_select_mouseenter);
                    var thisChild = this;
                    $('body').mouseup(function() {easy_select_mouseup(thisChild); return false});
                    return false;
                });

            });

            $el.find(".select").unbind("click");
        }
    },
    in_folder: function(folder_name, exclude_label) {
        items = this.filter(function(item) { return item.get("folder") == folder_name; })
        if( exclude_label ) { items = _.reject(items, function(item) { return item.get("is_label_for_group") }); }
        return items;
    },
    folders: function() {
        return this.filter(function(item) { return item.get("is_label_for_group") == "folder" });
    },
    get_folder_label: function(folder_name) {
        //gets the item that represents the folder's label
        return this.detect(function(item) { return (item.get("folder") == folder_name) && (item.get("is_label_for_group") == "folder"); })
    },
    smart_get: function(item) {
        //takes el, $el, item, and returns appropriate items
        if( _.isElement(item) || ((typeof(item) == "object") && item.attr) ) {
            return this.get_item_by_el(item); //jQuery or DOM element
        } else if( typeof(item) == "object" && item.cid ) {
            return item; //Item
        } else if( typeof(item) == "string" ) {
            return this.get(item);
        }
    },
    smart_gets: function(items) {
        //takes one or more el, $el, items, and returns list of appropriate items
        list = this;
        list_items = [];
        if( _.isArray(items) ) {
            _.each(items, function(item) { list_items.push(list.smart_get(item)); });
        } else if( (typeof(item) == "object") && item.attr ) {
            var that = this;
            item.each(function() { list_items.push(that.smart_get(this)); })
        } else {
            item = this.smart_get(items);
            return item ? [item] : [];
        }
        return list_items;
    },
    get_item_by_el: function(el) {
        cid = $(el).attr("cid");
        return this.detect(function(item) { return item.cid == cid; });
    },
    get_item_by_order: function(order) {
        // Return an item corresponding to the order argument
        list = this;
        return this.detect(function(item) { return item.get("order") == order });
    },

    /*
    * --------------------
    * ---  old methods ---
    * --------------------
    */
    add_item: function( name, id, folder, order, callback, is_checked, status ) {
        this.add({
            list: this,
            title: name,
            id: id,
            folder: folder,
            order: order,
            callback: callback,
            status: status
        });
    },
    delete_item: function( id ) {
        items = this.smart_gets( id );
        _.each(items, function(item) { item.remove(); });
    },
    get_item_text: function( id ) {
        return ( item = this.smart_get( id ) ) ? item.get("title") : undefined;
    },
    get_item_id: function( el ) {
        return ( item = this.smart_get(el) ) ? item.get("id") : undefined;
    },
    find_item: function( id ) {
        if( this.length == 0 ) { return $(); }
        item = this.detect(function(item) { return item.get("id") == id; });
        if( item ) { return $(item.get("view").el); }
        return $();
    },
    find_group: function( group_name ) {
        group_label = this.filter(function(item) { return ((item.get("is_label_for_group") == "folder") && (item.get("title") == group_name)); });
        if( group_label.length ) { return $(group_label[0].get("view").el); }
        return $();
    },
    set_item_status: function( els, status, ignore_group_status ) {
        items = this.smart_gets( els );
        _.each(items, function(item) { item.set({status:status}); });
    },
    calculate_group_status: function( group ) {},
    get_item_status: function( el ) {
        item = this.smart_get( el );
        return (item && item.get("status")) ? item.get("status") : "inactive";
    },
    get_item_status_dict: function( el ) {
        // var status = this.get_item_status(item);
        var status = this.smart_get( el ).get("status");

        var visible = ( (status == "active_visible") || (status == "visible") ) ? true : false;
        var active = ( (status == "active") || (status == "active_visible") ) ? true : false;
        var available = ( status == "review" ) ? true : false;

        return { visible: visible, active:active, available:available }
    },
    calculate_item_status: function( visible, active, available ) {
        if( (visible == true) && (active == true) ) { return "active_visible" }
        if( visible == true ) { return "visible" }
        if( active == true ) { return "active" }
        if( available == true ) { return "review" }
        return "inactive";
    },
    get_all_groups: function() {
        var groups = this.filter(function(item) { return item.get("is_label_for_group") == "folder"; });
        return $( _.map(groups, function(group) { return group.get("view").el; }) );
    },
    add_group: function(group_name) {
        this.add({
            list: this,
            title: group_name,
            folder: group_name,
            is_label_for_group: "folder",
            minimized: true
        });
    },
    delete_group: function(group_name) {
        items = this.in_folder(group_name);
        _.each(items, function(item) { item.remove(); });
    },
    is_maximized: function(el) {
        item = this.smart_get(el);
        return this.get("minimized") ? !this.get("minimized") : false;
    },
    maximize_group: function(group_name) {
        item = this.get_folder_label(group_name);
        item.maximize();
    },

    get_selected: function() {
        items = this.filter(function(item) { return item.get("selected") == true; });
        return $( _.map(items, function(item) { return item.get("view").el; }) );
    },
    get_selected_items: function() {
        items = this.filter(function(item) { return (!item.is_label() && (item.get("selected") == true)); });
        return $( _.map(items, function(item) { return item.get("view").el; }) );
    },
    get_selected_groups: function() {
        items = this.filter(function(item) { return (item.is_label() && (item.get("selected") == true)); });
        return $( _.map(items, function(item) { return item.get("view").el; }) );
    },
    get_selected_group_names: function() {
        items = this.filter(function(item) { return (item.is_label() && (item.get("selected") == true)); });
        return _.map(items, function(item) { return item.get("title"); });
    },
    get_sec_selected_items: function() {},
    get_ter_selected_items: function() {},
    get_all_items: function() {
        var items = this.filter(function(item) { return !item.is_label(); });
        return $( _.map(items, function(item) { return item.get("view").el; }) );
    },
    get_all_unanswered_items: function() {
        items = this.filter(function(item) { return (!item.is_label() && (item.get("answered") == false) && (item.get("status") == "active")); });
        return $( _.map(items, function(item) { return item.get("view").el; }) );
    },
    is_item_answered: function( el ) {
        item = this.smart_get(el);
        return item ? item.get("answered") : undefined;
    },
    set_item_answered: function( el ) {
        if( (window.user.get('role') == 'teacher') ) { return; }
        item = this.smart_get(el);
        if( item ) { item.set({answered: true}); }
    },
    set_item_text: function( id, new_folder_name ) {
        return ( item = this.smart_get( id ) ) ? item.set({title: new_folder_name}) : undefined;
    },
    sec_select_item: function( els ) {},
    sec_unselect_item: function( els ) {},
    ter_select_item: function( els ) {},
    ter_unselect_item: function( els ) {},
    set_item_visible: function( els ) {}
});
ThmTree = List;

var status_lists = {
    'course': [
        { "group": "Set Status",
          "items": [
            {
                "id": "on",
                'title':"On",
                "description": "Students can access and participate in course"
            },
            {
                "id": "off",
                'title':"Off",
                "description": "Students cannot access course"
            }
        ]}
    ],

    student: false
};
