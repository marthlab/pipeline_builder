var GlobalView = Backbone.View.extend({
  template: _.template($('#global-view-template').html()),
  initialize: function(options) {
    this.graph = new GlobalGraph(app.pipeline);

    this.node_views = _.union(
      _.map(this.graph.primary_nodes, function(primary_node){
        return new GlobalPrimaryNodeView({global_view: this, node: primary_node});
      }, this),
      _.map(this.graph.secondary_nodes, function(secondary_node){
        return new GlobalSecondaryNodeView({global_view: this, node: secondary_node});
      }, this)
    );

    this.edge_views = _.map(this.graph.edges, function(edge){
      return new GlobalEdgeView({global_view: this, edge: edge});
    }, this);

    this.render();
  },
  render: function() {
    this.$el.html(this.template());
    this.$resizer_el = this.$el.children('.resizer');
    this.$graph_subviews_el = this.$resizer_el.children('.graph_subviews');

    this.$graph_subviews_el.append(_.pluck(this.node_views, 'el'));
    this.$graph_subviews_el.append(_.pluck(this.edge_views, 'el'));

    _.methodEach(this.node_views, 'setNodeDimensions');

    dagre.layout()
      .nodeSep(25)
      .edgeSep(20)
      .rankSep(30)
      .rankDir("LR")
      .nodes(this.graph.nodes)
      .edges(this.graph.edges)
      .debugLevel(0)
      .run();

    _.methodEach(this.node_views, 'applyLayout');
    _.methodEach(this.edge_views, 'applyLayout');
    
    this.resizeContents();

  },
  resizeContents: function() {
    var graph_bbox = $(_.pluck(this.node_views, 'el')).bounds();
    var el_bbox = {width: this.$el.width(), height: this.$el.height()};
    var scale = Math.min(el_bbox.width/graph_bbox.width, el_bbox.height/graph_bbox.height);
    var translate_x = Math.round((el_bbox.width-graph_bbox.width)/2);
    var translate_y = Math.round((el_bbox.height-graph_bbox.height)/2);
    this.$resizer_el.css({"transform": "scale("+scale+","+scale+") translate("+translate_x+"px,"+translate_y+"px)"});
  },
  getNodeElem: function(node) {
    return _.find(this.node_views, {'node': node}).el;
  }
});

var AbstractGlobalNodeView = Backbone.View.extend({
  initialize: function(options) {
    this.global_view = options.global_view;
    this.node = options.node;

    this.render();
  },
  render: function() {
    this.$el.html(this.node.label);
  },
  applyLayout: function() {
    var d = this.node.dagre;
    this.$el.css("transform", 'translate('+ (d.x-d.width/2) +'px,'+ (d.y-d.height/2) +'px)');
  },
  setNodeDimensions: function() {
    _.extend(this.node, {width: this.$el.outerWidth(), height: this.$el.outerHeight()});
  }
});

var GlobalPrimaryNodeView = AbstractGlobalNodeView.extend({
  className: 'node primary',
  events: {
    'click': function() { app.focal_view.focusOn(this.node.datum); }
  }
});

var GlobalSecondaryNodeView = AbstractGlobalNodeView.extend({
  className: 'node secondary',
});

var GlobalEdgeView = Backbone.View.extend({
  className: 'edge',
  initialize: function(options) {
    this.global_view = options.global_view;
    this.edge = options.edge;
    this.source_el = this.global_view.getNodeElem(this.edge.source);
    this.target_el = this.global_view.getNodeElem(this.edge.target);
    this.connections = [];
    this.render();
  },
  render: function() {
    
  },
  applyLayout: function() {
    if(this.edge.dagre.points.length === 2) {
      var dummy_nodes = _.map(this.edge.dagre.points, function(point) {
        return $('<div class="dummy_node"></div>')
          .appendTo(this.el)
          .css("transform", 'translate('+ (point.x) +'px,'+ (point.y) +'px)')[0];
      }, this);

      this.connections = [
        this._bezierConnection(this.source_el, dummy_nodes[0]),
        this._straightConnection(dummy_nodes[0], dummy_nodes[1]),
        this._bezierConnection(dummy_nodes[1], this.target_el)
      ];
    } else {
      this.connections = [
        ($(this.source_el).center().y === $(this.target_el).center().y ? this._straightConnection : this._bezierConnection).call(this, this.source_el, this.target_el)
      ];
    }

  },
  _getCurviness: function(start_el, end_el) {
    var start_right_x = $(start_el).offset().left+$(start_el).outerWidth();
    var end_left_x = $(end_el).offset().left;
    return (end_left_x - start_right_x)*0.75;
  },
  _connectionOptions: {
    anchors:[["Continuous", { faces:["right"] } ], ["Continuous", { faces:["left"] } ]],
    paintStyle:{ 
      lineWidth:2,
      strokeStyle:"#a7b04b",
    },
    endpoint:"Blank"
  },
  _bezierConnection: function(source_el, target_el) {
    return jsPlumb.connect({
      source: source_el, 
      target: target_el,           
      connector: ["Bezier", {curviness: this._getCurviness(source_el, target_el) }],
      container: this.$el
    }, this._connectionOptions);
  },
  _straightConnection: function(source_el, target_el) {
    return jsPlumb.connect({
      source: source_el, 
      target: target_el,           
      connector: ["Straight"],
      container: this.$el
    }, this._connectionOptions);
  }
});
