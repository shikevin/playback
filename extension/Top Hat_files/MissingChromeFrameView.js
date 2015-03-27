define([
    'text!templates/publisher/missing_chromeframe.html'
], function (html) {
    MissingChromeFrameView = Backbone.View.extend({
        className: 'missing_chromeframe',
        template: "",
        render: function () {
            this.$el.html($('#loading_template').html());
            this.$el.html(html);
        }
    });
    return MissingChromeFrameView;
});