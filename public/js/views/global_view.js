var GlobalView = Backbone.View.extend({
  initialize: function(options) {
    this.app = options.app;

    this.inner1_el = this.$el.children('.inner1')[0];
    this.$inner1_el = $(this.inner1_el);

    this.inner2_el = this.$inner1_el.children('.inner2')[0];
    this.$inner2_el = $(this.inner2_el);

    this.graph = new GlobalGraph(app.pipeline);
    this.primary_node_views = _.map(this.graph.primary_nodes, function(primary_node){
      return new GlobalPrimaryNodeView({node: primary_node});
    });
    this.secondary_node_views = _.map(this.graph.secondary_nodes, function(secondary_node){
      return new GlobalSecondaryNodeView({node: secondary_node});
    });
    this.node_views = _.union(this.primary_node_views, this.secondary_node_views);

    this.render();
  },
  render: function() {
    this.$inner2_el.append(_.pluck(this.primary_node_views, 'el'));
    this.$inner2_el.append(_.pluck(this.secondary_node_views, 'el'));

    _.each(this.node_views, function(node_view) {
      _.extend(node_view.node, {width: node_view.$el.outerWidth(), height: node_view.$el.outerHeight()});
    });

    dagre.layout()
      .nodeSep(25)
      .edgeSep(20)
      .rankSep(30)
      .rankDir("LR")
      .nodes(this.graph.nodes)
      .edges(this.graph.edges)
      .debugLevel(0)
      .run();

    _.each(this.node_views, function(node_view) {
      var dagre = node_view.node.dagre;
      //node_view.$el.css({top: dagre.y-dagre.height/2, left: dagre.x-dagre.width/2});
      node_view.$el.css("transform", 'translate('+ (dagre.x-dagre.width/2) +'px,'+ (dagre.y-dagre.height/2) +'px)');
    });

    
    var graph_bbox = $(_.pluck(this.node_views, 'el')).bounds();
    var el_bbox = {width: this.$el.width(), height: this.$el.height()};
    //var el_offset = this.$el.offset();
    //el_bbox.left = el_offset.left+(this.$el.outerWidth()-el_bbox.width)/2;
    //el_bbox.top = el_offset.top+(this.$el.outerHeight()-el_bbox.height)/2;

    var scale = Math.min(el_bbox.width/graph_bbox.width, el_bbox.height/graph_bbox.height);
    var translate_x = Math.round((el_bbox.width-graph_bbox.width)/2);
    var translate_y = Math.round((el_bbox.height-graph_bbox.height)/2);
    this.$inner1_el.css({"transform": "scale("+scale+","+scale+") translate("+translate_x+"px,"+translate_y+"px)"});
    
  }
});

var GlobalPrimaryNodeView = Backbone.View.extend({
  className: 'node primary_node',
  initialize: function(options) {
    this.node = options.node;

    this.render();
  },
  render: function() {
    this.$el.html(this.node.label);
  }
});

var GlobalSecondaryNodeView = Backbone.View.extend({
  className: 'node secondary_node',
  initialize: function(options) {
    this.node = options.node;

    this.render();
  },
  render: function() {
    this.$el.html(this.node.label);
  }
});

