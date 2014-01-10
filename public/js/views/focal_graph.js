function AbstractFocalGraph(pipeline, subclass_init) {
  this.pipeline = pipeline;
  this.node_insertion_queue = [];
  this.edge_insertion_queue = [];

  subclass_init.call(this);

  this.dest_nodes = _.flatten(_.map(this.outbound_datum_nodes_with_format, this.createDestNodes, this), true);
  this.potential_dest_nodes = _.flatten(_.map(this.outbound_datum_nodes_with_format, this.createPotentialDestNodes, this), true);
  this.potential_dest_group_nodes = _.map(_.filter(this.outbound_datum_nodes_with_format, this.hasPotentialDestNode, this), this.createPotentialDestGroupNode, this);

  this.outbound_datum_to_dest_edges = _.map(this.dest_nodes, this.createOutboundDatumToDestEdge, this);
  this.outbound_datum_to_potential_dest_group_edges = _.map(this.potential_dest_group_nodes, this.createOutboundDatumToPotentialDestGroupEdge, this);
  this.potential_dest_group_to_potential_dest_edges = _.map(this.potential_dest_nodes, this.createPotentialDestGroupToPotentialDestEdge, this);

}
_.extend(AbstractFocalGraph.prototype, Backbone.Events, {
  getNodes: function() {
    return _.union(this.outbound_datum_nodes_with_format, this.outbound_datum_nodes_without_format, this.dest_nodes, this.potential_dest_nodes, this.potential_dest_group_nodes);
  },
  getEdges: function() {
    return _.union(this.outbound_datum_to_dest_edges, this.outbound_datum_to_potential_dest_group_edges, this.potential_dest_group_to_potential_dest_edges);
  },
  createDestNodes: function(od_node){
    var dest_tasks = _.methodFilter(this.pipeline.tasks, 'hasAsInputSource', od_node.outbound_datum);
    return _.map(dest_tasks, function(task){return new FocalDestNodeView({graph: this, outbound_datum: od_node.outbound_datum, dest: task})}, this);
  },
  createPotentialDestNodes: function(od_node){
    var potential_dest_tool_inputs = app.tool_library.getSuggestedToolInputsByFormat(od_node.outbound_datum.getFormat() );
    var potential_dest_packages = _.groupBy(potential_dest_tool_inputs, function(ti) {return ti.tool.package;});
    return _.map(potential_dest_packages, function(tool_inputs, package){return new FocalPotentialDestNodeView({graph: this, outbound_datum: od_node.outbound_datum, package: package, potential_dests: tool_inputs});}, this);
  },
  hasPotentialDestNode: function(od_node) {
    return _.some(this.potential_dest_nodes, {outbound_datum: od_node.outbound_datum});
  },
  createPotentialDestGroupNode: function(od_node) {
    return new FocalPotentialDestGroupNodeView({graph: this, outbound_datum: od_node.outbound_datum});
  },
  createOutboundDatumToDestEdge: function(dest_node){
    return new FocalOutboundDatumToDestEdgeView({
      graph: this,
      source: _.findExact(this.outbound_datum_nodes_with_format, {outbound_datum: dest_node.outbound_datum}),
      target: dest_node
    });
  },
  createOutboundDatumToPotentialDestGroupEdge: function(pot_dest_group_node){
    return new FocalOutboundDatumToPotentialDestGroupEdgeView({
      graph: this,
      source: _.findExact(this.outbound_datum_nodes_with_format, {outbound_datum: pot_dest_group_node.outbound_datum}),
      target: pot_dest_group_node
    });
  },
  createPotentialDestGroupToPotentialDestEdge: function(pot_dest_node){
    return new FocalPotentialDestGroupToPotentialDestEdgeView({
      graph: this,
      source: _.findExact(this.potential_dest_group_nodes, {outbound_datum: pot_dest_node.outbound_datum}),
      target: pot_dest_node
    });
  }
});

