function GlobalGraph(pipeline) {
  this.pipeline = pipeline;
  this.node_insertion_queue = [];
  this.edge_insertion_queue = [];

  this.task_nodes = _.map(this.pipeline.getTasks(), createTaskNode, this);
  this.inputs_dummy_node = createPipelineInputsNode();
  this.task_output_nodes = _.map(_.flatten(_.pluck(this.pipeline.getFinalizedTasks(), "outputs"), true), this.createTaskOutputNode, this);
  this.pipeline_input_nodes = _.map(this.pipeline.inputs, this.createPipelineInputNode, this);

  this.dummy_to_input_edges = _.map(this.pipeline_input_nodes, this.createDummyToInputEdge, this);
  this.task_to_task_output_edges = _.map(this.task_output_nodes, this.createTaskToTaskOutputEdge, this);
  this.secondary_to_task_edges = _.flatten(_.map(this.task_nodes, this.createSecondaryToTaskEdges, this), true);

  this.listenTo(this.pipeline, {
    "add:input": function(pl_input) {
      var new_pipeline_input_node = this.createPipelineInputNode(pl_input);
      this.pipeline_input_nodes.push(new_pipeline_input_node);

      var new_dummy_to_input_edge = this.createDummyToInputEdge(new_pipeline_input_node);
      this.dummy_to_input_edges.push(new_dummy_to_input_edge);

      this.trigger("change");
    }
  });
  _.each(this.pipeline.getFinalizedTasks(), this.setupFinalizedTaskListeners, this);
  _.each(this.pipeline.getNonfinalizedTasks(), this.setupNonfinalizedTaskListeners, this);
  this.listenTo(this.pipeline, {
    "add:task": function(task) {
      var new_task_node = this.createTaskNode(task);
      this.task_nodes.push(new_task_node);

      if(task.isFinalized()) {
        this.handleFinalizedTask();
      } else {
        this.handleNonfinalizedTask();
      }

      var new_secondary_to_task_edges = this.createSecondaryToTaskEdges(new_task_node);
      _.pushArray(this.secondary_to_task_edges, new_secondary_to_task_edges);

      this.trigger("change");
    }
  });
  
}
_.extend(GlobalGraph.prototype, Backbone.Events, {
  getPrimaryNodes: function() {
    return _.union(this.task_nodes, [this.inputs_dummy_node]);
  },
  getSecondaryNodes: function() {
    return _.union(this.task_output_nodes, this.pipeline_input_nodes);
  },
  getNodes: function() {
    return _.union(this.getPrimaryNodes(), this.getSecondaryNodes() );
  },
  getEdges: function() {
    return _.union(this.dummy_to_input_edges, this.task_to_task_output_edges, this.secondary_to_task_edges);
  },
  handleFinalizedTask: function(task) {
    this.setupFinalizedTaskListeners(task);
    var new_task_output_nodes = _.map(task.outputs, this.createTaskOutputNode);
    _.pushArray(this.task_output_nodes, new_task_output_nodes);
    var new_task_to_task_output_edges = _.map(new_task_output_nodes, this.createTaskToTaskOutputEdge, this);
    _.pushArray(this.task_to_task_output_edges, new_task_to_task_output_edges);
  },
  handleNonfinalizedTask: function(task) {
    this.setupNonfinalizedTaskListeners(task);
  },
  setupNonfinalizedTaskListeners: function(task) {
    this.listenTo(task, {
      "finalize": function(task) {
        this.handleFinalizedTask();
        this.trigger("change");
      }
    });
  },
  setupFinalizedTaskListeners: function(task) {
    _.each(task.inputs, function(task_input) {
      this.listenTo(task_input, {
        "add:source": function(task_input, source) {
          var secondary_node = _.findExact(this.getSecondaryNodes(), {datum: source});
          var task_node = _.findExact(this.task_nodes, {datum: task_input.task});

          if(_.findExact(this.secondary_to_task_edges, {source: secondary_node, target: task_node})) {
            this.secondary_to_task_edges.push(this.createSecondaryToTaskEdge(secondary_node, task_node));
          }
          this.trigger("change");
        }
      });
    }, this);
  },
  createTaskNode: function(task) {
    return new GlobalTaskNode({graph: this, datum: task});
  },
  createPipelineInputsNode: function() {
    return new GlobalPipelineInputsNode({graph: this, datum: this.pipeline.inputs});
  },
  createTaskOutputNode: function(task_output){
    return new GlobalTaskOutputNode({graph: this, datum: task_output});
  },
  createPipelineInputNode: function(pl_input) {
    return new GlobalPipelineInputNode({graph: this, datum: pl_input});
  },
  createDummyToInputEdge: function(pl_input_node){
    return new GlobalEdge({
      graph: this,
      source: this.inputs_dummy_node,
      target: pl_input_node
    });
  },
  createTaskToTaskOutputEdge: function(task_output_node){
    return new GlobalEdge({
      graph: this, 
      source: _.findExact(this.finalized_task_nodes, {task: task_output_node.task_output.task}), 
      target: task_output_node
    });
  },
  createSecondaryToTaskEdge: function(task_node, secondary_node) {
    return new GlobalEdge({
      graph: this, 
      source: secondary_node,
      target: task_node
    });
  },
  createSecondaryToTaskEdges: function(task_node){
    return this.getSecondaryNodes()
            .filter(function(secondary_node){return task_node.task.hasAsInputSource(secondary_node.datum);})
            .map(_.partialRight(this.createSecondaryToTaskEdge, task_node), this);
  }
});

