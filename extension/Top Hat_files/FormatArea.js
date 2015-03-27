/* global Backbone, _, panels */
define([
    'models/course/CourseItems',
    'views/course/CourseItems',
    'text!templates/forms/format_area.html',
    'layouts/edumacation/LayoutCollection'
], function (
    CourseItems,
    CourseItemsView,
    html,
    layouts
) {
    'use strict';

    var FormatAreaView = Backbone.View.extend({
        template: _.template(html),
        className: 'format_area',
        events: {
            'change textarea': 'set_value',
            'click a:not(".preview")': 'add_formatting',
            'click a.preview': 'preview',
            'click .preview_container': 'clickPreview'
        },
        initialize: function (options) {
            this.options = options || {};
        },
        render: function () {
            var data = {
                value: this.model.get(this.options.valueAttr)
            };
            this.$el.html(this.template(data));
            this.$('textarea').trigger('change');
        },
        setSelectionRange: function (input, selectionStart, selectionEnd) {
            if (input.setSelectionRange) {
                input.focus();
                input.setSelectionRange(selectionStart, selectionEnd);
            } else if (input.createTextRange) {
                var range = input.createTextRange();
                range.collapse(true);
                range.moveEnd('character', selectionEnd);
                range.moveStart('character', selectionStart);
                range.select();
            }
        },
        add_formatting: function (e) {
            var type, el, val, length, start, end, text, result, target, n, prev, next, default_link, default_text;
            e.preventDefault();

            target = $(e.target).closest('a');
            type = target[0].classList[0];
            el = this.$('textarea');
            val = el.val();
            length = val.length;
            start = el[0].selectionStart;
            end = el[0].selectionEnd;
            text = val.substring(start, end);

            result = {
                text: text,
                start: 0,
                end: text.length
            };

            switch (type) {
            case 'bold':
                result.text = '**' + text + '**';
                result.start = 2;
                result.end = 2 + text.length;
                break;

            case 'italic':
                result.text = '*' + text + '*';
                result.start = 1;
                result.end = 1 + text.length;
                break;

            case 'h1':
                if (text.length === 0) {
                    text = 'Heading';
                }
                // put it on its own line as a header
                result.text = '# ' + text;
                result.start = 2;
                if (start !== 0) {
                    // check previous 2 characters for newlines
                    prev = val.substring(Math.max(0, start - 2), start);
                    n = 2 - (prev.split('\n').length - 1);
                    result.text = new Array(n + 1).join('\n') + result.text;
                    result.start += n;
                }

                // check the next 2 characters for newlines
                next = val.substring(end, Math.min(val.length - 1, end + 2));
                n = 2 - (next.split('\n').length - 1);
                result.text = result.text + new Array(n + 1).join('\n');

                result.end = result.text.length - n;
                break;

            case 'list':
                result.text = text;
                break;

            case 'code':
                if (text.indexOf('\n') === -1) {
                    result.text = '`' + text + '`';
                    result.start = 1;
                    result.end = 1 + text.length;
                } else {
                    result.text = '    ' + text.replace(/\n/g, '\n    ');
                    result.start = 0;
                    result.end = result.text.length;
                }
                break;

            case 'math':
                result.text = '[math]' + text + '[/math]';
                result.start = 6;
                result.end = 6 + text.length;
                break;

            case 'link':
                default_link = 'http://www.example.com';
                default_text = 'link text';

                if (text.length === 0) {
                    text = default_text;
                }

                result.start = 1;
                result.end = 1 + default_text.length;

                result.text = '[' + default_text + '](' + text + ') ';
                break;

            case 'item':
                this.embedItems();
                break;

            case 'html':
                default_link = 'Put HTML Here';
                default_text = 'html';
                if (text.length === 0) {
                    text = default_text;
                }

                result.start = 1;
                result.end = 1 + default_text.length;

                result.text = '[' + default_text + '](' + text + ') ';
                break;
            }
            el.val(val.substring(0, start) + result.text + val.substring(end, length));
            el.trigger('change');
            this.setSelectionRange(el[0], start + result.start, start + result.end);
        },
        embedItems: function () {
            var doit;
            var panel = panels.add({
                id: 'course_items_picker',
                body: $('#loading_template').html(),
                width: 320,
                title: 'Select items',
                layout: layouts.get('dialog'),
                footer_buttons: {
                    'Cancel': 'remove',
                    'OK': function () {
                        doit();
                    }
                }
            });
            var items = new CourseItems({'max_height': 200});
            var modules = ['question', 'demo', 'discussion', 'files'];
            _.each(modules, function (module) {
                var tree = items.sanitize_tree(require('Modules').get_module(module).get('tree'));
                items.add_tree(module, tree);
            });
            var v = new CourseItemsView({
                model: items
            });
            panel.set({body: v.el});
            v.render();
            doit = function () {
                var el = this.$('textarea');
                var result = items.get('trees').reduce(function (outer_memo, tree) {
                    var module = tree.id;
                    var selected = tree.selected(true);
                    if (selected.length === 0) { return outer_memo; }
                    var str = selected.reduce(function (memo, item) {
                        return memo + '{' + module + '}[' + item.id + ']\n\n';
                    }, '');
                    return outer_memo + str + '\n';
                }, '');
                el.val(el.val() + result);
                panel.remove();
                el.trigger('change');
                el.focus();
            }.bind(this);
        }
    });
    return FormatAreaView;
});
