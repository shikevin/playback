define([
    'models/question/question'
], function (QuestionItem) {
    var TournamentResponse = Backbone.Model.extend({
        urlRoot: '/api/v1/tournament_response/',
        url: function () {
            return this.urlRoot + this.id + "/";
        },
        defaults: {
            id: undefined,
            user_id: undefined,
            alias: undefined,
            question_id: undefined,
            attempts: undefined,
            correct: undefined,
            time: undefined,
            score: undefined,
            round_number: undefined,
            opponent_response_id: undefined,
            opponent_alias: undefined,

            //tracks if a user may still submit an answer to this response
            //set to false when correct is true, when attempts >= max_attempts (montiored by response controller), or when round's
            //time runs out (monitored by round time method)
            answerable: true,

            //when the response is added to a collection, it attempts to find a matching TournamentResponse
            //with matching opponent_response_id; if it finds one, it sets it in this property
            opponent: undefined
        },
        toJSON: function() {
            return _.omit(this.attributes, 'opponent');
        },
        get_question_instance: function() {
            var instance = new QuestionItem({ "id": this.get("question_id"), "status": "active" });
            if (this.get('question_data')) {
                instance.set(this.get('question_data'));
            }
            return instance;
        }
    });
    return TournamentResponse;
});