function FocalTaskGraph(task) {
  AbstractFocalGraph.call(this, task.pipeline, function(){
    this.task = task;

    var enabled_inputs = _.filter(this.task.inputs, 'enabled');

    this.task_node = this.createTaskNode(this.task);
    this.task_input_nodes = _.map(enabled_inputs, this.createTaskInputNode, this);
    this.task_input_src_nodes = _.flatten(_.map(enabled_inputs, this.createTaskInputSrcNodes, this));
    this.task_input_add_existing_src_nodes = _.flatten(_.map(_.methodFilter(enabled_inputs, 'hasPotentialSources'), this.createAddExistingSrcNode, this));
    this.task_input_add_new_src_nodes = _.flatten(_.map(_.methodReject(enabled_inputs, 'isSaturated'), this.createAddNewSrcNode, this));
    
    this.outbound_datum_nodes_with_format = _.map(_.methodFilter(this.task.outputs, 'isAssignedFormat'), this.createTaskOutputNode, this);
    this.outbound_datum_nodes_without_format = _.map(_.methodReject(this.task.outputs, 'isAssignedFormat'), this.createTaskOutputNode, this);

    this.available_format_nodes = _.flatten(_.map(this.outbound_datum_nodes_without_format, this.createAvailableFormatNodes, this), true);

    this.task_input_to_task_edges = _.map(this.task_input_nodes, this.createTaskInputToTaskEdge, this); 
    this.task_input_src_to_task_input_edges = _.map(this.task_input_src_nodes, this.createTaskInputSrcToTaskInputEdge, this);
    this.task_input_add_existing_src_to_task_input_edges = _.map(this.task_input_add_existing_src_nodes, this.createTaskInputAddExistingSrcToTaskInputEdge, this);
    this.task_input_add_new_src_to_task_input_edges = _.map(this.task_input_add_new_src_nodes, this.createTaskInputAddNewSrcToTaskInputEdge, this);
    this.task_to_task_output_edges = _.map(_.union(this.outbound_datum_nodes_with_format, this.outbound_datum_nodes_without_format), this.createTaskToTaskOutputEdge, this);
    this.outbound_datum_to_available_format_edges = _.map(this.available_format_nodes, this.createOutboundDatumToAvailableFormatEdge, this);

    this.listenTo(this.pipeline, {
      "add:input": function(pl_input) {
        _.each(_.filter(this.task.inputs, 'enabled'), function(ti) {
          if(_.isEqual(ti.getPotentialSources(), [pl_input])) {
            var new_add_existing_src_node = this.createAddExistingSrcNode(ti);
            this.task_input_add_existing_src_nodes.push(new_add_existing_src_node);
            this.task_input_add_existing_src_to_task_input_edges.push(this.createTaskInputAddExistingSrcToTaskInputEdge(new_add_existing_src_node));
          }
        }, this);

        this.trigger("change");
      }
    });
    _.each(this.task.inputs, function(task_input) {
      this.listenTo(task_input, {
        "enable": function(ti) {
          var new_task_input_node = this.createTaskInputNode(ti);
          this.task_input_nodes.push(new_task_input_node);
          this.task_input_to_task_edges.push(this.createTaskInputToTaskEdge(new_task_input_node));

          if(ti.hasPotentialSources()) {
            var new_add_existing_src_node = this.createAddExistingSrcNode(ti);
            this.task_input_add_existing_src_nodes.push(new_add_existing_src_node);
            this.task_input_add_existing_src_to_task_input_edges.push(this.createTaskInputAddExistingSrcToTaskInputEdge(new_add_existing_src_node));
          }

          var new_add_new_src_node = this.createAddNewSrcNode(ti);
          this.task_input_add_new_src_nodes.push(new_add_new_src_node);
          this.task_input_add_new_src_to_task_input_edges.push(this.createTaskInputAddNewSrcToTaskInputEdge(new_add_new_src_node));

          this.trigger("change");
        },
        "disable": function(ti) {
          var old_ti_node = _.find(this.task_input_nodes, function(ti_node) {return ti_node.task_input === ti;});
          this.task_input_nodes = _.without(this.task_input_nodes, old_ti_node);
          var ti_to_task_edge = _.find(this.task_input_to_task_edges, function(edge) {return edge.source === old_ti_node;});
          this.task_input_to_task_edges = _.without(this.task_input_to_task_edges, ti_to_task_edge);
          ti_to_task_edge.remove();
          

          var old_tiaes_node = _.find(this.task_input_add_existing_src_nodes, function(tiaes_node) {return tiaes_node.task_input === ti;});
          if(old_tiaes_node) {
            var tiaes_to_ti_edge = _.find(this.task_input_add_existing_src_to_task_input_edges, function(edge) {return edge.source === old_tiaes_node;});
            this.task_input_add_existing_src_to_task_input_edges = _.without(this.task_input_add_existing_src_to_task_input_edges, tiaes_to_ti_edge);
            tiaes_to_ti_edge.remove();

            this.task_input_add_existing_src_nodes = _.without(this.task_input_add_existing_src_nodes, old_tiaes_node);
            old_tiaes_node.remove();
          }

          var old_tians_node = _.find(this.task_input_add_new_src_nodes, function(tians_node) {return tians_node.task_input === ti;});
          if(old_tians_node) {
            var tians_to_ti_edge = _.find(this.task_input_add_new_src_to_task_input_edges, function(edge) {return edge.source === old_tians_node;});
            this.task_input_add_new_src_to_task_input_edges = _.without(this.task_input_add_new_src_to_task_input_edges, tians_to_ti_edge);
            tians_to_ti_edge.remove();

            this.task_input_add_new_src_nodes = _.without(this.task_input_add_new_src_nodes, old_tians_node);
            old_tians_node.remove();
          }

          var old_tis_nodes = _.filter(this.task_input_src_nodes, function(tis_node) {return tis_node.task_input === ti;});
          var tis_to_ti_edges = _.filter(this.task_input_src_to_task_input_edges, function(edge) {return edge.target === old_ti_node;});
          this.task_input_src_to_task_input_edges = _.difference(this.task_input_src_to_task_input_edges, tis_to_ti_edges);
          _.methodEach(tis_to_ti_edges, 'remove');

          this.task_input_src_nodes = _.difference(this.task_input_src_nodes, old_tis_nodes);
          _.methodEach(old_tis_nodes, 'remove')

          old_ti_node.remove();

          this.trigger("change");
        },
        "add:source": function(ti, source) {
          var new_task_input_src_node = this.createTaskInputSrcNode(ti, source);
          this.task_input_src_nodes.push(new_task_input_src_node);
          var tis_to_ti_edge = this.createTaskInputSrcToTaskInputEdge(new_task_input_src_node);
          this.task_input_src_to_task_input_edges.push(tis_to_ti_edge);

          if(!ti.hasPotentialSources() || ti.isSaturated()) {
            var old_tiaes_node = _.find(this.task_input_add_existing_src_nodes, function(tiaes_node) {return tiaes_node.task_input === ti;});
            if(old_tiaes_node) {
              var tiaes_to_ti_edge = _.find(this.task_input_add_existing_src_to_task_input_edges, function(edge) {return edge.source === old_tiaes_node;});
              this.task_input_add_existing_src_to_task_input_edges = _.without(this.task_input_add_existing_src_to_task_input_edges, tiaes_to_ti_edge);
              tiaes_to_ti_edge.remove();

              this.task_input_add_existing_src_nodes = _.without(this.task_input_add_existing_src_nodes, old_tiaes_node);
              old_tiaes_node.remove();
            }
          }

          if(ti.isSaturated()) {
            var old_tians_node = _.find(this.task_input_add_new_src_nodes, function(tians_node) {return tians_node.task_input === ti;});
            if(old_tians_node) {
              var tians_to_ti_edge = _.find(this.task_input_add_new_src_to_task_input_edges, function(edge) {return edge.source === old_tians_node;});
              this.task_input_add_new_src_to_task_input_edges = _.without(this.task_input_add_new_src_to_task_input_edges, tians_to_ti_edge);
              tians_to_ti_edge.remove();

              this.task_input_add_new_src_nodes = _.without(this.task_input_add_new_src_nodes, old_tians_node);
              old_tians_node.remove();
            }
          }

          this.trigger("change");
        }
      });
    }, this);
    _.each(this.task.outputs, function(task_output) {
      this.listenTo(task_output, {
        "set:format": function(to) {
          var to_node = _.find(this.outbound_datum_nodes_without_format, function(to_node) {return to_node.task_output === to;});

          var old_available_format_nodes =  _.filter(this.available_format_nodes, function(node) {return node.task_output === to;});
          this.available_format_nodes = _.difference(this.available_format_nodes, old_available_format_nodes);
          var od_to_af_edges = _.filter(this.outbound_datum_to_available_format_edges, function(edge) {return edge.source.task_output === to;});
          this.outbound_datum_to_available_format_edges = _.difference(this.outbound_datum_to_available_format_edges, od_to_af_edges);
          _.methodEach(od_to_af_edges, 'remove');
          _.methodEach(old_available_format_nodes, 'remove');

          this.outbound_datum_nodes_without_format = _.without(this.outbound_datum_nodes_without_format, to_node);
          this.outbound_datum_nodes_with_format.push(to_node);

          var new_pot_dest_nodes = this.createPotentialDestNodes(to_node);
          _.pushArray(this.potential_dest_nodes, new_pot_dest_nodes);
          var new_pot_dest_group_node = this.createPotentialDestGroupNode(to_node);
          this.potential_dest_group_nodes.push(new_pot_dest_group_node);

          var new_pot_dest_group_to_pot_dest_edges = _.map(new_pot_dest_nodes, this.createPotentialDestGroupToPotentialDestEdge, this);
          _.pushArray(this.potential_dest_group_to_potential_dest_edges, new_pot_dest_group_to_pot_dest_edges);
          var new_od_to_pot_dest_group_edge = this.createOutboundDatumToPotentialDestGroupEdge(new_pot_dest_group_node);
          this.outbound_datum_to_potential_dest_group_edges.push(new_od_to_pot_dest_group_edge);

          this.trigger("change");
        }
      });
    }, this);    

  });

}
FocalTaskGraph.prototype = _.extend(Object.create(AbstractFocalGraph.prototype), {
  constructor: FocalTaskGraph,
  getNodes: function() {
    var from_super = AbstractFocalGraph.prototype.getNodes.call(this);
    return _.union(from_super, [this.task_node], this.task_input_nodes, this.task_input_src_nodes, this.task_input_add_existing_src_nodes, this.task_input_add_new_src_nodes, this.available_format_nodes);
  },
  getEdges: function() {
    var from_super = AbstractFocalGraph.prototype.getEdges.call(this);
    return _.union(from_super, this.task_input_to_task_edges, this.task_input_src_to_task_input_edges, this.task_input_add_existing_src_to_task_input_edges, this.task_input_add_new_src_to_task_input_edges, this.task_to_task_output_edges, this.outbound_datum_to_available_format_edges);
  },
  createTaskNode: function(task) {
    return new FocalTaskNodeView({graph: this, task: task});
  },
  createTaskInputNode: function(task_input){
    return new FocalTaskInputNodeView({graph: this, task_input: task_input});
  },
  createTaskInputSrcNodes: function(task_input) {
    return _.map(task_input.sources, _.partial(this.createTaskInputSrcNode, task_input), this);
  },
  createTaskInputSrcNode: function(task_input, source) {
    return new FocalTaskInputSrcNodeView({graph: this, task_input: task_input, source: source});
  },
  createAddExistingSrcNode: function(task_input){
    return new FocalTaskInputAddExistingSrcNodeView({graph: this, task_input: task_input});
  },
  createAddNewSrcNode: function(task_input){
    return new FocalTaskInputAddNewSrcNodeView({graph: this, task_input: task_input});
  },
  createTaskOutputNode: function(task_output){
    return new FocalTaskOutputNodeView({graph: this, task_output: task_output});
  },
  createAvailableFormatNodes: function(to_node){
    var available_formats = to_node.outbound_datum.getAvailableFormats();
    return _.map(available_formats, function(format){return new FocalAvailableFormatNodeView({graph: this, task_output: to_node.outbound_datum, format: format});}, this);
  },
  createTaskInputToTaskEdge: function(ti_node){
    return new FocalTaskInputToTaskEdgeView({
      graph: this,
      source: ti_node,
      target: this.task_node
    });
  },
  createTaskInputSrcToTaskInputEdge: function(tis_node){
    return new FocalTaskInputSourceToTaskInputEdgeView({
      graph: this,
      source: tis_node,
      target: _.findExact(this.task_input_nodes, {task_input: tis_node.task_input})
    });
  },
  createTaskInputAddExistingSrcToTaskInputEdge: function(tiaes_node){
    return new FocalTaskInputAddExistingSrcToTaskInputEdgeView({
      graph: this,
      source: tiaes_node,
      target: _.findExact(this.task_input_nodes, {task_input: tiaes_node.task_input})
    });
  },
  createTaskInputAddNewSrcToTaskInputEdge: function(tians_node){
    return new FocalTaskInputAddNewSrcToTaskInputEdgeView({
      graph: this,
      source: tians_node,
      target: _.findExact(this.task_input_nodes, {task_input: tians_node.task_input})
    });
  },
  createTaskToTaskOutputEdge: function(od_node){
    return new FocalTaskToTaskOutputEdgeView({
      graph: this,
      source: this.task_node,
      target: od_node
    });
  },
  createOutboundDatumToAvailableFormatEdge: function(pf_node){
    return new FocalOutboundDatumToAvailableFormatEdgeView({
      graph: this,
      source: _.findExact(this.outbound_datum_nodes_without_format, {outbound_datum: pf_node.outbound_datum}),
      target: pf_node
    });
  }

});

