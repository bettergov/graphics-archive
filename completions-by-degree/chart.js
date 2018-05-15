render(data[0], true)
for (var i=1; i < data.length; i++) {
  render(data[i], false);
};

function render(s, isLabeled) {

  function wrap(text, width) {
    text.each(function() {
        var text = d3.select(this),
            words = text.text().split(/\s+/).reverse(),
            word,
            line = [],
            lineNumber = 0,
            lineHeight = 1.1, // ems
            y = text.attr("y"),
            dy = parseFloat(text.attr("dy")),
            tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
        while (word = words.pop()) {
        line.push(word);
        tspan.text(line.join(" "));
        if (tspan.node().getComputedTextLength() > width) {
            line.pop();
            tspan.text(line.join(" "));
            line = [word];
            tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
        }
        }
    });
    }

  var margin = isLabeled ? {top: 20, right: 20, bottom: 50, left: 30} : {top: 20, right: 20, bottom: 50, left: 20},
      width = 90,
      height = 190,
      outerWidth = width + margin.right + margin.left,
      outerHeight = height + margin.top + margin.bottom;

  var svg = d3.select(".chart").append("svg").attr("id","degree-" + s.file).attr("width", outerWidth).attr("height", outerHeight),
      g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var parseTime = d3.timeParse("%Y"),
      formatPercent = d3.format(".0%"),
      formatId = function(d) { return d.toLowerCase().replace(/ /g, '_') }

  var sinceYear = 2000;

  var x = d3.scaleTime().range([0, width]),
      y = d3.scaleLinear().range([height, 0]);

  var line = d3.line()
      .curve(d3.curveBasis)
      .y(function(d) { return y(d.completions); })
      //.defined(function(d) { return d.completions; })
      .x(function(d) { return x(d.year); });

  d3.tsv("data-percents/" + s.file + ".tsv", type, function(error, data) {
    if (error) throw error;

    var colleges = data.columns.slice(1).map(function(id) {
      return {
        id: id,
        values: data.map(function(d) {
          return {year: d.year, completions: d[id]};
        })
      };
    });

    var defs = svg.append('svg:defs')

    var marker = defs.selectAll('marker')
      .data([{ id: 0, name: 'chicago', path: 'M 0, 0  m -3, 0  a 3,3 0 1,0 6,0  a 3,3 0 1,0 -6,0', viewbox: '-6 -6 12 12', color: '#EB332C' },
      { id: 1, name: 'rest_of_state', path: 'M 0, 0  m -3, 0  a 3,3 0 1,0 6,0  a 3,3 0 1,0 -6,0', viewbox: '-6 -6 12 12', color: 'darkgray' },
      { id: 2, name: 'arrowhead', path: "M0,0 L0,6 L6,0 L0,-6 Z", viewbox: '-6 -6 12 12', color: 'black' }])
      .enter()
      .append('svg:marker')
        .attr('id', function(d){ return 'marker_' + d.name})
        .attr('markerHeight', 6)
        .attr('markerWidth', 6)
        .attr('markerUnits', 'strokeWidth')
        .attr('orient', 'auto')
        .attr('refX', 0)
        .attr('refY', 0)
        .attr('viewBox', function(d){ return d.viewbox })
        .append('svg:path')
          .attr('d', function(d){ return d.path })
          .attr('fill', function(d){ return d.color });

    x.domain(d3.extent(data, function(d) { return d.year }));

    y.domain([0, .5])

    g.append("g")
        .attr("class", "axis x")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x)
        .tickFormat(function(date){
          if (date - parseTime("2000") == 0) {
            return d3.timeFormat('%Y')(date);
          } else {
            return d3.timeFormat('%y')(date);
          }
        })
        .tickValues([
          parseTime("2000"), 
          //parseTime("2005"),
          parseTime("2010"),
          parseTime("2016")
        ]))
        ;

    g.append("g")
        .attr("class", "axis y")
        .call(d3.axisLeft(y).ticks(5).tickFormat(formatPercent).tickSize(-width));
    
    g.append("text")
        .attr("class", "title")
        .attr("width", "100")
        .attr("transform", "translate(" + width/2 + "," + (height + margin.bottom - 15) + ")")
        .style("font", "bold 12px sans-serif")
        .style("text-anchor", "middle")
        .text( s.display );

    var college = g.selectAll(".college")
      .data(colleges)
      .enter().append("g")
        .attr("class", "college")
        .attr("id", function(d) { return formatId(d.id); });

    college.append("path")
        .attr("class", "line before")
        .attr("d", function(d) { return line(d.values); })
        //.attr("d", function(d) { return line(d.values.slice(0,11)); })
        //.attr('marker-end', function(d,i){ return 'url(#marker_' + formatId(d.id) + ')' });
        //.attr('marker-end', 'url(#marker_arrowhead)')
    
    /*college.append("path")
        .attr("class", "line after")
        .attr("d", function(d) { return line(d.values.slice(10,17)); })*/
        //.attr('marker-end', function(d,i){ return 'url(#marker_' + formatId(d.id) + ')' });
        //.attr('marker-end', 'url(#marker_arrowhead)')

    /*college.append("text")
        .datum(function(d) { return {id: d.id, value: d.values[d.values.length - 1]}; })
        .attr("transform", function(d) { return "translate(" + x(d.value.year) + "," + y(d.value.completions) + ")"; })
        .attr("x", 5)
        .attr("dy", "0.35em")
        .style("font", "10px sans-serif")
        .text(function(d) { return d.id.replace("Chicago", "City Colleges"); });*/

    /*g.append("path")
        .classed("label", true)
        .attr("d", "M" + (x(parseTime("2010")) - 15) + " 85 C 20 30, 40 25, " + (x(parseTime("2010")) - 10) + " 25")
        .attr("stroke", "black")
        .attr("fill", "none")
        .attr("marker-end", "url(#marker_arrowhead)");*/

    g.append("path")
        .classed("label", true)
        .attr("d", "M" + ((x(parseTime("2010")) + .5) + " " + (height + 6) + "V" + (height + 1) + " H" + (x(parseTime("2016")) + .5) + " V" + (height + 6) ))
        .attr("fill", "none")
        .attr("stroke", "black")
        .attr("stroke-width", "2px")

    g.append("text")
        .classed("label", true)
        .text("Reinvention")
        .attr("font-size", "10px")
        .attr("transform", "translate(" + x(parseTime("2013")) + "," + (height - 8) + ")")
        .attr("text-anchor", "middle")
        .attr("dy", ".2em")

    g.select("text.label")
        .call(wrap, 100)
    
  });

  function type(d, _, columns) {
    d.year = parseTime(d.year);
    for (var i = 1, n = columns.length, c; i < n; ++i) d[c = columns[i]] = +d[c];
    if (d.year >= parseTime(sinceYear)) return d;
  }
}

d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};

window.onload = function() {
  d3.selectAll("#chicago").moveToFront()
};