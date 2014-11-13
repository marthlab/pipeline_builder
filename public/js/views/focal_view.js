var FocalView = Backbone.View.extend({
  template: _.template($('#FocalView-template').html()),
  events: {        
        'click .focal_trigger': 'toggle'
  },

  initialize: function(options) {
    this.$el.html(this.template());
    this.$resizer_el = this.$el.children('.resizer');
    this.$graph_subviews_el = this.$resizer_el.children('.graph_subviews');
    this.jsPlumb = jsPlumb.getInstance();
  },

  draw: function() {
    _.each(this.graph.node_insertion_queue,
           function(node) { this.$graph_subviews_el.append(node.el); },
           this);
    this.graph.node_insertion_queue = [];

    _.each(this.graph.edge_insertion_queue,
           function(edge) { this.$graph_subviews_el.append(edge.el); },
           this);
    this.graph.edge_insertion_queue = [];

    var nodes = this.graph.getNodes();
    var edges = this.graph.getEdges();

    _.methodEach(nodes, 'cacheNodeDimensions');

    dagre.layout()
      .nodeSep(15)
      .edgeSep(20)
      .rankSep(30)
      .rankDir("LR")
      .nodes(nodes)
      .edges(edges)
      .debugLevel(0)
      .run();

    _.methodEach(nodes, 'applyLayout');
    this.resizeContents();
    _.methodEach(edges, 'draw');

  },

  showGraph: function(graph) {
    this.removeSubviews();
    this.graph = graph;
    this.listenTo(this.graph, 'change', this.draw);
    this.draw();
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
    this.$resizer_el.css({"transform": "scale(1) translate(0px, 0px)"});
    var graph_bbox = $(_.pluck(this.graph.getNodes(), 'el')).bounds();
    var el_bbox = {width: this.$el.width(), height: this.$el.height()};

    this.scale = Math.min(Math.min(el_bbox.width/graph_bbox.width,
                                   el_bbox.height/graph_bbox.height),
                          1);
    // this.translate_x = Math.round((el_bbox.width-graph_bbox.width)/2);
    // this.translate_y = Math.round((el_bbox.height-graph_bbox.height)/2);

    // this.$resizer_el.css({"transform":
    //                       "scale(" + this.scale +"," +
    //                       this.scale + ") translate(" +
    //                       this.translate_x + "px," +
    //                       this.translate_y + "px)"});
    var graphW = graph_bbox.right-graph_bbox.left;
    var graphH = graph_bbox.bottom-graph_bbox.top;
    var resizeW = this.$resizer_el.width();
    var resizeH = this.$resizer_el.height();
    var leftPadding = resizeW/2 - graphW/2;
    var topPadding = resizeH/2 - graphH/2;

    this.$resizer_el.css('padding-left', leftPadding + 'px')
    this.$resizer_el.css('padding-top', topPadding + 'px')
    this.jsPlumb.setZoom(this.scale);
  },

  toggle: function() {    
    this.$resizer_el.css('transition', 'transform 1s');
    
    if (this.$el.children('.focal_trigger').html() == 'Hide') {
      this.$resizer_el.css('transform', 'translate(-' + this.$resizer_el.width() + 'px, 0px)');
      this.$el.parent().css('flex-grow', '1');
      this.$el.children('.focal_trigger').html('Show')
    } else {
      this.$resizer_el.css('transform', 'translate(0px, 0px)');
      this.$el.parent().css('flex-grow', '50');
      this.$el.children('.focal_trigger').html('Hide')
    }      
  },

  blockUI: function() {
    this.$el.block(
        {message: 'Select your input datum from the global graph (below).' });
  },

  unblockUI: function() {
    this.$el.unblock();
  }
});