function FocalPipelineInputsGraph(pipeline) {
  AbstractFocalGraph.call(this, pipeline, function(){
    this.outbound_datum_nodes_with_format = _.map(this.pipeline.inputs, this.createPipelineInputNode, this);
    this.outbound_datum_nodes_without_format = [];
    this.potential_pipeline_input_node = this.createPotentialPipelineInputNode();
  });

  this.listenTo(this.pipeline, {
    "add:input": function(pl_input) {
      var new_pi_node = this.createPipelineInputNode(pl_input);
      this.outbound_datum_nodes_with_format.push(new_pi_node);

      var new_pot_dest_nodes = this.createPotentialDestNodes(new_pi_node);
      _.pushArray(this.potential_dest_nodes, new_pot_dest_nodes);

      if(this.hasPotentialDestNode(new_pi_node)) {
        var new_pot_dest_group_node = this.createPotentialDestGroupNode(new_pi_node);
        this.potential_dest_group_nodes.push(new_pot_dest_group_node);
        this.outbound_datum_to_potential_dest_group_edges.push(this.createOutboundDatumToPotentialDestGroupEdge(new_pot_dest_group_node));
        _.pushArray(this.potential_dest_group_to_potential_dest_edges, _.map(new_pot_dest_nodes, this.createPotentialDestGroupToPotentialDestEdge, this));
      }

      this.trigger("change");
    }
  });
}
FocalPipelineInputsGraph.prototype = _.extend(Object.create(AbstractFocalGraph.prototype), {
  getNodes: function() {
    var from_super = AbstractFocalGraph.prototype.getNodes.call(this);
    return _.union(from_super, [this.potential_pipeline_input_node]);
  },
  createPipelineInputNode: function(pl_input){
    return new FocalPipelineInputNodeView({graph: this, pipeline_input: pl_input});
  },
  createPotentialPipelineInputNode: function() {
    return new FocalPotentialPipelineInputNodeView({graph: this});
  },
  constructor: FocalPipelineInputsGraph
});

