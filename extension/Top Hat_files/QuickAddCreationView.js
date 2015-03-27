define([
    'text!templates/quickadd/picker.html',
    'models/UserSettings'
], function (
    html,
    UserSettings
) {
    var QuickAddCreationView = Backbone.View.extend({
        tagName: "div",
        id: "content",
        events: {
            "click #mc_num_choices span": "mc_option_text_clicked",
            "click #mc_num_choices button": "change_mc_option_count",
            "click #quickadd_screenshot": "toggle_screenshot",
            "click a[question_type]": "create"
        },
        initialize: function() {
            //TODO: that.render to ,this.render );
            var that = this;
            this.model.bind("change:loading", function() { that.render(); });
            this.model.bind("change:mc_option_count", function() { that.render(); });
            this.model.bind("change:save_screenshot", function() { that.render(); });

            this.render();
        },
        render: function() {
            // HACK
            // Gently slap kent in the face for this one.
            var question_title = $("#qa_q_name").val();
            var data = {
                "loading": this.model.get("loading"),
                "mc_option_count": this.model.get("mc_option_count"),
                "save_screenshot": this.model.get("save_screenshot")
            }
            $(this.el).html(_.template(html)(data));
            // see above
            $("#qa_q_name").val(question_title);
        },
        // we want to prevent the click event from propogating when the mc option text is clicked
        // so that the 'create mc' button underneath is not triggered
        mc_option_text_clicked: function(e) {
            e.stopPropogation();
        },
        change_mc_option_count: function(e) {
            e.stopPropagation();

            var count = parseInt( this.model.get("mc_option_count") , 10);
            count += ($(e.target).text() == "-") ? -1 : 1;
            if( count < 1 ) { count = 1; }

            this.model.set({"mc_option_count": count});
        },
        toggle_screenshot: function(e) {
            var is_checked = this.$("#quickadd_screenshot").is(":checked");
            this.model.set({"save_screenshot": is_checked});
        },
        create: function(e) {
            e.preventDefault();
            var type = $(e.target).attr("question_type");
            var question_title = $("#qa_q_name").val();
            this.model.set({"question_title": question_title});

            // Save quickadd settings
            UserSettings.set({
                "quickadd_mc_option_count" : this.model.get("mc_option_count"),
                "quickadd_save_screenshot" : this.model.get("save_screenshot")
            });
            Daedalus.track("asked quick add question");
            Daedalus.increment("numQuickAddQuestions");
            this.model.create(type);
        }
    });
    return QuickAddCreationView;
});