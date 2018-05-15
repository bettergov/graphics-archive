var schools = JSON.parse(data);

for (s in schools) {
  render(schools[s]);
};

function render(s) {

  function compare(a, b) {
    // Use toUpperCase() to ignore character casing
    const valA = a.values[a.values.length - 1].value;
    const valB = b.values[b.values.length - 1].value;

    let comparison = 0;
    if (valA > valB) {
      comparison = 1;
    } else if (valA < valB) {
      comparison = -1;
    }
    return comparison;
  }

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
  

  var format = d3.time.format("%Y"),
      formatId = function(d) { return d.toLowerCase().replace(/ /g, '_') };

  var margin = {top: 30, right: 75, bottom: 20, left: 30},
      width = 225 - margin.left - margin.right,
      height = 250 - margin.top - margin.bottom;

  var x = d3.time.scale()
      .range([0, width]);

  var y = d3.scale.linear()
      .range([height, 0]);

  var z = d3.scale.category20c();

  var xAxis = d3.svg.axis()
      .scale(x)
      .orient("bottom")
      .tickFormat(function(date){
        if (date - format.parse("2003") == 0) {
          return d3.time.format('%Y')(date);
        } else {
          return d3.time.format('%y')(date);
        }
      })
      .tickValues([
        format.parse("2003"),
        format.parse("2010"),
        format.parse("2016")
      ]);

  var yAxis = d3.svg.axis()
      .scale(y)
      .orient("left")
      .ticks(5)
      .tickSize(-width);

  var stack = d3.layout.stack()
      .offset("zero")
      .values(function(d) { return d.values; })
      .x(function(d) { return d.date; })
      .y(function(d) { return d.value; });

  var nest = d3.nest()
      .key(function(d) { return d.key; });

  var area = d3.svg.area()
      .interpolate("cardinal")
      .x(function(d) { return x(d.date); })
      .y0(function(d) { return y(d.y0); })
      .y1(function(d) { return y(d.y0 + d.y); });

  var labelDict = {
      "AA": "Arts",
      "AS": "Science",
      "AAS": "Applied Science",
      "AGS": "General Studies",
      "AES": "Engineering Science",
      "AFA": "Fine Arts"
  }

  var svg = d3.select(".chart").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .attr("id", s.file)
      .classed("campus", true);
    
  var bound = svg.append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  d3.tsv("data-stacked/" + s.file + '.tsv', function(error, data) {
    if (error) throw error;

    data.forEach(function(d) {
      d.date = format.parse(d.date);
      d.value = +d.value;
    });

    var layers = stack(nest.entries(data).sort(compare));

    x.domain(d3.extent(data, function(d) { return d.date; }));
    y.domain([0, 1100]);

    bound.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + (height + 1) + ")")
        .call(xAxis);

    bound.append("g")
        .attr("class", "y axis")
        .call(yAxis);

    var chart = bound.append("g")
        .classed("chart", true);

    var degree = chart.selectAll(".degree")
        .data(layers)
        .enter().append("g")
        .classed("degree", true)
        .attr("id", function(d) { return formatId(d.key); });

    /*var chart = bound.append("g")
        .attr("class", "chart")
        .selectAll()
        .data(layers);*/

    degree.append("path")
        .attr("class", "degree")
        .attr("d", function(d) { return area(d.values); });

    degree.append("text")
        .datum(function(d) { return {key: d.key, value: d.values[d.values.length - 1]}; })
        .attr("transform", function(d) { return "translate(" + x(d.value.date) + "," + y(d.value.y0 + d.value.y/2) + ")"; })
        .attr("x", 3)
        .attr("dy", "0.35em")
        .attr("class", "label")
        .text(function(d) {
          if (d.value.value > 10) return labelDict[d.key];
        });
    
    var top = Math.max(layers[layers.length - 1].values[6].y0 + layers[layers.length - 1].values[6].y, layers[layers.length - 1].values[7].y0 + layers[layers.length - 1].values[7].y);

    bound.append("rect")
        .attr('fill', 'white')
        .attr('x', x(format.parse("2009")) + 2)
        .attr('y', y(top))
        .attr('width', 6)
        .attr('height', height - y(top));
    
    bound.append("path")
        .classed("reinventionLabel", true)
        .attr("d", "M" + (x(format.parse("2008")) - 15) + " 80 C 30 90, 30 100, " + (x(format.parse("2010")) - 8) + " 112")
        .attr("stroke", "black")
        .attr("fill", "none")
        .attr("marker-end", "url(#marker_arrowhead)");

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

    bound.append("text")
        .classed("reinventionLabel", true)
        .text("Reinvention")
        .attr("font-size", "10px")
        .attr("transform", "translate(" + x(format.parse("2007")) + "," + ((height/3) + 5) + ")")
        .attr("text-anchor", "middle")
        .attr("dy", ".2em")
  });

  var title = svg.append("text")
      .attr("class", "title")
      .text(s.display)
      .attr("transform", "translate(" + margin.left + ", 15)");
  var focus = svg.append("text")
    .classed("focus", true)
    .attr("transform", "translate(" + margin.left + ", 0)")
    .attr("y", 25)
    .attr("dy", ".5em")
    .text(s.focus);

  svg.selectAll(".focus")
    .call(wrap, width);
}