var AbstractFocalNodeView = Backbone.View.extend({
  constructor: function(options) {
    _.extend(this, options);
    Backbone.View.prototype.constructor.call(this);
  },
  initialize: function() {
    if(this.task_output) {
      this.outbound_datum = this.task_output;
    }
    if(this.pipeline_input) {
      this.outbound_datum = this.pipeline_input;
    }

    this.render();
    this.graph.node_insertion_queue.push(this);
  },
  render: function() {
    this.$el.html(this.template(this));
  },
  applyLayout: function() {
    var d = this.dagre;
    this.$el.css("transform", 'translate('+ (d.x-d.width/2) +'px,'+ (d.y-d.height/2) +'px)');
  },
  cacheNodeDimensions: function() {
    _.extend(this, {width: this.$el.outerWidth(), height: this.$el.outerHeight()});
  }
});

var FocalTaskInputSrcNodeView = AbstractFocalNodeView.extend({
  template: _.template($('#FocalTaskInputSrcNodeView-template').html()),
  className: 'node task_input_src',
  events: {
    'click': function() {
      app.focusOn( this.source.getFocalParentObject() );
    }
  },
  getLabel: function() {
    console.log(this);
    if(this.source instanceof PipelineInput) {
      return this.source.id;
    } else if(this.source instanceof TaskOutput) {
      return this.source.task.id + ' ('+this.source.tool_output.id+')';
    } else {
      throw new TypeError("this.source has invalid type");
    }
  },
});

