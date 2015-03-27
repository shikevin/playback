/* global Backbone */
define([
    'util/Browser'
], function (
    Browser
) {
    'use strict';

    var DemoDetailsView = Backbone.View.extend({
        initialize: function() {},
        render: function() {
            //check min required elements are present, and get them if they are not
            this.model.get_required_attributes(function() {
                //once the demo is loaded, start a periodic check to look for questions
                //if questions are found, trigger 'demo_questions_discovered' event, passing along the questions
                this.model.off("loaded").on("loaded", function() {
                    this.question_check_interval_counter = 0;
                    this.question_check_interval_running = true;
                    this.question_check_interval = setInterval(function() {
                        //if this interval timer is no longer running, remove it
                        //potential fix for bug that caused demo_questions_discovered event to be triggered infinitely
                        //unreproducable, but we suspected it was caused by setInterval events 'piling up' in a queue
                        if( !this.question_check_interval_running ) {
                            clearInterval(this.question_check_interval);
                            return false;
                        }

                        var questions = undefined;
                        if( this.model.get("type") == "flash_file" ) {
                            var demo_el = document.getElementById( this.model.get("demo_name") );
                            if( demo_el && demo_el.fl_getQuizNames ) {
                                try {
                                    questions = demo_el.fl_getQuizNames();
                                } catch(err) {}
                            }
                        } else {
                            var iframe_el = $(this.el).find("iframe");
                            if( iframe_el.length ) {
                                var iframe_el = iframe_el[0];
                                if( iframe_el.contentWindow && iframe_el.contentWindow.getQuizNames ) {
                                    questions = iframe_el.contentWindow.getQuizNames();
                                }
                            }
                        }

                        if(questions) {
                            this.question_check_interval_running = false;
                            this.model.trigger("demo_questions_discovered", questions);
                        } else {
                            this.question_check_interval_counter++;
                            if( this.question_check_interval_counter > 30 ) {
                                this.question_check_interval_running = false;
                            }
                        }
                    }.bind(this), 500, this);
                }.bind(this));

                this.model.render_body(function(error, body_html){
                    if ((this.model.get('type') == 'thm_demo') && (Browser.is_web() || Browser.is_presentation_tool())) {
                        require('Modules').get_module('demo').check_thm_plugin(this.$el, function() {
                            this.$el.html(body_html);
                            this.model.trigger('loaded');
                        }.bind(this));
                    } else {
                        this.$el.html(body_html);
                        this.model.trigger("loaded");
                    }
                }.bind(this));
            }.bind(this));

            return this;
        }
    });

    return DemoDetailsView;
});
