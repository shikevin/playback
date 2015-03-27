/* global _ */
define([
    'models/course/CourseItems'
], function (
    CourseItems
) {
    'use strict';
    var CoursePack = CourseItems.extend({
        defaults: $.extend({}, CourseItems.prototype.defaults, {
            title: undefined,
            password: undefined,
            category: undefined,
            categories: ['chemistry'],
            sortable: true,
            import_profiles: true
        }),
        load_categories: function () {
            window.publisher.send({
                module: 'course',
                command: 'get_course_packs',
                success: $.proxy(function (data, args) {
                    var categories = _.uniq(_.map(args.course_packs, function (cp) {
                            return cp.category;
                        }));
                    if (categories.length === 0) {
                        categories = ['chemistry'];
                    }
                    this.set({categories: categories});
                    //set a default category if the course pack does not already have one
                    if (!this.get('category')) {
                        this.set({category: _.first(categories)});
                    }
                }, this)
            });
        },
        load: function (callback) {
            window.publisher.send({
                module: 'course',
                command: 'get_course_pack',
                args: {
                    id: this.get('id'),
                    password: this.get('password')
                },
                success: function (data, args) {
                    if (!args.password_accepted) {
                        this.trigger('invalid_password');
                    } else {
                        var serialized_tree_data = args.trees;
                        //deserialize each tree
                        _.each(serialized_tree_data, function (tree_data) {
                            //set up a new tree with the data that was passed from the server
                            var Tree = require('tree/models/Tree');
                            var tree = new Tree({sortable: true});
                            // REALLY not sure why we have to parse it twice
                            tree.deserialize(JSON.parse(JSON.parse(tree_data)));
                            // convert it into a sanitized, CourseItem suitable format
                            tree = this.sanitize_tree(tree);
                            // add it to the CourseItem
                            // the tree's id is the module id
                            var tree_module_id = tree.get('id');
                            if (
                                tree_module_id === 'unitree' &&
                                !require('Modules').get_module('unitree').get('active')
                            ) {
                                if (!_.isUndefined(callback)) {
                                    callback(
                                        'Cannot import unified content tree ' +
                                        'course packs into old courses.' +
                                        'Please contact support.'
                                    );
                                }
                                return;
                            }
                            this.add_tree(tree_module_id, tree);
                            //select everything - we do this after adding the tree to the CourseItem because select/unselect events
                            //are bound after the tree is added to the course items model
                            tree.nested_each(function (item) {
                                item.set({selected: true});
                            });
                        }, this);
                        //set course pack's trees list to be the course pack's trees
                        this.set({
                            title: args.title,
                            category: args.category,
                            password: args.password
                        });
                    }
                    if (!_.isUndefined(callback)) {
                        callback();
                    }
                }.bind(this)
            });
        },
        delete_pack: function (callback) {
            window.publisher.send({
                module: 'course',
                command: 'delete_course_pack',
                args: {id: this.id},
                success: function () {
                    if (callback) {
                        callback();
                    }
                }
            });
        },
        import_pack: function (callback) {
            var trees = this.get('trees').filter(function (tree) {
                    // omit any trees that are completely unselected
                    return tree.get('selected') !== false;
                }).map(function (tree) {
                    return tree.serialize_selected();
                });
            window.publisher.send({
                module: 'course',
                command: 'import_course_pack',
                args: {
                    trees: trees,
                    password: this.get('password'),
                    pack_id: this.id,
                    import_profiles: this.get('import_profiles')
                },
                success: function (data, args) {
                    if (callback) {
                        callback(data, args);
                    }
                }
            });
        },
        save: function (callback) {
            var trees = this.get('trees').filter(function (tree) {
                    // omit any trees that are completely unselected
                    return tree.get('selected') !== false;
                }).map(function (tree) {
                    return tree.serialize_selected();
                });
            window.publisher.send({
                module: 'course',
                command: 'save_course_pack',
                args: {
                    id: this.get('id'),
                    title: this.get('title'),
                    password: this.get('password'),
                    category: this.get('category'),
                    trees: trees
                },
                success: function (data, args) {
                    if (callback) {
                        callback(data, args);
                    }
                }
            });
        }
    });

    return CoursePack;
});