var FocalTaskInputAddExistingSrcNodeView = AbstractFocalNodeView.extend({
  template: _.template($('#FocalTaskInputAddExistingSrcNodeView-template').html()),
  className: 'node task_input_add_existing_src',
  events: {
    'click': 'doAddExisting'
  },
  getLabel: function() {
    return 'Select Data';
  },
  doAddExisting: function() {

    var handle_selected = (function(selected_datum) {
      this.task_input.addSource(selected_datum);
      app.global_view.setMode("TASK_SELECTION");
      app.focal_view.unblockUI();;
    }).bind(this);

    app.focal_view.blockUI();
    app.global_view.setMode("DATUM_SELECTION", {selectable_data: this.task_input.getPotentialSources(), on_datum_selected: handle_selected});
  }
});

var FocalTaskInputAddNewSrcNodeView = AbstractFocalNodeView.extend({
  template: _.template($('#FocalTaskInputAddNewSrcNodeView-template').html()),
  className: 'node task_input_add_new_src',
  events: {
    'click': 'doModal'
  },
  getLabel: function() {
    return 'Add Data';
  },
  doModal: function() {
    var add_as_source = (function(pipeline_input) {
      this.task_input.addSource(pipeline_input);
    }).bind(this);

    var modal_view = new ModalPipelineInputCreationView({on_after_create: add_as_source});
  }
});

