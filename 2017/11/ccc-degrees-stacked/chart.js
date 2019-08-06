var schools = JSON.parse(data);

render(schools[0]);

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

  var format = d3.time.format("%Y");

  var margin = {top: 20, right: 75, bottom: 30, left: 40},
      width = 250 - margin.left - margin.right,
      height = 250 - margin.top - margin.bottom;

  var x = d3.time.scale()
      .range([0, width]);

  var y = d3.scale.linear()
      .range([height, 0]);

  var z = d3.scale.category20c();

  var xAxis = d3.svg.axis()
      .scale(x)
      .orient("bottom")
      .tickValues([
        format.parse("2003"),
        format.parse("2011"),
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
      "AGS": "Liberal Studies",
      "AES": "Engineering Science",
      "AFA": "Fine Arts"
  }

  var svg = d3.select(".chart").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .attr("id", s.file)
    .append("g")
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

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis);

    var chart = svg.append("g")
        .attr("class", "chart")
        .selectAll()
        .data(layers);

    chart.enter().append("path")
        .attr("class", "degree")
        .attr("id", function(d) { return d.key.toLowerCase(); })
        .attr("d", function(d) { return area(d.values); });
        //.style("fill", function(d, i) { return z(i); });

    var labels = svg.append("g")
        .attr("class", "labels")
        .selectAll()
        .data(layers);

    labels.enter().append("text")
        .datum(function(d) { return {key: d.key, value: d.values[d.values.length - 1]}; })
        .attr("transform", function(d) { return "translate(" + x(d.value.date) + "," + y(d.value.y0 + d.value.y/2) + ")"; })
        .attr("x", 3)
        .attr("dy", "0.35em")
        .attr("class", "label")
        .style("font", "10px sans-serif")
        .text(function(d) {
          if (d.value.value > 10) return labelDict[d.key];
        });
    
    svg.append("g")
      .attr("class", "divider")
      .call(d3.svg.axis()
      .scale(x)
      .orient("bottom")
      .tickValues([
        format.parse("2011")
      ])
      .tickFormat(function(d) { return "" })
      .tickSize(height));

  });

  var title = svg.append("text")
      .attr("class", "title")
      .attr("height", 20)
      .text(s.display);

}