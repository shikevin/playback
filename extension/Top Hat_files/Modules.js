/* global _, Backbone */
define([
    'modules/Adminface',
    'modules/Attendance',
    'modules/Course',
    'modules/Demo',
    'modules/Discussion',
    'modules/Feedback',
    'modules/Files',
    'modules/Gradebook',
    'modules/Gradebookv2',
    'modules/Invite',
    'modules/Pages',
    'modules/Publisher',
    'modules/Question',
    'modules/Tournament',
    'modules/Unitree'
], function (
    Adminface,
    Attendance,
    CourseModule,
    Demo,
    DiscussionModule,
    Feedback,
    Files,
    Gradebook,
    Gradebookv2Module,
    InviteModule,
    Pages,
    Publisher,
    Question,
    Tournament,
    Unitree
) {
    'use strict';
    var Modules = Backbone.Marionette.Controller.extend({
        _modules: {},

        /**
         * Module initialization function.
         *
         * This must be called manually (in main-* files) to satisfy circular
         * dependencies.
         */
        initialize_modules: function () {
            this._initialize_main_modules();
            this._initialize_non_mobile_modules();
            this._initialize_web_only_modules();
            this._initialize_superuser_modules();
            this._initialize_teacher_modules();

            this._modules.question.monitor_answered_items();
            this._modules.discussion.monitor_answered_items();
        },

        /**
         * Get a single module item by id.
         * @param  {String} module_item_id Module item id to retrieve.
         * @return {Object}                Module item.
         */
        get_module_item: function (module_item_id) {
            var modules = this._modules;
            var module_item;
            _.find(modules, function (module) {
                var match = module.items().findWhere({id: module_item_id});
                if (match) {
                    module_item = match;
                    return true;
                }
            });
            return module_item;
        },

        /**
         * Get all module items.
         * @return {Object} Hash map of module item id -> module item.
         */
        get_module_items: function () {
            var modules = this._modules;
            var module_items = {};
            _.each(modules, function (module) {
                module.items().forEach(function (module_item) {
                    module_items[module_item.get_id()] = module_item;
                });
            });
            return module_items;
        },

        /**
         * Get a single module.
         * @param  {String} module_id Module id to retrieve.
         * @return {Module}
         */
        get_module: function (module_id) {
            return this._modules[module_id];
        },

        /**
         * Get all modules.
         * @return {Object} Hash map of module id -> module.
         */
        get_modules: function () {
            return this._modules;
        },

        /**
         * Get a module if unitree is inactive, otherwise get unitree.
         * @param  {[type]} module_id - Module to get if unitree is not active.
         * @return {Module}
         */
        get_module_unitree: function (module_id) {
            var unitree = this.get_module('unitree');
            if (!_.isUndefined(unitree) && unitree.get('active')) {
                module_id = 'unitree';
            }
            return this._modules[module_id];
        },

        _initialize_main_modules: function () {
            this._modules.attendance = new Attendance();
            this._modules.course = new CourseModule();
            this._modules.demo = new Demo();
            this._modules.discussion = new DiscussionModule();
            this._modules.feedback = new Feedback();
            this._modules.files = new Files();
            this._modules.pages = new Pages();
            this._modules.publisher = new Publisher();
            this._modules.question = new Question();
            this._modules.tournament = new Tournament();
            this._modules.unitree = new Unitree();
        },

        _initialize_non_mobile_modules: function () {
            if (window.is_mobile && !window.is_presentation_tool) {
                return;
            }
            this._modules.gradebook = new Gradebook();
            this._modules.gradebook_beta = new Gradebookv2Module();
        },

        _initialize_web_only_modules: function () {
            if (window.is_mobile || window.is_presentation_tool) {
                return;
            }
        },

        _initialize_superuser_modules: function () {
            if (!window.user.get('is_superuser')) {
                return;
            }
            this._modules.adminface = new Adminface();
        },

        _initialize_teacher_modules: function () {
            if (!window.user.is_teacher()) {
                return;
            }
            this._modules.invite = new InviteModule();
        }
    });

    return new Modules();
});
