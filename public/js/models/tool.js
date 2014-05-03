// here we assume the cfg is valid; this should be checked prior to
// instantiating business objects

function Tool(tool_cfg) {

    if (tool_cfg.id == "bammerger" || tool_cfg.id == "bamtools-filter") {
	console.log(tool_cfg);
    }

    // Are we operating where all the tools are already fully
    // configured??
    if (app.tool_library && app.tool_library._tools) {
	var ot = app.tool_library.getTool(tool_cfg.id);
	if (ot) { return ot; };
    }

    // No, so do full tool construction

    this.id = tool_cfg.id;
    this.package = tool_cfg.package || undefined;
    this.description = tool_cfg.description || '';
    this.service_URL = tool_cfg.service_URL || undefined;
    this.inputs_named = tool_cfg.inputs_named || undefined;
    this.flags_have_value = tool_cfg.flags_have_value || undefined;
    this.param_loc = tool_cfg.param_loc || undefined;


    this.options =
        _.flatten(_.map(tool_cfg.options,
                        function(category_option_cfgs, category) {
                            return _.map(
                                category_option_cfgs,
                                function(option_cfg, option_id){
                                    return new ToolOption(
                                        this,
                                        _.extend(option_cfg,
                                                 {id: option_id,
                                                  category: category}));
                                }, this);
                        }, this));

    this.inputs = _.map(tool_cfg.inputs,
                        function(input_cfg, input_id) {
                            return new ToolInput(
                                this,
                                _.extend(input_cfg, {id: input_id}));
                        }, this);

    this.outputs = _.map(tool_cfg.outputs,
                         function(output_cfg, output_id) {
                             return new ToolOutput(
                                 this,
                                 _.extend(output_cfg, {id: output_id}));
                         }, this);
}

_.extend(Tool.prototype, {
    constructor: Tool,
    toJSON: function() {
        return {
            id: this.id,

            service_URL: this.service_URL,
	    inputs_named: this.inputs_named,
	    flags_have_value: this.flags_have_value,
	    param_loc: this.param_loc,

            options: _.transform(
                _.groupBy(this.options, 'category'),
                function(result, options, category){
                    result[category] = _.object(
                        _.pluck(options, "id"),
                        _.methodMap(options, "toJSON"))
                })
,
            inputs: _.object(
                _.pluck(this.inputs, "id"),
                _.methodMap(this.inputs, "toJSON")),

            outputs: _.object(
                _.pluck(this.outputs, "id"),
                _.methodMap(this.outputs, "toJSON"))
        };
    },

    getInput: function(input_id) {
        return _.find(this.inputs, {id: input_id});
    },

    getOutput: function(output_id) {
        return _.find(this.outputs, {id: output_id});
    },

    getOption: function(option_id) {
        return _.find(this.options, {id: option_id});
    },

    findSuggestableInputAcceptingFormat: function(format) {
        return _.methodFind(_.filter(this.inputs, 'suggestable'),
                            'acceptsFormat', format);
    }
})


function ToolOption(tool, tool_option_cfg) {
    this.tool = tool;
    this.id = tool_option_cfg.id;
    this.description = tool_option_cfg.description;
    this.default = tool_option_cfg.default;
    this.type = tool_option_cfg.type;
    this.category = tool_option_cfg.category;
}

_.extend(ToolOption.prototype, {
    toJSON: function() {
        var obj = _.pick(this, 'description', 'type');
        if(!_.isUndefined(this.default)) {
            obj.default = this.default;
        }
        return obj;
    }
})


function ToolInput(tool, tool_input_cfg) {
    this.tool = tool;
    this.id = tool_input_cfg.id;
    this.formats_whitelist =
        _.assignWithDefault(tool_input_cfg.formats_whitelist, undefined);
    this.required =
        _.assignWithDefault(tool_input_cfg.required, false);
    this.accepts_multiple =
        _.assignWithDefault(tool_input_cfg.accepts_multiple, false);
    this.suggestable = _.assignWithDefault(tool_input_cfg.suggestable, true);
}

_.extend(ToolInput.prototype, {
    toJSON: function() {
        var obj = {};
        if(!_.isUndefined(this.formats_whitelist)) {
            obj.formats_whitelist = this.formats_whitelist;
        }
        if(this.required) {
            obj.required = true;
        }
        if(this.accepts_multiple) {
            obj.accepts_multiple = true;
        }
        if(!this.suggestable) {
            obj.suggestable = false;
        }
        return obj;
    },

    acceptsFormat: function(format) {
        return _.isUndefined(
            this.formats_whitelist) ||
            _.contains(this.formats_whitelist, format);
    }
})


function ToolOutput(tool, tool_output_cfg) {
    this.tool = tool;
    this.id = tool_output_cfg.id;
    this.available_formats =
        _.assignWithDefault(tool_output_cfg.available_formats, [null]);
    this.provides_multiple =
        _.assignWithDefault(tool_output_cfg.provides_multiple, false);
}

_.extend(ToolOutput.prototype, {
    toJSON: function() {
        var obj = {};
        if(!_.isEqual(this.formats_whitelist, [null])) {
            obj.formats_whitelist = this.formats_whitelist;
        }
        if(this.provides_multiple) {
            obj.provides_multiple = true;
        }
        return obj;
    }
})