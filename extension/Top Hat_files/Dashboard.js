/*globals define,$*/
define([], function () {
    "use strict";
    return {
        event: function (name, properties, async) {
            name = name.replace(/ /g, '_');
            async = typeof async !== 'undefined' ? async : true;
            var data = {
                name: name,
                properties: properties
            };
            var ajax_obj = {
                url: '/api/v2/events/',
                type: 'POST',
                async: async,
                data: JSON.stringify(data)
            };
            if (!async) {
                ajax_obj['timeout'] = 2000;
            }
            return $.ajax(ajax_obj);
        }
    };
});
