/* global _, Backbone, Daedalus */
define([
    'text!templates/invite/saved_error_view.html',
    'text!templates/invite/saved_error_save.html',
    'text!templates/invite/saved_error_duplicate.html',
    'text!templates/invite/saved_error_error.html',
    'text!templates/invite/saved.html',
    'text!templates/invite/saved_error_fixed.html',
    'models/LongTask',
    'views/LongTask'
], function (
    view_html,
    save_html,
    duplicate_html,
    another_error_html,
    result_html,
    success_html,
    LongTask,
    LongTaskView
) {
    'use strict';
    var EmailErrorView, SavedView, ErrorCollectionView;
    EmailErrorView = Backbone.StatefulView.extend({
        className: 'invalid_email',
        templates: {
            display: _.template(view_html),
            save: _.template(save_html),
            duplicate: _.template(duplicate_html),
            another_error: _.template(another_error_html),
            success: _.template(success_html)
        },
        states: {
            init: {},
            display: {enter: ['render']},
            save: {enter: ['save', 'render']},
            duplicate: {enter: ['render']},
            another_error: {enter: ['render']},
            deleting: {enter: ['deleting']},
            success: {enter: ['render']}
        },
        transitions: {
            init: {
                display: 'display'
            },
            display: {
                save: 'save',
                'click .edit': 'save',
                'click .delete': 'deleting',
                deleting: 'deleting'
            },
            success: {},
            save: {
                success: 'success',
                duplicate: 'duplicate',
                error: 'another_error'
            },
            duplicate: {
                edit_mode: 'display',
                deleting: 'deleting',
                'click .delete': 'deleting',
                'click .edit': 'display'
            },
            another_error: {
                deleting: 'deleting',
                edit_mode: 'display',
                'click .edit': 'display',
                'click .delete': 'deleting'
            }
        },
        render: function () {
            if (this.currentState === 'init') {
                this.trigger('display');
                return;
            }
            var template = this.templates[this.currentState],
                rendered = template(this.model.toJSON());
            this.$el.html(rendered);
            this.delegateEvents();
        },
        save: function () {
            var new_email, saving;
            new_email = this.$('input').val(); // because really,there is only one input
            this.model.set('email', new_email);
            saving = this.model.save();
            saving.done(function () {
                if (!this.model.get('invalid')) {
                    Daedalus.increment('numStudentsInvited', 1);
                    this.trigger('success');
                } else {
                    this.trigger('error');
                }
            }.bind(this));

            saving.fail(function (req) {
                try {
                    var resp_obj = JSON.parse(req.responseText);
                    if (resp_obj.duplicate_email) {
                        this.trigger('duplicate');
                    } else {
                        this.trigger('error');
                    }
                } catch (e) {
                    this.trigger('error');
                }
            }.bind(this));
        },
        deleting: function () {
            this.trigger('deleting');
            this.model.destroy();
        }
    });


    ErrorCollectionView = Backbone.Marionette.CollectionView.extend({
        itemView: EmailErrorView
    });


    SavedView = Backbone.View.extend({
        // Expects saved and errored attributes
        className: 'inviting_results',
        template: _.template(result_html),
        events: {
            'click .continue': 'next',
            'click .cancel': 'cancel'
        },
        collectionEvents: {
            'deleting': 'increment_deleted'
        },
        initialize: function (options) {
            this.options = options || {};
        },
        re_init: function () {
           this.options.long_task_model = new LongTask({
                id: this.options.bulk.get('id')
            });
            this.fixed = 0;
            this.deleted = 0;
            this.listenTo(this.options.successful, 'change add remove', this.patch_numbers, this);
            this.listenTo(this.options.accepted, 'change add remove', this.patch_numbers, this);
            this.listenTo(this.options.errored, 'change add remove', this.patch_numbers, this);
            this.listenTo(this.options.errored, 'change', this.modelchanged, this);

            this.listenTo(this.options.long_task_model, 'change:complete', this.done, this);


        },
        done: function () {
            if (this.options.long_task_model.get('complete') === 1) {

                var fetching = this.options.bulk.fetch();
                fetching.done(function () {
                    this.options.duplicate_count = this.options.bulk.get('duplicate_count');
                    var models = this.options.bulk.get('result_list');
                    this.options.errored.reset(_.filter(models, function (el) {
                        return el.invalid;
                    }));
                    this.options.accepted.reset(_.filter(models, function (el) {
                        return el.accepted;
                    }));
                    this.options.successful.reset(_.filter(models, function (el) {
                        return !el.invalid && !el.accepted;
                    }));
                    this.patch_numbers();
                }.bind(this));

            }
        },
        remove: function () {
            if (this.error_view) {
                this.error_view.remove();
            }
            Backbone.View.prototype.remove.apply(this, arguments);
        },
        increment_deleted: function () {
            this.deleted += 1;
        },
        patch_numbers: function () {
            var done = this.options.long_task_model.get('complete') === 1;
            // I admit, this is not the best way to do dynamic templates

            this.$('.relevant__incomplete').toggle(!done);
            this.$('.relevant__complete').toggle(done);

            this.$('.count__saved').html(this.options.successful.length);
            this.$('.count__accepted').html(this.options.accepted.length);
            this.$('.count__errored').html(this.options.errored.length);
            this.$('.count__duplicates').html(this.options.duplicate_count);

            this.$('.relevant__duplicates').toggle(done && this.options.duplicate_count !== 0);
            this.$('.relevant__accepted').toggle(done && this.options.accepted.length !== 0);
            this.$('.irrelevant__no_success').toggle(done && this.options.successful.length !== 0);
            this.$('.relevant__no_success').toggle(done && this.options.successful.length === 0);
            this.$('.relevant__some_success').toggle(
                done &&
                this.options.successful.length !== 0 &&
                this.options.errored.length !== 0
            );
            this.$('.relevant__all_success').toggle(
                done &&
                this.options.errored.length === 0
            );
            this.$('.relevant__all_errors').toggle(
                done &&
                this.options.successful.length === 0 &&
                this.options.errored.length !== 0
            );
        },
        render: function () {
            var ltv = new LongTaskView({
                model: this.options.long_task_model
            });
            ltv.render();
            this.error_view = new ErrorCollectionView({
                collection: this.options.errored
            });
            this.error_view.render();
            this.listenTo(this.error_view, 'itemview:deleting', this.increment_deleted, this);
            this.$el.html(this.template());
            this.$('.error_list').append(this.error_view.$el);
            this.$('.save_progress').append(ltv.$el);
            this.patch_numbers();
        },
        modelchanged: function (changed_model) {
            if (changed_model.get('id') !== undefined && !changed_model.get('invalid')) {
                this.options.errored.remove(changed_model);
                this.options.successful.add(changed_model);
            }
        },
        cancel: function () {
            this.trigger('pending');
        },
        next: function () {
            this.trigger('email_preview');
        }
    });
    return SavedView;
});
