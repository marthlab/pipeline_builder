var FocalView = Backbone.View.extend({
  template: _.template($('#FocalView-template').html()),
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
    return _.findExact(this.node_views, {'node': node}).el;
  }
});

var AbstractFocalNodeView = Backbone.View.extend({
  initialize: function(options) {
    this.focal_view = options.focal_view;
    this.node = options.node;

    this.render();
  },
  render: function() {
    this.$el.html(this.template(this));
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
  template: _.template($('#FocalTaskInputSrcNodeView-template').html()),
  className: 'node task_input_src',
});

var FocalTaskInputPotentialSrcNodeView = AbstractFocalNodeView.extend({
  template: _.template($('#FocalTaskInputSrcNodeView-template').html()),
  className: 'node task_input_potential_src',
});

var FocalTaskInputNodeView = AbstractFocalNodeView.extend({
  template: _.template($('#FocalTaskInputNodeView-template').html()),
  className: 'node task_input hint--bottom',
  attributes: function() { return {'data-hint': this.options.node.label}; }
});

var FocalTaskNodeView = AbstractFocalNodeView.extend({
  template: _.template($('#FocalTaskNodeView-template').html()),
  className: 'node task',
});

var FocalOutboundDatumNodeView = AbstractFocalNodeView.extend({
  template: _.template($('#FocalOutboundDatumNodeView-template').html()),
  className: 'node outbound_datum hint--bottom',
  attributes: function() { return {'data-hint': this.options.node.label}; }
});

var FocalDestNodeView = AbstractFocalNodeView.extend({
  template: _.template($('#FocalDestNodeView-template').html()),
  className: 'node dest',
});

var FocalPotentialDestGroupNodeView = AbstractFocalNodeView.extend({
  template: _.template($('#FocalPotentialDestGroupNodeView-template').html()),
  className: 'node potential_dest_group',
});

var FocalPotentialDestNodeView = AbstractFocalNodeView.extend({
  template: _.template($('#FocalPotentialDestNodeView-template').html()),
  className: 'node potential_dest',
});

var AbstractFocalEdgeView = Backbone.View.extend({
  className: 'edge test',
  initialize: function(options) {
    this.focal_view = options.focal_view;
    this.edge = options.edge;
    this.source_el = this.focal_view.getNodeElem(this.edge.source);
    this.target_el = this.focal_view.getNodeElem(this.edge.target);
    this.connection_options = {
      anchors:["Right", "Left"],
      paintStyle:{ 
        lineWidth:1,
        strokeStyle:"#a7b04b",
      },
      container: this.$el,
      endpoint:"Blank"
    };
  },
  applyLayout: function() {

    this.connection = this._bezierConnection(this.source_el, this.target_el);

  },
  _bezierConnection: function(source_el, target_el) {
    return jsPlumb.connect({
      source: source_el, 
      target: target_el,           
      connector: ["RightBezier", {curviness: 15, stub: 60}],
      container: this.$el
    }, this.connection_options);
  }
});

var FocalTaskInputPotentialSrcToTaskInputEdgeView = AbstractFocalEdgeView.extend({
  className: 'edge potential_src_to_task_input',
});

var FocalTaskInputSourceToTaskInputEdgeView = AbstractFocalEdgeView.extend({
  className: 'edge task_input_src_to_task_input',
  initialize: function(options) {
    AbstractFocalEdgeView.prototype.initialize.call(this, options);
    _.merge(this.connection_options, {
      overlays : [
        [ "PlainArrow", { location:0, direction:-1, width:4, length:8} ]
      ]
    });
  }
});

var FocalTaskInputToTaskEdgeView = AbstractFocalEdgeView.extend({
  className: 'edge task_input_to_task',
});

var FocalTaskToOutboundDatumEdgeView = AbstractFocalEdgeView.extend({
  className: 'edge task_to_outbound_datum',
});

var FocalOutboundDatumToDestEdgeView = AbstractFocalEdgeView.extend({
  className: 'edge outbound_datum_to_dest',
  initialize: function(options) {
    AbstractFocalEdgeView.prototype.initialize.call(this, options);
    _.merge(this.connection_options, {
      overlays : [
        [ "PlainArrow", { location:1, direction:1, width:4, length:8} ]
      ]
    });
  }
});
var FocalOutboundDatumToPotentialDestGroupEdgeView = AbstractFocalEdgeView.extend({
  className: 'edge outbound_datum_to_potential_dest_group',
  initialize: function(options) {
    AbstractFocalEdgeView.prototype.initialize.call(this, options);
    _.merge(this.connection_options, {
      paintStyle: {
        "stroke-dasharray": "2, 2"
      }
    });
  }
});

var FocalPotentialDestGroupToPotentialDestEdgeView = AbstractFocalEdgeView.extend({
  className: 'edge potential_dest_group_to_potential_dest',
  initialize: function(options) {
    AbstractFocalEdgeView.prototype.initialize.call(this, options);
    _.merge(this.connection_options, {
      paintStyle: {
        "stroke-dasharray": "2, 2"
      },
      overlays : [
        [ "PlainArrow", { location:1, direction:1, width:4, length:8} ]
      ]
    });
  }
});
