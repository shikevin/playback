/* global _ */
define([
    'text!templates/question/click_on_target.html'
], function (html) {
    'use strict';
    var ClickQuestionItem = {
        placeholders: {
            'description': 'Click on the following question, then click "Submit":'
        },
        bind_editor_el: function(el, form) {
            form.addValidation('correct_items_specified', function(val,a,b) {
                var has_correct_answer = this.collection.get('has_correct_answer').value();

                if( !has_correct_answer ) {
                    return true;
                } else {
                    var correct_answers = $(this.get('el')).find('.cInput .cotTarget');
                    return correct_answers.length ? true : 'A correct answer must be specified';
                }
            });

            // Remove default form values for image uploading. The sub-keys
            // need to be removed as well or the new ones we are replacing them
            // with will be replaced as well (eg: image_key).
            form.get('image_data').remove();
            form.get('image_key').remove();
            form.get('layout_type').remove();

            var form_values = [
                {
                    id: 'type',
                    type: 'hidden',
                    value: 'target'
                },
                {
                    id: 'image_url',
                    type: 'hidden',
                    validation: ['not_empty']
                },
                {
                    id: 'image_key',
                    type: 'upload',
                    mime_types: 'image/bmp,image/jpeg,image/png,image/gif,image/tiff',
                    label: 'Upload an image:',
                    size_warning: true,
                    validation: ['not_empty'],
                    change: function () {
                        if (_.isArray(this.value())) {
                            this.collection.get('image_url').value(this.value()[2]);
                        }
                        this.collection.get('image_key').value(this.value());
                    }
                },
                {
                    id: 'targets',
                    type: 'set',
                    set_wrapper: '<div class="cot empty" style="display:none;">' +
                        '<div class="cSetWrapper"></div>' +
                        '<img/>' +
                        '<span class="emptyDesc">Upload an image to begin</span>' +
                        '</div><b class="upload_msg">Upload an image to begin</b>',
                    structure_wrapper: '<div class="cotTarget"></div>',
                    immutable: true,
                    value: [],
                    validation: ['correct_items_specified'],
                    initialize: function () {
                        setTimeout(function () {
                            var item = this;
                            this.collection.get('image_url').bind('change', function () {
                                var img_el = $(item.get('el')).find('img');
                                if (this.value()) {
                                    $(item.get('el')).find('.cot').removeClass('empty');
                                    $(item.get('el')).find('.cot').css('display', 'block');
                                    $(item.get('el')).find('.upload_msg').css('display', 'none');
                                    img_el.attr('src', this.value());
                                }
                                img_el.bind('load readystatechange', function (e) {
                                    item.refresh();
                                    // make a fake img to ensure we get the original size
                                    var fake_img = new Image();
                                    fake_img.src = img_el.attr('src');
                                    var orig_width = fake_img.width, orig_height = fake_img.height;
                                    var ratio = orig_width === 0 ? 0 : orig_height / orig_width;
                                    img_el.css('min-height', ratio * 300 + 'px');
                                });
                            });
                            // Trigger change event for when we are editing a question
                            if (this.collection.get('image_url').value() !== '') {
                                this.collection.get('image_url').trigger('change');
                            }
                            $(this.get('el')).find('.cSetWrapper').bind('click', function (e) {
                                var size = 15;
                                var x = e.pageX - $(this).offset().left;
                                var y = e.pageY - $(this).offset().top;
                                var pctX = Math.round(x / $(this).width() * 1000) / 1000;
                                var pctY = Math.round(y / $(this).height() * 1000) / 1000;
                                var pctSize = Math.round(size / $(this).width() * 1000) / 1000;
                                var widthHeightRatio = Math.round($(this).width() * 1000 /
                                                                  $(this).height()) / 1000;
                                var val = $.extend([], item.value());
                                val.push([
                                    pctX,
                                    pctY,
                                    pctSize,
                                    widthHeightRatio
                                ]);
                                item.value(val);
                                // update the number of attempts picker to ensure that the prof cannot limit students to less
                                // attempts than there are targets
                                var num_items = item.value().length;
                                var num_attempts = item.collection.get('num_attempts');
                                num_attempts.set({num_greater_than_equal: num_items});
                                if (num_attempts.value() < num_items) {
                                    num_attempts.value(num_items);
                                }
                            });
                        }.bind(this), 100);
                    },
                    structure: function (set_item) {
                        if (!set_item.value() && !set_item.index) {
                            return false;
                        }
                        var width = set_item.value()[2];
                        var height = width * set_item.value()[3];
                        /* multiply by the (width : height) ratio */
                        var x = set_item.value()[0];
                        var y = set_item.value()[1];
                        x -= width / 2;
                        y -= height / 2;
                        var el = $(set_item.el);
                        el.css({
                            top: y * 100 + '%',
                            left: x * 100 + '%',
                            height: height * 100 + '%',
                            width: width * 100 + '%'
                        });
                        el.html('<div class="cotTargetDetails"><button class="cotSize">-' +
                                '</button><button class="cotSize">+</button><button ' +
                                'class="cotDelete">Delete</button></div>');
                        // Prevent the click event from bubbling down to the .cSetWrapper element
                        el.bind('click', function (e) {
                            e.stopPropagation();
                        });
                        el.find('.cotSize').bind('click', {set_item: set_item}, function (e) {
                            var val = $.extend([], e.data.set_item.value());
                            var amt = $(this).text() === '+' ? 0.05 : -0.05;
                            val[2] += amt;
                            if (val[2] > 0.02) {
                                e.data.set_item.value(val);
                            }
                            e.stopPropagation();
                        });
                        el.find('.cotDelete').bind('click', {
                            item: this,
                            set_item: set_item
                        }, function (e) {
                            e.stopPropagation();
                            // Remove the item from the set's values list
                            var item = e.data.item;
                            var val = $.extend([], e.data.item.value());
                            val.splice(e.data.set_item.index, 1);
                            item.value(val);
                            // update the number of attempts picker to ensure that the prof cannot limit students to less
                            // attempts than there are targets
                            var num_items = item.value().length;
                            var num_attempts = item.collection.get('num_attempts');
                            num_attempts.set({num_greater_than_equal: num_items});
                        });
                        // Set up dragging
                        el.draggable({ 'containment': el.parents('.cot') });
                        var offsetX = 0;
                        var offsetY = 0;
                        el.on('dragstart', function (e) {
                            if (e.originalEvent.offsetX === undefined) {
                                // this works for Firefox
                                e.originalEvent.offsetX = e.originalEvent.pageX - $(this).offset().left;
                                e.originalEvent.offsetY = e.originalEvent.pageY - $(this).offset().top;
                            }
                            offsetX = e.originalEvent.offsetX;
                            offsetY = e.originalEvent.offsetY;
                        });
                        el.bind('dragstop', { 'set_item': set_item }, function (e) {
                            var wrapper_el = $(this).parent();
                            // jQuery 1.7 removed event.pageX and event.pageY.
                            // Use event.originalEvent object to access them.
                            var el_radius = $(this).height() / 2;
                            // Calculate the diff from mouse X,Y from target center X,Y
                            var diffX = el_radius - offsetX;
                            var diffY = el_radius - offsetY;
                            var pxX = e.originalEvent.pageX - wrapper_el.offset().left + diffX;
                            var pxY = e.originalEvent.pageY - wrapper_el.offset().top + diffY;
                            // Checks to ensure that the element does not go past the containment field
                            // radius is few pixels off
                            var wrapper_width = wrapper_el.width();
                            var wrapper_height = wrapper_el.height();
                            if (pxX + el_radius > wrapper_width) {
                                pxX = wrapper_width - el_radius;
                            }
                            if (pxX - el_radius < 0) {
                                pxX = el_radius;
                            }
                            if (pxY + el_radius > wrapper_height) {
                                pxY = wrapper_height - el_radius;
                            }
                            if (pxY - el_radius < 0) {
                                pxY = el_radius;
                            }
                            var pctX = Math.round(pxX / wrapper_el.width() * 1000) / 1000;
                            var pctY = Math.round(pxY / wrapper_el.height() * 1000) / 1000;
                            var pctSize = set_item.value()[2];
                            // Size of the target
                            var widthHeightRatio = set_item.value()[3];
                            set_item.value([
                                pctX,
                                pctY,
                                pctSize,
                                widthHeightRatio
                            ]);
                        });
                        return true;
                    }
                },
                {
                    id: 'limit_attempts',
                    type: 'checkbox',
                    label: 'Limit the number of clicks a student may make'
                },
                {
                    id: 'num_attempts',
                    type: 'picker',
                    options: _.range(1, 50),
                    label: 'Maximum clicks by student',
                    tooltip: 'This specifies the highest number of times a student may ' +
                        'click on the image while searching for the targets. Set this ' +
                        'value to the number of targets if you do not want students to ' +
                        'be given extra attempts',
                    validation: ['num_greater_than_equal'],
                    num_greater_than_equal: 1,
                    initialize: function () {
                        setTimeout(function () {
                            var num_attempts_item = this;
                            var limit_attempts_item = this.collection.get('limit_attempts');
                            var num_attempts = num_attempts_item.value();
                            var limit_attempts = limit_attempts_item.value();
                            if (num_attempts === null && limit_attempts === false) {
                                // Show the checkbox for old questions
                                limit_attempts_item.show();
                            } else {
                                // Newer questions will have a default num_attempts_item is 1.
                                limit_attempts_item.hide();
                            }
                            if (this.value() === null) {
                                this.value(1);
                                num_attempts_item.hide();
                            }
                            var limit_attempts_callback = function () {
                                if (!limit_attempts_item.value()) {
                                    num_attempts_item.hide();
                                } else {
                                    num_attempts_item.show();
                                }
                            };
                            limit_attempts_item.bind('change', limit_attempts_callback);
                            if (limit_attempts_item.value() !== undefined) {
                                limit_attempts_callback();
                            }
                        }.bind(this), 100);
                    }
                }
            ];

            form.get('question_fields').value(form_values);

            if(this.get('image_url')) {
                //set image_key, hacky, but a less ugly hack than making
                //composer do multifield validation WEB-8166
                var split_url = this.get('image_url').split('/');

                if(split_url.length) {
                    var file = split_url[split_url.length - 1];
                    this.set('image_key', file);

                }
            }

            //set up form data
            var data = {};
            if( this.get('id') ) {
                data = this.toJSON();
            } else {
                data.image_url = '';
                data.limit_attempts = false;
            }
            form.values( data );

            return form;
        },
        validate_answer: function (mi) {
            /**
             * Check to make sure that the answer is submittable
             * For this model, that means it should not be null.
             */
            var value = mi.get('view').panel.$b('.question_content');
            var answer_text = mi.get_student_answer(value);
            if (answer_text === null) {
                mi.set({ submission_msg: 'Please click a valid target.'});
                return false;
            } else {
                return true;
            }
        },
        bind_student_answer_form: function(el) {
            var mi = this;
            var form = $(el).composer({
                id: 'targets',
                type: 'set',
                set_wrapper: html,
                structure_wrapper: '<div class="cotTarget"></div>',
                immutable: true,
                num_attempts: this.get('num_attempts'),
                limit_attempts: this.get('limit_attempts'),
                value: [],
                image_url: this.get('image_url'),
                review_mode: false,
                initialize: function() {
                    var item = this;
                    var this_get_el = $(this.get('el'));
                    var img_el = this_get_el.find('img');
                    img_el.attr('src', this.get('image_url'));

                    img_el.bind('load', {'item': this}, function(e) {
                        e.data.item.refresh();

                        // make a fake img to ensure we get the original size
                        var fake_img = new Image();
                        fake_img.src = img_el.attr('src');
                        var orig_width = fake_img.width,
                            orig_height = fake_img.height;
                        var ratio = orig_width === 0 ? 0 : orig_height / orig_width;

                        var parent = img_el.parent('.magnify_scale_pixel');
                        img_el.css('min-height', ratio * 300 + 'px');
                        parent.css('min-height', ratio * 300 + 'px');
                    });

                    var update_click_counter_fn = function() {

                        if( this.get('limit_attempts') ) {
                            $(this.get('el')).find('.num_attempts').show();
                            var count =this.get('num_attempts') - ( this.get('review_mode') ? 0 : this.value().length );
                            $(this.get('el')).find('.num_attempts b').html( count );
                        } else {
                            $(this.get('el')).find('.num_attempts').hide();
                        }
                    };

                    function clickOnTargetClickHandler (e) {
                        var _item = item;

                        if(_item.get('review_mode') && _item.get('el').data('review_data')) {
                            mi.toggle_answer();
                        }

                        //if the user clicks in review mode, reset to submission mode
                        if( _item.get('review_mode') ) {
                            _item.set({ 'review_mode': false }, { silent: true });
                            _item.value([]);
                        }

                        //determine the number of clicks remaining
                        if( _item.get('limit_attempts') ) {
                            var clicks_remaining = _item.get('num_attempts') - _item.value().length;
                            if( clicks_remaining <= 0 ) {
                                return false;
                            }
                        }

                        /*jshint validthis:true */
                        var x = e.pageX - $(this).offset().left;
                        var y = e.pageY - $(this).offset().top;
                        var pctX = Math.round( x / $(this).width() * 1000 ) / 1000;
                        var pctY = Math.round( y / $(this).height() * 1000 ) / 1000;


                        var val = $.extend([], _item.value());
                        val.push([pctX, pctY]);
                        _item.value( val );

                        update_click_counter_fn.apply(_item);

                        return true;
                    }

                    if ($().tap) {
                        this_get_el.find('.cSetWrapper').tap(clickOnTargetClickHandler);
                    } else {
                        this_get_el.find('.cSetWrapper').click(clickOnTargetClickHandler);
                    }

                    update_click_counter_fn.apply(this);

                    function clearTargetsClickHandler(e) {
                        var _item = item;
                        _item.value([]);
                        if(_item.get('review_mode') && this_get_el.data('review_data')) {
                            mi.toggle_answer();
                        }
                        update_click_counter_fn.apply(_item);
                    }

                    if ($().tap) {
                        this_get_el.find('button.clear_targets').tap(clearTargetsClickHandler);
                    } else {
                        this_get_el.find('button.clear_targets').click(clearTargetsClickHandler);
                    }


                },
                structure: function(set_item) {
                    if( !set_item.value() && !set_item.index ) {
                        return false;
                    }

                    var container_el = this.get('el').find('.cSetWrapper');
                    var container_width = container_el.width();
                    var container_height = container_el.height();

                    var size = set_item.value()[2] ? set_item.value()[2] * container_width : 15; //if a width ratio is present, use it; otherwise, use default width of 15
                    var widthHeightRatio = Math.round( container_width * 1000 / container_height ) / 1000;
                    var width = Math.round( size / container_width * 1000 ) / 1000;
                    var height = width * widthHeightRatio;

                    var x = set_item.value()[0];
                    var y = set_item.value()[1];

                    x -= width / 2;
                    y -= height / 2;


                    var el = $(set_item.el);
                    el.css({
                        top: (y * 100)  + '%',
                        left: (x * 100) + '%',
                        height: (height * 100) + '%',
                        width: (width * 100) + '%'
                    });

                    if( this.get('review_mode') ) {
                        el.addClass('review_mode');

                        if( this.get('review_mode_color') ) {
                            el.addClass('review_mode_' + this.get('review_mode_color'));
                        }
                    }

                    //prevent the click event from bubbling down to the .cSetWrapper element
                    el.bind('click', function(e) {
                        e.stopPropagation();
                    });

                    return true;
                }
            });
            $(el).data('answer_form', form);
            mi.off('answered', this.get_subclass_fn('answered'), this);
            mi.on('answered', this.get_subclass_fn('answered'), this);
            return form;
        },
        answered: function () {
            var el = this.get('view').panel.$b();
            var is_anonymous = this.get('is_anonymous');
            if (is_anonymous) {
                //remove targets after
                $('.cSetItem', el).remove();
            } else {
                $('.cSetItem', el).addClass('review_mode_yellow');
            }
        },
        get_student_answer: function(el) {
            var form = $(el).data('answer_form');
            return form.get('targets').value();
        },
        set_student_answer: function(el, answer_text) {
            var is_anonymous = (answer_text === 'Anonymously');
            var _$ = $;
            var $el = _$(el);
            if ($el.selector === '.submitted_answer' && answer_text !== null) {
                if (is_anonymous){
                    $el.find('.submission_msg').remove();
                    $el.append('<div class="submission_msg">You submitted:  Anonymously</div> ');
                } else {
                    var number_clicks = $.parseJSON(answer_text).length;
                    $el.find('.submission_msg').remove();
                     $el.append('<div class="submission_msg">You submitted: ' +
                    number_clicks + ' target' + (number_clicks === 1 ? '' : 's') + '</div>');
                }
                /*
            var _$ = $;
            var $el = _$(el);
            if ($el.selector === '.submitted_answer' && answer_text !== null) {
                var number_clicks = $.parseJSON(answer_text).length;
                $el.find('.submission_msg').remove();
                $el.append('<div class="submission_msg">You submitted: ' +
                    number_clicks + ' target' + (number_clicks === 1 ? '' : 's') + '</div>');*/
            }

            var form = $el.find('.question_content.cForm').data('answer_form');
            if( !form ) {
                return false;
            }
            var form_item = form.get('targets');
            if(this.model.get('show_answer')) {
                return false;
            }
            var form_data = {
                review_mode: true,
                review_mode_color: 'yellow'
            };

            if (is_anonymous) {
                form_data['value'] = null;
                form_item.refresh();
            } else {
                form_data['value'] = _$.parseJSON(answer_text);
            }

            var data = _$.parseJSON(answer_text);
            var form_item = form.get('targets');
            form_item.set({
                'review_mode': true,
                'review_mode_color': 'yellow',
                'value': data
            });
            form_item.refresh();
            return true;
        },
        show_answer_in_answer_form: function ($el) {
            var view = this.get('view');
            if (view === undefined || view.panel === undefined) { return; }
            var form = view.panel.$b('.question_content.cForm').data('answer_form');
            if( !form ) {
                return false;
            }

            var item = form.get('targets');
            var item_el = item.get('el');
            var review_data = item_el.data('review_data');

            if (review_data && !this.get('show_answer')) {
                item_el.data('review_data', false);
                item.set(review_data);
            } else {
                item_el.data('review_data', {
                    review_mode: item.get('review_mode'),
                    review_mode_color: item.get('review_mode_color'),
                    value: item.get('value')
                });

                item.set({
                    review_mode: true,
                    review_mode_color: undefined,
                    value: this.get('targets')
                });
            }

            item.refresh();
            return true;
        },
        clear_answer: function(el) {
        }
    };

    return ClickQuestionItem;
});
