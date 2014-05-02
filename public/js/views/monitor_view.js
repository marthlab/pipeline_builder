var MonitorView = Backbone.View.extend({
  template: _.template($('#MonitorView-template').html()),
  initialize: function(options) {
    this.$el.html(this.template());
  }
});


