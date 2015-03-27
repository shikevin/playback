
/* Notes: This file describes the client-side functionality of the
*  Question module's "view" objects. These objects extend Backbone
*  views to render content and bind for user input.
*/
define([
    'mathjax',
    'text!templates/question/layout_sms.html',
    'text!templates/question/layout.html',
    'text!templates/question/layout_mobile.html',
    'text!templates/question/layout_large_image.html',
    'util/Browser'
], function (
    mathjax,
    sms_html,
    layout,
    layout_mobile,
    layout_large_image,
    Browser
) {
    'use strict';
    var QuestionDetailsView = Backbone.View.extend({
        initialize: function (options) {
            this.model.set({view: this});

            this.listenTo(this.model, 'change:show_answer', this.render, this);
            this.listenTo(this.model, 'change:submission_msg', this.render_submission_msg, this);
            this.listenTo(this.model, 'change:sms', this.render, this);
            this.listenTo(this.model, 'change:status', this.render, this);
            this.listenTo(this.model, 'change:sms_code', this.render_sms, this);
            this.listenTo(window.course, 'change:sms_enabled', this.toggle_sms, this);
            if (window.user.get('role') === 'student') {
                this.listenTo(this.model.get('answer'), 'change:response', this.render_answered, this);
                this.listenTo(this.model.get('answer'), 'button:refocus', this.refocus, this);
            }
        },
        toggle_sms: function () {
            this.model.fetch({
                success: function () {
                    this.render_sms();
                }.bind(this)
            });
        },
        update: function () {
            this.model.get_required_attributes(function () {
                this.render();
            }.bind(this));
        },
        remove: function () {
            this.stopListening();
            Backbone.View.prototype.remove.call(this);
        },
        events: {
            'click .question_image img': 'magnify_image',
            'click .question_image a': 'magnify_sibling'
        },
        magnify_image: function (e) {
            var url = $(e.target).attr('full_img');
            var max_height, max_width, question_id, img_url, img;
            var magnify_image_close = function () {
                $('.fancybox-wrap').draggable('destroy');
                $('.fancybox-wrap').resizable('destroy');
                $('.fancybox-wrap').removeClass('magnified_image');
            };

            if(url) {
                $.fancybox({
                    href: url,
                    autoCenter: false,
                    autoResize: false,
                    overlayOpacity: 0,
                    onClosed: magnify_image_close
                });

                // find full size image
                question_id = this.model.attributes.id;
                img_url = $('#' + question_id).find('.question_image img').attr('src');
                img_url = img_url.replace('thumbnail/', '');

                // get dimensions
                img = $('<img src="' + img_url + '"/>').load( function () {
                    max_width = this.width;
                    max_height = this.height;

                    // jquery ui
                    $('.fancybox-wrap').draggable({
                        containment: $('#wrapper'),
                        cursor: 'move'
                    });

                    $('.fancybox-wrap').resizable({
                        alsoResize: '.fancybox-inner, .fancybox-image, .fancybox-content',
                        handles: 'n, s, e, w, ne, se, sw, nw',
                        aspectRatio: true,
                        minHeight: 50,
                        minWidth: 50,
                        maxHeight: (max_height+20), // +20 adjustement by experiment
                        maxWidth: (max_width+30),
                        containment: $('#course_wrapper')
                    });

                    // for move-cursor on hover
                    $('.fancybox-wrap').addClass('magnified_image');

                    // prevent automatic fancybox centering (stop unsmooth resize)
                    $.fancybox.center = function (){};
                });
            }
        },
        magnify_sibling: function (e) {
            e.preventDefault();
            $(e.target).siblings('img').click();
        },
        render: function () {
            // We display a different template based on parameters of the question
            if (Browser.is_mobile()) {
                this.template = layout_mobile;
            } else {
                if (this.model.get('layout_type') === 'large') {
                    this.template = layout_large_image;
                } else {
                    this.template = layout;
                }
            }

            this.$el.html($('#loading_template').html());
            var question_text = this.model.get('question');
            if( !question_text ) {
                question_text = '';
            }
            question_text = markdown.toHTML(question_text);

            var data = {
                id: this.model.get('id'),
                question: question_text,
                type: this.model.get('type'),
                item: this.model,
                custom_image_width: this.model.get('custom_image_width'),
                image_url: this.model.get('image_url'),
                image_thumbnail_url: this.model.get('image_thumbnail_url'),
                is_teacher: (window.user.get('role') === 'teacher') ? true : false
            };

            // Render the template
            var html = _.template(this.template)(data);

            this.$el.html(html);
            // Render the 'form' that has the answer options in it
            var content = this.$el.find('.question_content');
            var body = this.$el.find('.question_container');

            if (_.isUndefined(window.preview_panel)) {
                this.model.bind_student_answer_form(content);
            }
            else {
                this.model.bind_student_answer_form(content, window.preview_panel);
            }

            var is_anonymous = this.model.get('is_anonymous');
            if (is_anonymous) {
                switch(user.get('role')){
                        case 'teacher': // Let teacher know that the question is anonymous.
                            body.append('<p>This question is anonymous.</p>');
                        break;
                        case 'student': // Let the student know that their answer won't be linked back to them.
                            content.append('<p>This question is anonymous. Your answer will not be linked to you.</p>');
                        break;
                    }
             }

            // Set the student's answer
            if (this.model.get('type') === 'target' &&
                window.user.get('role') === 'student' &&
                this.model.get('answer') &&
                this.model.get('answer').get('response') !== undefined) {

                var answer_text = this.model.get('answer').get('response');
                this.model.get_subclass_fn('set_student_answer').apply(this, [this.$el, answer_text]);
            }


            // Image resizing
            if((window.user.get('role') === 'teacher') && (this.model.get('layout_type') !== 'large')) {
                var minHeight = 50;

                var mi = this.model;
                if(jQuery().resizable) {
                    this.$el.find('.question_image').resizable({
                        aspectRatio: true,
                        handles: 'sw',
                        minHeight: minHeight,
                        start: function () {
                            window.resize_contWidth = $(this).width();
                            window.resize_contHeight = $(this).height();
                            window.resize_ratio = window.resize_contHeight / window.resize_contWidth;

                            var maxWidth = 330;
                            var maxHeight = maxWidth * window.resize_ratio;

                            $(this).resizable('option', 'maxWidth', maxWidth);
                            $(this).resizable('option', 'maxHeight', maxHeight);
                        },
                        stop: function () {
                            // There seems to be a very rare bug that causes the element to resize to nothing
                            // This will detect it and reset the image to it's original state
                            if( $(this).height() < minHeight ) {
                                $(this).width( window.resize_contWidth + 'px' );
                                $(this).height( window.resize_contHeight + 'px' );
                            }

                            // Occasionally, fast resizing can cause the ratio to get off whack; this will
                            // Ensure that the ratio is appropriate
                            var newRatio = $(this).height() / $(this).width();
                            if( newRatio !== window.resize_ratio ) {
                                $(this).height( $(this).width() * window.resize_ratio + 'px' );
                            }

                            mi.save({ custom_image_width: $(this).width() });
                        }
                    });
                }
            }

            var question_desc_el = this.$el.find('.question_description')[0];
            mathjax.execute_mathjax(question_desc_el);
            var question_content_el = this.$el.find('.question_content')[0];
            mathjax.execute_mathjax(question_content_el);

            // Resize code block elements to fit question content width
            var resize_code_element = function () {
                var code_el = this.$el.find('.code');

                // Hide the code element to prevent it from affecting the parent container width
                code_el.hide();

                // Don't resize this at all
                code_el.show();
            }.bind(this);
            resize_code_element();

            this.$el.find('.code').show();

            if(this.model.get('view') && this.model.get('view').panel) {
                // When questions are magnified, hide code blocks during magnification calculation
                this.model.get('view').panel.$('.ui-tabs-panel').unbind('magnifyinitialized').bind('magnifyinitialized', function () {
                    this.$el.find('.code').hide();
                }.bind(this));

                // Show code blocks after magnification calculation and size them to fit question content
                this.model.get('view').panel.$('.ui-tabs-panel').unbind('magnifyend').bind('magnifyend', function () {
                    resize_code_element();

                    //becuase code blocks are not present during font-size magnification calculation, code font sizes
                    //can be blown to ridiculous proportions. We add a little hack to prevent them from getting
                    //bigger than 15px
                    var code_el = this.$el.find('.code');
                    if( parseInt(code_el.css('font-size'), 10) > 15 ) {
                        code_el.css('font-size', '15px');
                        code_el.css('line-height', '1.1em');
                    }
                }.bind(this));
            }
            this.render_sms();
            this.render_answered();
            //hack to get jquery mobile to render form elements properly
            if( Browser.is_mobile() ) {
                try {
                    this.$el.parents('div[data-role=page]').page('destroy').page();
                } catch(e) {} //will raise exception if mobile page has not been initialized
            }

            var view = this.model.get('view');
            if (view && view.panel) {
                _.delay(function () {
                    view.panel.trigger('redo_magnify');
                }, 50); // hack because sometimes they magnify before getting rendered... or something
            }
            return this;
        },
        render_submission_msg: function () {
            // Submission msg appears on student side only
            if (window.user.get('role') === 'student') {
                if (this.model.get('type') === 'target') {
                    var validate_answer = this.model.get_subclass_fn('validate_answer');
                    if ( _.isFunction(validate_answer) && validate_answer(this.model)) {

                        // Special hack for click on target types
                        var func = this.model.get_subclass_fn('show_answer_in_answer_form');
                        func.apply(this.model);
                    }
                } else {
                    var msg_el = this.$('.submitted_answer');
                    if (this.model.get('submission_msg') !== '') {

                        msg_el.text(this.model.get('submission_msg'));
                    } 
                }
            }
        },
        render_sms: function () {
            var module_type = this.model.get('type');
            if (
                window.user.get('role') === 'student' ||
                module_type === 'target'
            ) {
                return;
            }

            var sms_code = this.model.get('sms_code');
            var data = {
                enabled: (
                    window.course.get('sms_enabled') && sms_code &&
                    this.model.get('status') === 'active_visible'
                ),
                code: sms_code,
                phone_number: this.model.get('sms_phone_number'),
                hide_example: false,
                type: module_type,
                all_correct: Boolean(this.model.get('all_correct'))
            };
            this.$('.sms_container').html(_.template(sms_html)(data));
        },
        render_answered: function () {
            if (window.user.get('role') === 'teacher') { return; }
            var answer, response, container;
            answer = this.model.get('answer');
            if (!answer || answer.get('response') === null) { return; }
            response = answer.get('response')+'';
            if (response.length > 0) {
                container = this.$('.submitted_answer');
                container.empty();

                if (container.length > 0) {
                    this.model.get_subclass_fn('set_student_answer')(container, response);
                }
            }
        },
        refocus: function() {
            //reset focus on the submit button (if it was not mouse clicked)
            var submit_btn = this.$el.parents('.thm_panel').find('.thm_panel_footer button');
            setTimeout( function() {
                //hack: ':hover' not working wihtout delay timeout
                if (submit_btn.is(":hover") === false) {
                    submit_btn.focus();
                }
            }, 10);
        }
    });

    return QuestionDetailsView;
});