var FocalTaskInputNodeView = AbstractFocalNodeView.extend({
  template: _.template($('#FocalTaskInputNodeView-template').html()),
  className: 'node task_input hint--bottom',
  attributes: function() { return {'data-hint': this.getLabel()}; },
  getLabel: function() {
    return this.task_input.tool_input.id;
  },
});

var FocalTaskNodeView = AbstractFocalNodeView.extend({
  template: _.template($('#FocalTaskNodeView-template').html()),
  className: 'node task',
  events: {
    'click': 'doOptionsModal'
  },
  getLabel: function() {
    return this.task.tool.id;
  },
  doOptionsModal: function() {
    var options_modal_view = new ModalTaskOptionsView({task: this.task});
  }
});

var ModalTaskOptionsView = Backbone.View.extend({
  template: _.template($('#ModalTaskOptionsView-template').html()),
  className: 'modal',
  events: {
    'click .cancel': function() {
      this.teardown();
    },
    'click .save': function() {
      _.each(this.$option_inputs, function(input_el) {
        var $input_el = $(input_el);
        var task_option = this.task.getOptionById($input_el.attr('data-tool-option-id'));
        task_option.value = task_option.tool_option.type === 'flag' ? $input_el.is(':checked') : $input_el.val();
      }, this);

      _.each(this.$nonrequired_input_inputs, function(input_el) {
        var $input_el = $(input_el);
        var task_input = this.task.getInputById($input_el.attr('data-tool-input-id'));
        $input_el.is(':checked') ? task_input.enable() : task_input.disable();
      }, this);

      this.teardown();
    }
  },

  initialize: function(options) {
    this.task = options.task;
    this.render();
    this.$option_inputs = this.$el.find('input.task_option');
    this.$nonrequired_input_inputs = this.$el.find('input.task_input');
    this.$el.modal();
  },

  teardown: function() {
    this.$el.modal('hide');
    this.$el.data('modal', null);
    this.remove();
  },

  render: function() {
    this.$el.html(this.template({options_by_category: this.task.getOptionsByCategory(), nonrequired_inputs: _.methodReject(this.task.inputs, 'isRequired') }));
  }

 });

