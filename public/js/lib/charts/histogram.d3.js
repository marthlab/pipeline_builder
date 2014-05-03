function histogramD3() {
  var margin = {top: 30, right: 20, bottom: 20, left: 50},
      width = 200,
      height = 100,
      defaults = {outliers:true,averageLine:true},
      xValue = function(d) { return d[0]; },
      yValue = function(d) { return d[1]; },
      x = d3.scale.linear(),
      y = d3.scale.linear(),
      xAxis = d3.svg.axis().scale(x).orient("bottom"),
      yAxis = d3.svg.axis().scale(y).orient("left").ticks(6),
      brush = d3.svg.brush().x(x);
      
  function chart(selection, options) {
    // merge options and defaults
    options = $.extend(defaults,options);
    var innerHeight = height - margin.top - margin.bottom;
    selection.each(function(data) {
       // set svg element
       var svg = d3.select(this);

      // Convert data to standard representation greedily;
      // this is needed for nondeterministic accessors.
      data = data.map(function(d, i) {return [xValue.call(data, d, i), yValue.call(data, d, i)];});
      
      // Remove outliers if wanted.
      if ( !options.outliers )
         data = removeOutliers(data);
         
      // Calculate average.
      var avg = [];
      if (options.averageLine) {
         var totalValue = 0, numValues = 0;
         for (var i=0, len = data.length; i < len; i++) { totalValue += data[i][0]*data[i][1]; numValues += data[i][1]; }
         avg = [totalValue / numValues];
      }

      // Update the x-scale.
      x  .domain(d3.extent(data, function(d) { return d[0]; }));
      x  .range([0, width - margin.left - margin.right]);
      
      // Check for single value x axis.
      if (x.domain()[0] == x.domain()[1]) { var v = x.domain()[0]; x.domain([v-5,v+5]);}

      // Update the y-scale.
      y  .domain([0, d3.max(data, function(d) { return d[1]; })])
      y  .range([innerHeight , 0]);

      // Select the g element, if it exists.
      var g = svg.selectAll("g").data([0]);

      // Otherwise, create the skeletal chart.
      var gEnter = g.enter().append("g");
      gEnter.append("g").attr("class", "x axis").attr("transform", "translate(0," + y.range()[0] + ")");
      gEnter.append("g").attr("class", "y axis");
      gEnter.append("g").attr("class", "x brush") 
      if (options.title != undefined) {
        gEnter.append("text")
        .attr("class", "title").text(options.title)
        .attr("text-anchor", "middle")
        .attr("transform", "translate(" + parseInt((width-margin.left-margin.right)/2) + "," + parseInt(height+margin.bottom) + ")");  
      }     
      

      // Update the outer dimensions.
      svg .attr("width", width)
          .attr("height", height);

      // Update the inner dimensions.
      g.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
      
      // Add avg line and text
      var half = x(x.domain()[0]+1) / 2;
      var avgLineG = gEnter.selectAll(".avg")
                .data(avg)
             .enter().append("g")
                .attr("class", "avg")
                .style("z-index", 100)
                .attr("transform", function(d) { return "translate(" + parseInt(x(d)+half) + "," + 0 + ")"; });
      
          avgLineG.append("line")
             .attr("x1", 0)
             .attr("x2", 0)
             .attr("y1", innerHeight)
             .attr("y2", -8);
      
          avgLineG.append("text")
                .text("avg")
                .attr("y", "-10");         
      

      // Add new bars groups.
      var bar = g.selectAll(".bar").data(data)
      var barEnter = bar.enter().append("g")
            .attr("class", "bar")
            .attr("transform", function(d) { return "translate(" + x(d[0]) + "," + innerHeight + ")"; });            
      
      //  Add new bars.
      barEnter.append("rect")
         .attr("x", 1)
         .style("z-index", 5)
         .attr("width", Math.max(x(x.domain()[0]+1),1))
         .attr("height", 0)
         .on("mouseover", function(d) {  
            div.transition()        
               .duration(200)      
               .style("opacity", .9);      
            div.html(d[0] + ", " + d[1])                                 
         .style("left", (d3.event.pageX) + "px") 
         .style("text-align", 'left')    
         .style("top", (d3.event.pageY - 24) + "px");    
         })                  
         .on("mouseout", function(d) {       
            div.transition()        
               .duration(500)      
               .style("opacity", 0);   
         });
         
      // Remove extra bar groups.
      bar.exit().remove();
               
      // Update bars groups.
      bar.transition()
         .duration(200)
         .attr("transform", function(d) { 
            return "translate(" + parseInt(x(d[0])) + "," + Math.floor(y(d[1])) + ")"; 
         });

      // Update bars.
      bar.select("rect").transition()
         .duration(200)
         .attr("width", Math.max(Math.ceil(x(x.domain()[0]+1)),1))
         .attr("height", function(d) { 
            return parseInt(d[0]) >= x.domain()[0] ? innerHeight - parseInt(y(d[1])) : 0; 
         });

      // Update the x-axis.
      g.select(".x.axis").transition()
          .duration(200)
          .call(xAxis);
          
      // Update the y-axis.
      g.select(".y.axis").transition()
         .duration(200)
         .call(yAxis);
         
      // Update avg line and text
      svg.selectAll(".avg").transition()
         .duration(200)
         .attr("transform", function(d) { return "translate(" + parseInt(x(d)+half) + "," + 0 + ")"; })
         .call(moveToFront);
            
      // Update brush if event has been set.
      if( brush.on("brushend") || brush.on("brushstart") || brush.on("brush")) {
         g.select(".x.brush").call(brush).call(moveToFront)
             .selectAll("rect")
               .attr("y", -6)
               .attr("height", innerHeight + 6);      
      }
      
    });
    // moves selection to front of svg
    function moveToFront(selection) {
      return selection.each(function(){
         this.parentNode.appendChild(this);
      });
    }
    
   function removeOutliers(data) {
      var q1 = quantile(data, 0.25); 
      var q3 = quantile(data, 0.75);
      var iqr = (q3-q1) * 1.5; //
      return data.filter(function(d) { return (d[0]>=(Math.max(q1-iqr,0)) && d[0]<=(q3+iqr)) });
   }
    
   function quantile(arr, p) {
      var length = arr.reduce(function(previousValue, currentValue, index, array){
         return previousValue + currentValue[1];
      }, 0) - 1;
      var H = length * p + 1, 
      h = Math.floor(H);

      var hValue, hMinus1Value, currValue = 0;
      for (var i=0; i < arr.length; i++) {
         currValue += arr[i][1];
         if (hMinus1Value == undefined && currValue >= (h-1))
            hMinus1Value = arr[i][0];
         if (hValue == undefined && currValue >= h) {
            hValue = arr[i][0];
            break;
         }
      } 
      var v = +hMinus1Value, e = H - h;
      return e ? v + e * (hValue - v) : v;
   } 
    
  }

  chart.margin = function(_) {
    if (!arguments.length) return margin;
    margin = _;
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) return width;
    width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return height;
    height = _;
    return chart;
  };

  chart.xValue = function(_) {
    if (!arguments.length) return xValue;
    xValue = _;
    return chart;
  };

  chart.yValue = function(_) {
    if (!arguments.length) return yValue;
    yValue = _;
    return chart;
  };
  
  chart.x = function(_) {
    if (!arguments.length) return x;
    x = _;
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) return y;
    y = _;
    return chart;
  };
    
  chart.xAxis = function(_) {
    if (!arguments.length) return xAxis;
    xAxis = _;
    return chart; 
  };

  chart.yAxis = function(_) {
    if (!arguments.length) return yAxis;
    yAxis = _;
    return chart; 
  };  
  
  chart.brush = function(_) {
    if (!arguments.length) return brush;
    brush = _;
    return chart; 
  };

  return chart;
}