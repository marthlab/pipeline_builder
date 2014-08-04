function pieD3() {
   var radius = 60;

   var arc = d3.svg.arc()
      .outerRadius(radius - 10)
      .innerRadius(radius - 17);
   
   var formatter = d3.format(",.1f"); 
   var commaFormatter = d3.format(",0f"); 
   var color = d3.scale.ordinal()
    .range(["#98abc5", "#8a89a6", "#7b6888", "#6b486b", "#a05d56", "#d0743c", "#ff8c00"]);

    var pie = d3.layout.pie()
      .sort(null)      

   function my(selection, options) {
      
      // var g = selection.enter().append("g")
      //    .attr("class", "arc")
      //    .attr("transform", "translate(75,75)");


      // calculate pie angles 
      var data = selection.enter()[0].map(function(d) { return d.__data__; } );
      var pieData = pie( data.map(function(d) { return d.number }));
      // add pie angles to data and bind
      data = data.map(function(d,i) { d['pie'] = pieData[i]; return d; })
      // var g = selection.data([0]).enter().append("g").attr("transform", "translate(75,75)");      
      
      var g = selection.select("g").data([0])

      var gEnter = g.enter().append("g")
            .attr("transform", "translate(75,75)");;

      // Otherwise, create the skeletal chart.
      // var gEnter = g.enter().append("g").attr("transform", "translate(75,75)");
      // pie.value(function(d) { return d.number; });

      // data.forEach(function(d) {
      //    d.number = +d.number;
      // });
      var gArc = g.selectAll(".arc").data(data).enter().append("g")
         .attr("class", "arc");


      gArc.append("path")
         .attr("d", function(d) { return arc(d.pie); })
         .style("fill", function(d) { return color(d.number); });

      g.selectAll(".name").data(data).enter().append("text")      
         .attr("class", "name")
         .attr("dy", ".35em")
         .style("text-anchor", "middle");

      if (options.title != undefined) {
        g.append("text")
        .attr("class", "title").text(options.title)
        .attr("text-anchor", "middle")
        .attr("transform", "translate(" + 0 + "," + parseInt(radius) + ")");  
      } 
         
      g.exit().remove();      
         
      g.selectAll("path")
         .attr("d", function(d) { return arc(d.pie); })

      g.selectAll(".name")
         .attr("transform", function(d) { return "translate(" + arc.centroid(d.pie) + ")"; })         
         .text(
            function(d) { 
               return d.name; 
         });  
     // moveToFront(selection.selectAll(".name"));    

   }

   my.radius = function(value) {
      if (!arguments.length) return radius;
      radius = value;
      arc = d3.svg.arc()
         .outerRadius(radius - 10)
         .innerRadius(radius - 17);
      return my;
   };

   my.outerRadius = function(value) {
      if (!arguments.length) return arc.outerRadius();
      arc.outerRadius(value)
      return my;
   };

   my.innerRadius = function(value) {
      if (!arguments.length) return arc.innerRadius();
      arc.innerRadius(value)
      return my;
   };
   
   my.color = function(value) {
      if (!arguments.length) return color();
      color = value;
      return my;
   };

   // moves selection to front of svg
    function moveToFront(selection) {
      return selection.each(function(){
         this.parentNode.appendChild(this);
      });
    }
   
   return my;
}

