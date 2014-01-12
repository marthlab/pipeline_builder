var GlobalView = Backbone.View.extend({
  template: _.template($('#GlobalView-template').html()),
  initialize: function(options) {
    this.$el.html(this.template());
    this.$resizer_el = this.$el.children('.resizer');
    this.$graph_subviews_el = this.$resizer_el.children('.graph_subviews');
  },
  draw: function() {
    _.each(this.graph.node_insertion_queue, function(node) { this.$graph_subviews_el.append(node.el); }, this);
    this.graph.node_insertion_queue = [];
    _.each(this.graph.edge_insertion_queue, function(edge) { this.$graph_subviews_el.append(edge.el); }, this);
    this.graph.edge_insertion_queue = [];

    var nodes = this.graph.getNodes();
    var edges = this.graph.getEdges();

    _.methodEach(nodes, 'cacheNodeDimensions');

    dagre.layout()
      .nodeSep(25)
      .edgeSep(20)
      .rankSep(30)
      .rankDir("LR")
      .nodes(nodes)
      .edges(edges)
      .debugLevel(0)
      .run();

    _.methodEach(nodes, 'applyLayout');
    _.methodEach(edges, 'draw');
    
    this.resizeContents();

  },
  showGraph: function(graph) {
    console.log("show graph");
    this.removeSubviews();
    this.graph = graph;
    this.listenTo(this.graph, 'change', this.draw);
    this.draw();
    this.setMode("TASK_SELECTION");
  },
  appendSubview: function(subview) {
    this.$graph_subviews_el.append(subview.el);
  },
  removeSubviews: function() {
    if(this.graph) {
      _.methodEach(this.graph.getEdges(), 'remove');
      _.methodEach(this.graph.getNodes(), 'remove');
    }
  },
  resizeContents: function() {
    var graph_bbox = $(_.pluck(this.graph.getNodes(), 'el')).bounds();
    var el_bbox = {width: this.$el.width(), height: this.$el.height()};
    this.scale = Math.min(Math.min(el_bbox.width/graph_bbox.width, el_bbox.height/graph_bbox.height), 1);
    this.translate_x = Math.round((el_bbox.width-graph_bbox.width)/2);
    this.translate_y = Math.round((el_bbox.height-graph_bbox.height)/2);
    this.$resizer_el.css({"transform": "scale("+this.scale+","+this.scale+") translate("+this.translate_x+"px,"+this.translate_y+"px)"});
  },
  setMode: function(mode, options) {
    this.mode = mode;

    if(this.mode === 'DATUM_SELECTION') {
      this.selectable_data = options.selectable_data;
      this.on_datum_selected = options.on_datum_selected;
    }

    this.$el.alterClass('mode-*', 'mode-'+this.mode); // remove all existing 'mode-...' classes and add for class for current mode

    _.methodEach(this.graph.getNodes(), 'onChangeMode');
  }
});
GlobalView.modes = {DATUM_SELECTION: {}, TASK_SELECTION: {}};
