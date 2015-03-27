/*global require*/
require.config({
    baseUrl: window.site_data.settings.MEDIA_URL + 'js/src/',
    paths: {
        domReady: '../libraries/domReady',
        text: '../libraries/text',
        docviewer: '../libraries/docviewer',
        'bootstrap-dropdown': '../../bower_components/sass-bootstrap/js/dropdown',
        'bootstrap-button': '../../bower_components/sass-bootstrap/js/button',
        'bootstrap-modal': '../../bower_components/sass-bootstrap/js/modal',
        'bootstrap-tooltip': '../../bower_components/sass-bootstrap/js/tooltip',
        'bootstrap-popover': '../../bower_components/sass-bootstrap/js/popover',
        underscore: '../libraries/underscore',
        'backbone.cocktail': '../../bower_components/cocktail/Cocktail',
        'jquery.qtip': '../lobby/libraries/jquery.qtip',
        'jquery.validate': '../libraries/jquery.validate.v1.13.1',
        'jquery.serializeJSON': '../../bower_components/jquery.serializeJSON/jquery.serializeJSON',
        moment: '../libraries/moment',
        mathjax: '../src/util/mathjax',
        diff_match_patch: '../libraries/diff_match_patch',
        HoudiniResource: '../HoudiniResource',
        dragCheckbox: '../libraries/dragCheckbox',
        composer: '../edumacation/composer/composer',
        'composer.validation': '../edumacation/composer/composer.validation',
        'composer.widgets': '../edumacation/composer/composer.widgets',
        'composer.widgets.custom': '../edumacation/composer/composer.widgets.custom'
    },
    shim: {
        'composer.widgets': ['composer.validation', 'models/UnknownLengthTask', 'views/UnknownLengthTask'],
        'composer.widgets.custom': ['composer.widgets'],
        'composer.validation': ['composer'],

        underscore: {
            exports: '_'
        },
        'bootstrap-popover': {
            deps: ['bootstrap-tooltip']
        },
        'backbone.cocktail': {
            deps: ['underscore'],
            exports: 'Cocktail'
        },
        HoudiniResource: {
            exports: 'HoudiniResource'
        }
    }
});

require([
    'util/daedalus',
    'Houdini',
    'panels/Panels',
    'views/lms/LMS',
    'lobby/Lobby',
    'Modules',
    'util/accessibility',

    '../libraries/domReady!',
    'models/lobby_user',
    'models/Org',
    '../../bower_components/sass-bootstrap/js/transition',
    'jquery.qtip',
    'composer.widgets.custom',
    'models/UnknownLengthTask',
    'views/UnknownLengthTask'
], function (
    Daedalus,
    Houdini,
    Panels,
    LMSView, // TODO - AH - Drop this
    Lobby,
    Modules,
    Accessibility
) {
    'use strict';
    window.Houdini = new Houdini(window.site_data.settings.API_SERVER);
    Modules.initialize_modules();
    $(document).ready(function () {
        Lobby.initialize();
        $.fn.qtip.zindex = 1000;
        window.tLMSView = LMSView;
        window.panels = new Panels();
        window.gradebook_panels = new Panels();
        window.students_panels = new Panels();
        Lobby.load_lobby();
        Accessibility.remove_mousedown_focus_outline();
    });
});
