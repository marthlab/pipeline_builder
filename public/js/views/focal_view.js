var FocalView = Backbone.View.extend({
  template: _.template($('#focal-view-template').html()),
  initialize: function(options) {

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
  focusOn: function(datum) {
    if(datum instanceof Task) {
      this.graph = new FocalTaskGraph(datum);
    } else if(datum === app.pipeline.inputs) {
      this.graph = new FocalInputsGraph(app.pipeline);
    }

    this.node_views = _.union(
      _.map(this.graph.task_input_src_nodes, function(node){
        return new FocalTaskInputSrcNodeView({focal_view: this, node: node});
      }, this),
      _.map(this.graph.task_input_potential_src_nodes, function(node){
        return new FocalTaskInputPotentialSrcNodeView({focal_view: this, node: node});
      }, this),
      _.map(this.graph.task_input_nodes, function(node){
        return new FocalTaskInputNodeView({focal_view: this, node: node});
      }, this),
      _.map(this.graph.task_node ? [this.graph.task_node] : [], function(node){
        return new FocalTaskNodeView({focal_view: this, node: node});
      }, this),
      _.map(this.graph.outbound_datum_nodes, function(node){
        return new FocalOutboundDatumNodeView({focal_view: this, node: node});
      }, this),
      _.map(this.graph.dest_nodes, function(node){
        return new FocalDestNodeView({focal_view: this, node: node});
      }, this),
      _.map(this.graph.potential_dest_group_nodes, function(node){
        return new FocalPotentialDestGroupNodeView({focal_view: this, node: node});
      }, this),
      _.map(this.graph.potential_dest_nodes, function(node){
        return new FocalPotentialDestNodeView({focal_view: this, node: node});
      }, this)
    );
    
    this.edge_views = _.union(
      _.map(this.graph.task_input_potential_src_to_task_input_edges, function(edge){
        return new FocalTaskInputPotentialSrcToTaskInputEdgeView({focal_view: this, edge: edge});
      }, this),
      _.map(this.graph.task_input_source_to_task_input_edges, function(edge){
        return new FocalTaskInputSourceToTaskInputEdgeView({focal_view: this, edge: edge});
      }, this),
      _.map(this.graph.task_input_to_task_edges, function(edge){
        return new FocalTaskInputToTaskEdgeView({focal_view: this, edge: edge});
      }, this),
      _.map(this.graph.task_to_outbound_datum_edges, function(edge){
        return new FocalTaskToOutboundDatumEdgeView({focal_view: this, edge: edge});
      }, this),
      _.map(this.graph.outbound_datum_to_dest_edges, function(edge){
        return new FocalOutboundDatumToDestEdgeView({focal_view: this, edge: edge});
      }, this),
      _.map(this.graph.outbound_datum_to_potential_dest_group_edges, function(edge){
        return new FocalOutboundDatumToPotentialDestGroupEdgeView({focal_view: this, edge: edge});
      }, this),
      _.map(this.graph.potential_dest_group_to_potential_dest_edges, function(edge){
        return new FocalPotentialDestGroupToPotentialDestEdgeView({focal_view: this, edge: edge});
      }, this)
    )

    this.render();
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

var AbstractFocalNodeView = Backbone.View.extend({
  initialize: function(options) {
    this.focal_view = options.focal_view;
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

var FocalTaskInputSrcNodeView = AbstractFocalNodeView.extend({
  className: 'node task_input_src',
});

var FocalTaskInputPotentialSrcNodeView = AbstractFocalNodeView.extend({
  className: 'node task_input_potential_src',
});

var FocalTaskInputNodeView = AbstractFocalNodeView.extend({
  className: 'node task_input',
});

var FocalTaskNodeView = AbstractFocalNodeView.extend({
  className: 'node task',
});

var FocalOutboundDatumNodeView = AbstractFocalNodeView.extend({
  className: 'node outbound_datum',
});

var FocalDestNodeView = AbstractFocalNodeView.extend({
  className: 'node dest',
});

var FocalPotentialDestGroupNodeView = AbstractFocalNodeView.extend({
  className: 'node potential_dest_group',
});

var FocalPotentialDestNodeView = AbstractFocalNodeView.extend({
  className: 'node potential_dest',
});

var AbstractFocalEdgeView = Backbone.View.extend({
  className: 'edge test',
  initialize: function(options) {
    this.focal_view = options.focal_view;
    this.edge = options.edge;
        console.log(this.edge)
    this.source_el = this.focal_view.getNodeElem(this.edge.source);
    this.target_el = this.focal_view.getNodeElem(this.edge.target);
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
    container: this.$el,
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

var FocalTaskInputPotentialSrcToTaskInputEdgeView = AbstractFocalEdgeView.extend({
  className: 'edge potential_src_to_task_input',
});

var FocalTaskInputSourceToTaskInputEdgeView = AbstractFocalEdgeView.extend({
  className: 'edge task_input_src_to_task_input',
});

var FocalTaskInputToTaskEdgeView = AbstractFocalEdgeView.extend({
  className: 'edge task_input_to_task',
});

var FocalTaskToOutboundDatumEdgeView = AbstractFocalEdgeView.extend({
  className: 'edge task_to_outbound_datum',
});

var FocalOutboundDatumToDestEdgeView = AbstractFocalEdgeView.extend({
  className: 'edge outbound_datum_to_dest',
});

var FocalOutboundDatumToPotentialDestGroupEdgeView = AbstractFocalEdgeView.extend({
  className: 'edge outbound_datum_to_potential_dest_group',
});

var FocalPotentialDestGroupToPotentialDestEdgeView = AbstractFocalEdgeView.extend({
  className: 'edge potential_dest_group_to_potential_dest',
});