var FocalPotentialPipelineInputNodeView = AbstractFocalNodeView.extend({
  template: _.template($('#FocalPotentialPipelineInputNodeView-template').html()),
  className: 'node potential_pipeline_input',
  events: {
    'click': 'doModal'
  },
  getLabel: function() {
    return 'Add New Input';
  },
  doModal: function() {
    var modal_view = new ModalPipelineInputCreationView();
  }
});

var ModalPipelineInputCreationView = Backbone.View.extend({
  template: _.template($('#ModalPipelineInputCreationView-template').html()),
  className: 'modal',
  events: {
    'click .cancel': function() {
      this.teardown();
    },
    'click .save': function() {
      var new_input = app.pipeline.addInput({data_URL: this.$input_url.val(), pipeline_input_id: this.$input_id.val()});
      this.onAfterCreate(new_input);
      this.teardown();
    }
  },

  initialize: function(options) {
    this.render();
    this.$input_url = this.$el.find('input.url');
    this.$input_id = this.$el.find('input.id');
    this.onAfterCreate = _.assignWithDefault(options && options.on_after_create, _.noop);
  },

  teardown: function() {
    this.$el.modal('hide');
    this.$el.data('modal', null);
    this.remove();
  },

  render: function() {
    this.$el.html(this.template());
    this.$el.modal();
  }

 });

var FocalTaskOutputNodeView = AbstractFocalNodeView.extend({
  template: _.template($('#FocalOutboundDatumNodeView-template').html()),
  className: 'node outbound_datum task_output hint--bottom',
  attributes: function() { return {'data-hint': this.getLabel()}; },
  getLabel: function() {
    return this.task_output.tool_output.id;
  },
});

var FocalPipelineInputNodeView = AbstractFocalNodeView.extend({
  template: _.template($('#FocalOutboundDatumNodeView-template').html()),
  className: 'node outbound_datum pipeline_input with_format hint--bottom',
  attributes: function() { return {'data-hint': this.getLabel()}; },
  getLabel: function() {
    return this.pipeline_input.id + ' ('+this.pipeline_input.getFormat()+')';
  },
});

var FocalAvailableFormatNodeView = AbstractFocalNodeView.extend({
  template: _.template($('#FocalAvailableFormatNodeView-template').html()),
  className: 'node available_format',
  events: {
    'click': function() {
      this.task_output.setFormat(this.format);
    }
  },
  getLabel: function() {
    return this.format;
  },
});

var FocalDestNodeView = AbstractFocalNodeView.extend({
  template: _.template($('#FocalDestNodeView-template').html()),
  className: 'node dest',
  events: {
    'click': function() {
      app.focusOn(this.dest);
    }
  },
  getLabel: function() {
    return this.dest.tool.id;
  },
});

var FocalPotentialDestGroupNodeView = AbstractFocalNodeView.extend({
  template: _.template($('#FocalPotentialDestGroupNodeView-template').html()),
  className: 'node potential_dest_group'
});

