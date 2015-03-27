define(['text!templates/invite/pt_invite.html'], function (html) {
    return Backbone.View.extend({
        template: _.template(html),
        render: function () { this.$el.html(this.template()); }
    });
});