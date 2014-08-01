var VisualizationView = Backbone.View.extend({
  template: _.template($('#VisualizationView-template').html()),

  events: {
    "click .x" : "handleRemoveChart",
    "change .chartAdder" : "handleAddChart"
  },

  initialize: function(options) {
    this.$el.html(this.template());
    this.pie_chart = donutD3().radius(61).outerRadius(45).innerRadius(0);
    // setup length histrogram chart
    this.histogram_chart = histogramD3();
    this.histogram_chart.margin({top:10, right:30, bottom:20, left:40})
    this.histogram_chart.yAxis().ticks(2);
    this.histogram_chart.xAxis().ticks(3);
    this.histogram_chart.xAxis().tickFormat(this.tickFormatter);
    this.histogram_chart.yAxis().tickFormat(this.tickFormatter);
  },
  // add pie
  addPieChart: function(chart) {
    // create chart element
    var $div = $('<div class="chart pie"><div class="x">X</div><svg viewBox="0 0 150 150" ></svg></div>');

    this.$el.append($div)
    var svg = $div.children('svg')[0];
    var pie = d3.layout.pie().sort(null);
    var arc = d3.select(svg).selectAll(".arc")
        .data( pie(chart.data) );
    this.pie_chart(arc, chart.options);
  },
  // add a histogram chart
  addHistogramChart: function(chart) {
    // create chart element
    var $div = $('<div class="chart histogram" style="flex-grow:2"><div class="x">X</div><svg viewBox="0 0 300 150" ></svg></div>');

    this.$el.append($div)
    var svg = $div.children('svg')[0];

    var selection = d3.select(svg).datum(chart.data);
    this.histogram_chart.width(300).height(150);
    this.histogram_chart( selection, chart.options );
  },

  // handle addChart event
  handleAddChart : function(event) {
    this.addChart( $(event.target).val() );
  },

  // add chart
  addChart: function(chartId) {       
    if ( this.data.charts[chartId].chartType == 'pie' )
        this.addPieChart( this.data.charts[chartId] );
    else if ( this.data.charts[chartId].chartType == 'histogram' )
        this.addHistogramChart( this.data.charts[chartId] );
  },

  // add multiple charts
  initializeCharts: function(data, task_id, tool_id) {
      //console.log(this.el, task_id, tool_id);
      this.$el.empty();      
      var me = this;      
      // parse data into visualization format if parser exists
      var parser = this.findParser(tool_id);
      if (!parser) {
          this.$el.html(JSON.stringify(data));
          return;
      } else {
          var data = parser(data);
          me.data = data;

          // add selector for charts
          var options = Object.keys(data.charts).map(function(id) { return "<option value='" + id + "'>" + id + "</option>"})
          me.$el.append("<select class='chartAdder'><option>Add Chart</option>" + options + "</select>");
          // iterate through charts
          data.defaults.forEach(function (chartId) {
              me.addChart(chartId);
          });
      };
  },

  // handle removeChart event
  handleRemoveChart : function(event) {
    $(event.currentTarget).parent().remove();
  },

  // parsers for converting task output to standard chart input
  findParser: function (tool_id) {
      return this.parsers[tool_id];
  },

  parsers: {
    // bamstatsalive parser
    'bamstatsalive' :  function(data) {
      var total_reads = data['total_reads'];
      // list all metrics
      var metrics = ['mapped_reads', 'duplicates', 'singletons',
                     'proper_pairs', 'both_mates_mapped', 'forward_strands',
                     'failed_qc', 'first_mates', 'last_read_position',
                     'paired_end_reads', 'reverse_strands', 'second_mates'];

      var distributions = ['baseq_hist',  'coverage_hist', 'mapq_hist',
                           'length_hist', 'frag_hist',     'refAln_hist'];
      var viz_data = { 'charts' : [] };

      // defaults
      viz_data.defaults = ['mapped_reads', 'singletons',
                           'proper_pairs', 'frag_hist',
                           'coverage_hist'];

      // reorganize data for metric pie charts
      metrics.forEach( function(chartId) {
        viz_data.charts[chartId] = {
            'chartType' : 'pie',
            'data'      : [ data[chartId], total_reads-data[chartId] ],
            options     : {'title':chartId} }
      })

      // reorganize data for distribution histogram charts
      distributions.forEach( function(chartId) {
        var d = Object.keys(data[chartId])
                .map(function(k) { return  [+k, +data[chartId][k]] });

        viz_data.charts[chartId] = {
            'chartType' : 'histogram',
            'data'      : d,
            options     : {'title':chartId} }
      })

      return viz_data;
    },
    'snpeffstats' : function(data) {

    }
  },
  tickFormatter: function(d) {
              if ((d / 1000000) >= 1)
                d = d / 1000000 + "M";
              else if ((d / 1000) >= 1)
                d = d / 1000 + "K";
              return d;
           }
});