var AbstractGlobalNodeView = Backbone.View.extend({
  constructor: function(options) {
    _.extend(this, options);
    Backbone.View.prototype.constructor.call(this);
  },
  initialize: function(options) {
    this.render();
    this.graph.node_insertion_queue.push(this);
  },
  render: function() {
    this.$el.html(this.node.getLabel());
  },
  applyLayout: function() {
    var d = this.node.dagre;
    this.$el.css("transform", 'translate('+ (d.x-d.width/2) +'px,'+ (d.y-d.height/2) +'px)');
  },
  cacheNodeDimensions: function() {
    _.extend(this.node, {width: this.$el.outerWidth(), height: this.$el.outerHeight()});
  },
  onChangeMode: function(options) {
    this.undelegateEvents();
    this.events = this.constructor.mode_events[this.global_view.mode];
    this.delegateEvents();
  }
});

var GlobalPrimaryNodeView = AbstractGlobalNodeView.extend({
  className: 'node primary'
});
GlobalPrimaryNodeView.mode_events = {
  TASK_SELECTION: {
    'click': function() { app.focusOn(this.node.datum); }
  },
  DATUM_SELECTION: {}
};

var GlobalPipelineInputsNodeView = GlobalPrimaryNodeView.extend({
  constructor: function(options) {
    GlobalPrimaryNodeView.prototype.constructor.call(this);
    this.pipeline_inputs = this.datum;
  },
  getLabel: function() {
    return "Pipeline Inputs";
  }
});

var GlobalTaskNodeView = GlobalPrimaryNodeView.extend({
  constructor: function(options) {
    GlobalPrimaryNodeView.prototype.constructor.call(this);
    this.task_node = this.datum;
  },
  getLabel: function() {
    return this.task.tool.id;
  }
});

var GlobalSecondaryNodeView = AbstractGlobalNodeView.extend({
  className: 'node secondary',
  onChangeMode: function(options) {
    AbstractGlobalNodeView.prototype.onChangeMode.call(this);
    this.$el.toggleClass('selectable', _.contains(app.global_view.selectable_data, this.node.datum));
  }
});
GlobalSecondaryNodeView.mode_events = {
  TASK_SELECTION: {},
  DATUM_SELECTION: {
    'click': function() {
      if(_.contains(app.global_view.selectable_data, this.node.datum)) {
        app.global_view.on_datum_selected(this.node.datum);
      }
    }
  }
};

var GlobalTaskOutputNodeView = GlobalSecondaryNodeView.extend({
  constructor: function(options) {
    GlobalSecondaryNodeView.prototype.constructor.call(this);
    this.task_output = this.datum;
  },
  getLabel: function() {
    return this.task_output.tool_output.id;
  }
});

var GlobalPipelineInputView = GlobalSecondaryNodeView.extend({
  constructor: function(options) {
    GlobalSecondaryNodeView.prototype.constructor.call(this);
    this.pipeline_input = this.datum;
  },
  getLabel: function() {
    return this.pipeline_input.id;
  }
});

var GlobalEdgeView = Backbone.View.extend({
  className: 'edge',
  initialize: function(options) {
    this.graph = graph;
    this.source = options.source;
    this.target = options.target;
    this.connections = [];
    this.graph.edge_insertion_queue.push(this);
  },
  remove: function() {
    _.each(this.connections, function(connection{
      jsPlumb.detach(connection);
    }));
    return Backbone.View.prototype.remove.call(this);
  },
  draw: function() {
    _.each(this.connections, function(connection{
      jsPlumb.detach(connection);
    }));
    if(this.dagre.points.length === 2) {
      var dummy_nodes = _.map(this.dagre.points, function(point) {
        return $('<div class="dummy_node"></div>')
          .appendTo(this.el)
          .css("transform", 'translate('+ (point.x) +'px,'+ (point.y) +'px)')[0];
      }, this);

      this.connections = [
        this._bezierConnection(this.source.el, dummy_nodes[0]),
        this._straightConnection(dummy_nodes[0], dummy_nodes[1]),
        this._bezierConnection(dummy_nodes[1], this.target.el)
      ];
    } else {
      this.connections = [
        this._bezierConnection(this.source.el, this.target.el)
      ];
    }
  },
  _connectionOptions: {
    anchors:[["Continuous", { faces:["right"] } ], ["Continuous", { faces:["left"] } ]],
    paintStyle:{ 
      lineWidth:2,
      strokeStyle:"#a7b04b"
    },
    endpoint:"Blank"
  },
  _bezierConnection: function(source_el, target_el) {
    return jsPlumb.connect({
      source: source_el, 
      target: target_el,           
      connector: ["RightBezier", {curviness: 12 }],
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