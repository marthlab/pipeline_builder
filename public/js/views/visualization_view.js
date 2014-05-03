var VisualizationView = Backbone.View.extend({
  template: _.template($('#VisualizationView-template').html()),
  initialize: function(options) {
    this.$el.html(this.template());
    this.pie_chart = donutD3().radius(61).innerRadius(0);
    // setup length histrogram chart
    this.histogram_chart = histogramD3();
    this.histogram_chart.margin({top:10, right:30, bottom:10, left:40})
    this.histogram_chart.yAxis().ticks(2);
    this.histogram_chart.xAxis().ticks(3);
    this.histogram_chart.xAxis().tickFormat(this.tickFormatter);
    this.histogram_chart.yAxis().tickFormat(this.tickFormatter);
  },
  // add pie
  addPieChart: function(chart) {
    // create chart element
    var $div = $('<div class="chart"><svg viewBox="0 0 150 150" ></svg></div>');
    
    this.$el.append($div)
    var svg = $div.children('svg')[0];
    var pie = d3.layout.pie().sort(null);      
    var arc = d3.select(svg).selectAll(".arc")
        .data( pie(chart.data) );
    this.pie_chart(arc);    
  },
  // add a histogram chart
  addHistogramChart: function(chart) {
    // create chart element
    var $div = $('<div class="chart" style="flex-grow:2"><svg viewBox="0 0 300 150" ></svg></div>');
    
    this.$el.append($div)
    var svg = $div.children('svg')[0];

    var selection = d3.select(svg).datum(chart.data);
    this.histogram_chart.width(300).height(150);
    this.histogram_chart( selection );
  },
  // add multiple charts
  addCharts: function(data, task_id) {
    var me = this;
    // parse data into visualization format if parser exists
    if ( this.parsers[task_id] == undefined ) {
      this.$el.html(data);
      return;
    } else
      var data = this.parsers[task_id](data)

    // iterate through charts
    data.defaults.forEach(function (chartId) {
      if ( data.charts[chartId].chartType == 'pie' )
        me.addPieChart( data.charts[chartId] );
      else if ( data.charts[chartId].chartType == 'histogram' )
        me.addHistogramChart( data.charts[chartId] );
    })
  },
  // parsers for converting task output to standard chart input
  parsers: { 
    // bamstatsalive parser
    'bamstatsalive' :  function(data) {
      var total_reads = data['total_reads'];
      // list all metrics
      var metrics = ['mapped_reads', 'duplicates', 'singletons', 'proper_pairs', 'both_pairs_mapped', 'forward_strand', 
        'failed_qc', 'first_mates', 'last_read_position', 'paired_end_reads', 'reverse_strand', 'second_mates'];
      var distributions = ['baseq_hist', 'coverage_hist', 'mapq_hist', 'length_hist', 'frag_hist', 'refAln_hist'];
      var viz_data = { 'charts' : [] };
      // defaults
      viz_data.defaults = ['mapped_reads', 'singletons', 'proper_pairs', 'frag_hist', 'coverage_hist'];
      
      // reorganize data for metric pie charts
      metrics.forEach( function(metric) {
        viz_data.charts[metric] = { 'chartType' : 'pie', 'data' : [ data[metric], total_reads-data[metric] ] }
      })
      
      // reorganize data for distribution histogram charts
      distributions.forEach( function(distribution) {
        var d = Object.keys(data[distribution]).map(function(k) { return  [+k, +data[distribution][k]] });
        viz_data.charts[distribution] = { 'chartType' : 'histogram', 'data' : d }
      })

      return viz_data;
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


