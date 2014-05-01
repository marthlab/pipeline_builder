

function GlobalGraph(pipeline) {
    this.pipeline = pipeline;
    this.node_insertion_queue = [];
    this.edge_insertion_queue = [];

    this.task_nodes = _.map(this.pipeline.tasks, this.createTaskNode, this);
    this.inputs_dummy_node = this.createPipelineInputsNode();

    this.task_output_nodes =
        _.map(_.flatten(_.pluck(this.pipeline.getFinalizedTasks(), "outputs"),
                        true),
              this.createTaskOutputNode,
              this);

    this.pipeline_input_nodes =
        _.map(this.pipeline.inputs, this.createPipelineInputNode, this);

    this.dummy_to_input_edges =
        _.map(this.pipeline_input_nodes, this.createDummyToInputEdge, this);

    this.task_to_task_output_edges =
        _.map(this.task_output_nodes, this.createTaskToTaskOutputEdge, this);

    this.secondary_to_task_edges =
        _.flatten(_.map(this.task_nodes, this.createSecondaryToTaskEdges, this),
                  true);

    this.listenTo(this.pipeline, {
        "add:input": function(pl_input) {
            var new_pipeline_input_node =
                this.createPipelineInputNode(pl_input);
            this.pipeline_input_nodes.push(new_pipeline_input_node);

            var new_dummy_to_input_edge =
                this.createDummyToInputEdge(new_pipeline_input_node);
            this.dummy_to_input_edges.push(new_dummy_to_input_edge);

            this.trigger("change");
        }
    });

    _.each(this.pipeline.tasks, this.setupTaskListeners, this);
    _.each(this.pipeline.getNonfinalizedTasks(),
           this.setupNonfinalizedTaskListeners, this);

    this.listenTo(this.pipeline, {
        "add:task": function(task) {
            var new_task_node = this.createTaskNode(task);
            this.task_nodes.push(new_task_node);

            this.setupTaskListeners(task);

            if(task.isFinalized()) {
                this.handleFinalizedTask(task);
            } else {
                this.setupNonfinalizedTaskListeners(task);
            }

            var new_secondary_to_task_edges =
                this.createSecondaryToTaskEdges(new_task_node);
            _.pushArray(this.secondary_to_task_edges,
                        new_secondary_to_task_edges);

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
        return _.union(this.dummy_to_input_edges,
                       this.task_to_task_output_edges,
                       this.secondary_to_task_edges);
    },

    handleFinalizedTask: function(task) {
        var new_task_output_nodes =
            _.map(task.outputs, this.createTaskOutputNode, this);
        _.pushArray(this.task_output_nodes,
                    new_task_output_nodes);

        var new_task_to_task_output_edges =
            _.map(new_task_output_nodes, this.createTaskToTaskOutputEdge, this);
        _.pushArray(this.task_to_task_output_edges,
                    new_task_to_task_output_edges);
    },

    setupTaskListeners: function(task) {
        this.listenTo(task, {
            "change:id": function(task) {
                var task_node = _.findExact(this.task_nodes, {task: task});
                task_node.render();
                this.trigger("change");
            }
        });

        _.each(task.inputs, function(task_input) {
            this.listenTo(task_input, {
                "add:source": function(task_input, source) {
                    var secondary_node =
                        _.findExact(this.getSecondaryNodes(), {datum: source});
                    var task_node =
                        _.findExact(this.task_nodes, {datum: task_input.task});

                    if(!_.findExact(this.secondary_to_task_edges,
                                    {source: secondary_node,
                                     target: task_node})) {
                        this.secondary_to_task_edges.push(
                            this.createSecondaryToTaskEdge(
                                secondary_node, task_node));
                    }

                    this.trigger("change");
                }
            });
        }, this);
    },

    setupNonfinalizedTaskListeners: function(task) {
        this.listenTo(task, {
            "finalize": function(task) {
                this.handleFinalizedTask(task);
                this.trigger("change");
            }
        });
    },

    createTaskNode: function(task) {
        return new GlobalTaskNodeView({graph: this, datum: task});
    },

    createPipelineInputsNode: function() {
        return new GlobalPipelineInputsNodeView(
            {graph: this,
             datum: this.pipeline.inputs});
    },

    createTaskOutputNode: function(task_output){
        return new GlobalTaskOutputNodeView(
            {graph: this,
             datum: task_output});
    },

    createPipelineInputNode: function(pl_input) {
        return new GlobalPipelineInputNodeView(
            {graph: this,
             datum: pl_input});
    },

    createDummyToInputEdge: function(pl_input_node){
        return new GlobalEdgeView(
            {graph: this,
             source: this.inputs_dummy_node,
             target: pl_input_node});
    },

    createTaskToTaskOutputEdge: function(task_output_node){
        return new GlobalEdgeView(
            {graph: this,
             source: _.findExact(this.task_nodes,
                                 {task: task_output_node.task_output.task}),
             target: task_output_node});
    },

    createSecondaryToTaskEdge: function(secondary_node, task_node) {
        return new GlobalEdgeView(
            {graph: this,
             source: secondary_node,
             target: task_node});
    },

    createSecondaryToTaskEdges: function(task_node){
        return this.getSecondaryNodes().filter(
            function(secondary_node) {
                return task_node.task.hasAsInputSource(
                    secondary_node.datum);}).map(
                        function(secondary_node){
                            return this.createSecondaryToTaskEdge(
                                secondary_node, task_node);},
                        this);
    }
});




var AbstractGlobalNodeView = Backbone.View.extend({
    constructor: function(options) {
        _.extend(this, options);
        Backbone.View.apply(this, arguments);
    },

    initialize: function(options) {
        this.render();
        this.setEventsForMode();
        this.graph.node_insertion_queue.push(this);
    },

    render: function() {
        this.$el.html(this.getLabel());
    },

    applyLayout: function() {
        var d = this.dagre;
        this.$el.css(
            "transform",
            'translate('+ (d.x-d.width/2) +'px,'+ (d.y-d.height/2) +'px)');
    },

    cacheNodeDimensions: function() {
        _.extend(this,
                 {width: this.$el.outerWidth(),
                  height: this.$el.outerHeight()});
    },

    setEventsForMode: function(options) {
        this.undelegateEvents();
        this.events = this.constructor.mode_events[app.global_view.mode];
        this.delegateEvents();
    }
});


var GlobalPrimaryNodeView = AbstractGlobalNodeView.extend({
    className: 'node primary'
});


GlobalPrimaryNodeView.mode_events = {
    TASK_SELECTION: {
        'click': function() { app.focusOn(this.datum); }
    },
    DATUM_SELECTION: {}
};


var GlobalPipelineInputsNodeView = GlobalPrimaryNodeView.extend({
    constructor: function(options) {
        this.pipeline_inputs = options.datum;
        GlobalPrimaryNodeView.apply(this, arguments);
    },

    getLabel: function() {
        return "Pipeline Inputs";
    }
});


var GlobalTaskNodeView = GlobalPrimaryNodeView.extend({
    constructor: function(options) {
        this.task = options.datum;
        GlobalPrimaryNodeView.apply(this, arguments);
    },

    getLabel: function() {
        return this.task.id;
    }
});


var GlobalSecondaryNodeView = AbstractGlobalNodeView.extend({
    className: 'node secondary',
    setEventsForMode: function(options) {
        AbstractGlobalNodeView.prototype.setEventsForMode.call(this);
        this.$el.toggleClass(
            'selectable',
            _.contains(app.global_view.selectable_data, this.datum));
    }
});

GlobalSecondaryNodeView.mode_events = {
    TASK_SELECTION: {},
    DATUM_SELECTION: {
        'click': function() {
            if(_.contains(app.global_view.selectable_data, this.datum)) {
                app.global_view.on_datum_selected(this.datum);
            }
        }
    }
};


var GlobalTaskOutputNodeView = GlobalSecondaryNodeView.extend({
    constructor: function(options) {
        this.task_output = options.datum;
        GlobalSecondaryNodeView.apply(this, arguments);
    },

    getLabel: function() {
        return this.task_output.tool_output.id;
    }
});


var GlobalPipelineInputNodeView = GlobalSecondaryNodeView.extend({
    constructor: function(options) {
        this.pipeline_input = options.datum;
        GlobalSecondaryNodeView.apply(this, arguments);
    },

    getLabel: function() {
        return this.pipeline_input.id;
    }
});


var GlobalEdgeView = Backbone.View.extend({
    className: 'edge',
    initialize: function(options) {
        this.graph = options.graph;
        this.source = options.source;
        this.target = options.target;
        this.connections = [];
        this.graph.edge_insertion_queue.push(this);
    },

    remove: function() {
        _.each(this.connections, function(connection) {
            app.global_view.jsPlumb.detach(connection);
        });
        return Backbone.View.prototype.remove.call(this);
    },

    draw: function() {
        _.each(this.connections, function(connection) {
            app.global_view.jsPlumb.detach(connection);
        });
        if(this.dagre.points.length === 2) {
            var dummy_nodes =
                _.map(this.dagre.points,
                      function(point) {
                          return $('<div class="dummy_node"></div>')
                              .appendTo(this.el)
                              .css("transform",
                                   'translate(' + (point.x) +
                                   'px,' + (point.y) +
                                   'px)')[0];
                      },
                      this);

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
        anchors:[["Continuous", {faces:["right"]}],
                 ["Continuous", {faces:["left"]}]],
        paintStyle:{
            lineWidth:2,
            strokeStyle:"#a7b04b"
        },
        endpoint:"Blank"
    },

    _bezierConnection: function(source_el, target_el) {
        return app.global_view.jsPlumb.connect({
            source: source_el,
            target: target_el,
            connector: ["RightBezier", {curviness: 12 }],
            container: this.$el
        }, this._connectionOptions);
    },

    _straightConnection: function(source_el, target_el) {
        return app.global_view.jsPlumb.connect({
            source: source_el,
            target: target_el,
            connector: ["Straight"],
            container: this.$el
        }, this._connectionOptions);
    }
});