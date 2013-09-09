var abstract_pipeline_component = {
  getInput: function(input_id) {
    return _.find(this.inputs, {id: input_id});
  },
  getOption: function(option_id) {
    return _.find(this.options, {id: option_id});
  },
  getOutput: function(output_id) {
    return _.find(this.outputs, {id: output_id});
  }
};