var FocalPotentialDestNodeView = AbstractFocalNodeView.extend({
  template: _.template($('#FocalPotentialDestNodeView-template').html()),
  className: 'node potential_dest',
  events: {

  },
  getLabel: function() {
    return this.package;
  },
  teardown: function() {
    this.remove();
  },

  render: function() {
    this.$el.html(this.template(this));
    this.$dropdown = this.$el.children('.dropdown');
    this.$dropdown_button = this.$dropdown.children('a.dropdown-toggle');
    this.item_views = _.map(this.potential_dests, function(potential_dest) {return new FocalPotentialDestNodeViewItem({tool_input: potential_dest, parent_view: this});}, this);
    this.$items_container = this.$dropdown.children('.items');
    this.$items_container.append(_.pluck(this.item_views, 'el'));
    
  }
});

var FocalPotentialDestNodeViewItem = Backbone.View.extend({
  template: _.template($('#FocalPotentialDestNodeViewItem-template').html()),
  tagName: 'li',
  events: {
    'click': function() {
      var task_cfg = {
        task_id: guid(),
        tool_id: this.tool_input.tool.id,
        input_src_assignments: {}
      };
      task_cfg.input_src_assignments[this.tool_input.id] = (
        this.parent_view.outbound_datum instanceof TaskOutput ?
        {
          task_id: this.parent_view.outbound_datum.task.id,
          tool_output_id: this.parent_view.outbound_datum.tool_output.id
        } :
        {
          pipeline_input_id: this.parent_view.outbound_datum.id
        }
      );
      //debugger;
      app.pipeline.addTask(task_cfg);
    }
  },

  initialize: function(options) {
    this.tool_input = options.tool_input;
    this.parent_view = options.parent_view;
    this.render();
  },

  teardown: function() {
    this.remove();
  },

  render: function() {
    this.$el.html(this.template(this));
  }
});

var AbstractFocalEdgeView = Backbone.View.extend({
  className: 'edge test',
  initialize: function(options) {
    this.graph = options.graph;
    this.source = options.source;
    this.target = options.target;
    this.connection_options = {
      anchors:[["Continuous", { faces:["right"] } ], ["Continuous", { faces:["left"] } ]],
      paintStyle:{ 
        lineWidth:1,
        strokeStyle:"#a7b04b",
      },
      container: this.$el,
      endpoint:"Blank"
    };
    this.graph.edge_insertion_queue.push(this);
  },
  remove: function() {
    if(this.connection) {
      jsPlumb.detach(this.connection);
    }
    return Backbone.View.prototype.remove.call(this);
  },
  draw: function() {
    if(this.connection) {
      jsPlumb.detach(this.connection);
    }
    this.connection = this._bezierConnection(this.source.el, this.target.el);
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

var FocalTaskInputAddExistingSrcToTaskInputEdgeView = AbstractFocalEdgeView.extend({
  className: 'edge potential_src_to_task_input',
  initialize: function(options) {
    AbstractFocalEdgeView.prototype.initialize.call(this, options);
    _.merge(this.connection_options, {
      paintStyle: {
        "stroke-dasharray": "2, 2"
      }
    });
  }
});

var FocalTaskInputAddNewSrcToTaskInputEdgeView = AbstractFocalEdgeView.extend({
  className: 'edge potential_src_to_task_input',
  initialize: function(options) {
    AbstractFocalEdgeView.prototype.initialize.call(this, options);
    _.merge(this.connection_options, {
      paintStyle: {
        "stroke-dasharray": "2, 2"
      }
    });
  }
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

var FocalTaskToTaskOutputEdgeView = AbstractFocalEdgeView.extend({
  className: 'edge task_to_task_output',
});

var FocalOutboundDatumToAvailableFormatEdgeView = AbstractFocalEdgeView.extend({
  className: 'edge outbound_datum_to_available_format',
  initialize: function(options) {
    AbstractFocalEdgeView.prototype.initialize.call(this, options);
    _.merge(this.connection_options, {
      paintStyle: {
        "stroke-dasharray": "2, 2"
      }
    });
  }
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
      }
    });
  }
});