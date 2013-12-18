var FocalView = Backbone.View.extend({
  template: _.template($('#FocalView-template').html()),
  initialize: function(options) {

    this.listenTo(app.pipeline, 'change', this.render);
    this.listenTo(app.pipeline, 'task_added', this.focusOn);

  },
  render: function() {

    if(this.datum instanceof Task) {
      this.graph = new FocalTaskGraph(this.datum);
    } else if(this.datum === app.pipeline.inputs) {
      this.graph = new FocalPipelineInputsGraph(app.pipeline);
    }

    this.node_views = _.union(
      _.map(this.graph.task_input_src_nodes, function(node){
        return new FocalTaskInputSrcNodeView({focal_view: this, node: node});
      }, this),
      _.map(this.graph.task_input_add_existing_src_nodes, function(node){
        return new FocalTaskInputAddExistingSrcNodeView({focal_view: this, node: node});
      }, this),
      _.map(this.graph.task_input_add_new_src_nodes, function(node){
        return new FocalTaskInputAddNewSrcNodeView({focal_view: this, node: node});
      }, this),
      _.map(this.graph.task_input_nodes, function(node){
        return new FocalTaskInputNodeView({focal_view: this, node: node});
      }, this),
      _.map(this.graph.task_node ? [this.graph.task_node] : [], function(node){
        return new FocalTaskNodeView({focal_view: this, node: node});
      }, this),
      _.map(this.graph.potential_pipeline_input_node ? [this.graph.potential_pipeline_input_node] : [], function(node){
        return new FocalPotentialPipelineInputNodeView({focal_view: this, node: node});
      }, this),
      _.map(_.union(this.graph.outbound_datum_nodes_with_format, this.graph.outbound_datum_nodes_without_format), function(node){
        return new FocalOutboundDatumNodeView({focal_view: this, node: node});
      }, this),
      _.map(this.graph.available_format_nodes, function(node){
        return new FocalAvailableFormatNodeView({focal_view: this, node: node});
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
      _.map(this.graph.task_input_add_existing_src_to_task_input_edges, function(edge){
        return new FocalTaskInputAddExistingSrcToTaskInputEdgeView({focal_view: this, edge: edge});
      }, this),
      _.map(this.graph.task_input_add_new_src_to_task_input_edges, function(edge){
        return new FocalTaskInputAddNewSrcToTaskInputEdgeView({focal_view: this, edge: edge});
      }, this),
      _.map(this.graph.task_input_source_to_task_input_edges, function(edge){
        return new FocalTaskInputSourceToTaskInputEdgeView({focal_view: this, edge: edge});
      }, this),
      _.map(this.graph.task_input_to_task_edges, function(edge){
        return new FocalTaskInputToTaskEdgeView({focal_view: this, edge: edge});
      }, this),
      _.map(this.graph.task_to_task_output_edges, function(edge){
        return new FocalTaskToTaskOutputEdgeView({focal_view: this, edge: edge});
      }, this),
      _.map(this.graph.outbound_datum_to_dest_edges, function(edge){
        return new FocalOutboundDatumToDestEdgeView({focal_view: this, edge: edge});
      }, this),
      _.map(this.graph.outbound_datum_to_available_format_edges, function(edge){
        return new FocalOutboundDatumToAvailableFormatEdgeView({focal_view: this, edge: edge});
      }, this),
      _.map(this.graph.outbound_datum_to_potential_dest_group_edges, function(edge){
        return new FocalOutboundDatumToPotentialDestGroupEdgeView({focal_view: this, edge: edge});
      }, this),
      _.map(this.graph.potential_dest_group_to_potential_dest_edges, function(edge){
        return new FocalPotentialDestGroupToPotentialDestEdgeView({focal_view: this, edge: edge});
      }, this)
    )

    this.$el.html(this.template());
    this.$resizer_el = this.$el.children('.resizer');
    this.$graph_subviews_el = this.$resizer_el.children('.graph_subviews');

    this.$graph_subviews_el.append(_.pluck(this.node_views, 'el'));
    this.$graph_subviews_el.append(_.pluck(this.edge_views, 'el'));

    _.methodEach(this.node_views, 'cacheNodeDimensions');

    dagre.layout()
      .nodeSep(15)
      .edgeSep(20)
      .rankSep(30)
      .rankDir("LR")
      .nodes(this.graph.getNodes() )
      .edges(this.graph.getEdges() )
      .debugLevel(0)
      .run();

    _.methodEach(this.node_views, 'applyLayout');
    _.methodEach(this.edge_views, 'applyLayout');
    
    this.resizeContents();

  },
  focusOn: function(datum) {

    this.datum = datum;

    this.render();
  },
  resizeContents: function() {
    var graph_bbox = $(_.pluck(this.node_views, 'el')).bounds();
    var el_bbox = {width: this.$el.width(), height: this.$el.height()};
    this.scale = Math.min(Math.min(el_bbox.width/graph_bbox.width, el_bbox.height/graph_bbox.height), 1);
    this.translate_x = Math.round((el_bbox.width-graph_bbox.width)/2);
    this.translate_y = Math.round((el_bbox.height-graph_bbox.height)/2);
    this.$resizer_el.css({"transform": "scale("+this.scale+","+this.scale+") translate("+this.translate_x+"px,"+this.translate_y+"px)"});
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
  cacheNodeDimensions: function() {
    _.extend(this.node, {width: this.$el.outerWidth(), height: this.$el.outerHeight()});
  }
});

var FocalTaskInputSrcNodeView = AbstractFocalNodeView.extend({
  template: _.template($('#FocalTaskInputSrcNodeView-template').html()),
  className: 'node task_input_src',
  events: {
    'click': function() {
      this.focal_view.focusOn( this.node.source.getFocalParentObject() );
    }
  }
});

var FocalTaskInputAddExistingSrcNodeView = AbstractFocalNodeView.extend({
  template: _.template($('#FocalTaskInputAddExistingSrcNodeView-template').html()),
  className: 'node task_input_add_existing_src',
});

var FocalTaskInputAddNewSrcNodeView = AbstractFocalNodeView.extend({
  template: _.template($('#FocalTaskInputAddNewSrcNodeView-template').html()),
  className: 'node task_input_add_new_src',
  events: {
    'click': 'doModal'
  },
  doModal: function() {
    var add_as_source = (function(pipeline_input) {
      this.node.task_input.addSource(pipeline_input);
    }).bind(this);

    var modal_view = new ModalPipelineInputCreationView({on_after_create: add_as_source});
  }
});

var FocalTaskInputNodeView = AbstractFocalNodeView.extend({
  template: _.template($('#FocalTaskInputNodeView-template').html()),
  className: 'node task_input hint--bottom',
  attributes: function() { return {'data-hint': this.options.node.label}; }
});

var FocalTaskNodeView = AbstractFocalNodeView.extend({
  template: _.template($('#FocalTaskNodeView-template').html()),
  className: 'node task',
  events: {
    'click': 'doOptionsModal'
  },
  doOptionsModal: function() {
    var options_modal_view = new ModalTaskOptionsView({task: this.node.task});
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

var FocalOutboundDatumNodeView = AbstractFocalNodeView.extend({
  template: _.template($('#FocalOutboundDatumNodeView-template').html()),
  className: 'node outbound_datum hint--bottom',
  attributes: function() { return {'data-hint': this.options.node.label}; }
});

var FocalAvailableFormatNodeView = AbstractFocalNodeView.extend({
  template: _.template($('#FocalAvailableFormatNodeView-template').html()),
  className: 'node available_format',
  events: {
    'click': function() {
      this.node.task_output.setFormat(this.node.format);
    }
  }
});

var FocalDestNodeView = AbstractFocalNodeView.extend({
  template: _.template($('#FocalDestNodeView-template').html()),
  className: 'node dest',
  events: {
    'click': function() {
      this.focal_view.focusOn( this.node.dest );
    }
  }
});

var FocalPotentialDestGroupNodeView = AbstractFocalNodeView.extend({
  template: _.template($('#FocalPotentialDestGroupNodeView-template').html()),
  className: 'node potential_dest_group',
});

var FocalPotentialDestNodeView = AbstractFocalNodeView.extend({
  template: _.template($('#FocalPotentialDestNodeView-template').html()),
  className: 'node potential_dest',
  events: {

  },

  teardown: function() {
    this.remove();
  },

  render: function() {
    this.$el.html(this.template(this));
    this.$dropdown = this.$el.children('.dropdown');
    this.$dropdown_button = this.$dropdown.children('a.dropdown-toggle');
    this.item_views = _.map(this.node.potential_dests, function(potential_dest) {return new FocalPotentialDestNodeViewItem({tool_input: potential_dest, parent_view: this});}, this);
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
      var datum = this.parent_view.focal_view.datum;
      task_cfg.input_src_assignments[this.tool_input.id] = (
        datum instanceof Task ?
        {
          task_id: datum.id,
          tool_output_id: this.parent_view.node.outbound_datum.tool_output.id
        } :
        {
          pipeline_input_id: this.parent_view.node.outbound_datum.id
        }
      );
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
    this.focal_view = options.focal_view;
    this.edge = options.edge;
    this.source_el = this.focal_view.getNodeElem(this.edge.source);
    this.target_el = this.focal_view.getNodeElem(this.edge.target);
    this.connection_options = {
      anchors:[["Continuous", { faces:["right"] } ], ["Continuous", { faces:["left"] } ]],
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
