// Global vars
var pymChild = null;
var isMobile = false;
var dataSeries = [];

/*
 * Initialize graphic
 */
var onWindowLoaded = function () {
  if (Modernizr.svg) {
    formatData();

    pymChild = new pym.Child({
      renderCallback: render
    });
  } else {
    pymChild = new pym.Child({});
  }

  pymChild.onMessage('on-screen', function (bucket) {
    ANALYTICS.trackEvent('on-screen', bucket);
  });
  pymChild.onMessage('scroll-depth', function (data) {
    data = JSON.parse(data);
    ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
  });
};

/*
 * Format graphic data for processing by D3.
 */
var formatData = function () {
  DATA.forEach(function (d) {
    var parseTime = d3.timeParse('%m/%d/%y');
    d['date'] = parseTime(d['date']);

    for (var key in d) {
      if (key != 'date' && d[key] != null && d[key].length > 0) {
        d[key] = +d[key];
      }
    }
  });

  /*
   * Restructure tabular data for easier charting.
   */
  for (var column in DATA[0]) {
    if (column == 'date') {
      continue;
    }

    dataSeries.push({
      name: column,
      values: DATA.map(function (d) {
        return {
          date: d['date'],
          amt: d[column] / 1e3
        };
        // filter out empty data. uncomment this if you have inconsistent data.
        //        }).filter(function(d) {
        //            return d['amt'] != null;
      })
    });
  }
};

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function (containerWidth) {
  if (!containerWidth) {
    containerWidth = DEFAULT_WIDTH;
  }

  if (containerWidth <= MOBILE_THRESHOLD) {
    isMobile = true;
  } else {
    isMobile = false;
  }

  // Render the chart!
  renderLineChart({
    container: '#line-chart',
    width: containerWidth,
    data: DATA
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

/*
 * Render a line chart.
 */
var renderLineChart = function (config) {
  /*
   * Setup
   */
  var dateColumn = 'date';
  var valueColumn = 'amt';

  var aspectWidth = isMobile ? 4 : 16;
  var aspectHeight = isMobile ? 3 : 9;

  var margins = {
    top: 5,
    right: 75,
    bottom: 20,
    left: 30
  };

  var ticksX = 10;
  var ticksY = 10;
  var roundTicksFactor = 5;

  // Mobile
  if (isMobile) {
    ticksX = 5;
    ticksY = 5;
    margins['right'] = 25;
  }

  // Calculate actual chart dimensions
  var chartWidth = config['width'] - margins['left'] - margins['right'];
  var chartHeight =
    Math.ceil((config['width'] * aspectHeight) / aspectWidth) -
    margins['top'] -
    margins['bottom'];

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config['container']);
  containerElement.html('');

  /*
   * Create D3 scale objects.
   */
  // var xScale = d3
  //   .scaleTime()
  //   .domain(
  //     d3.extent(config['data'][0]['values'], function (d) {
  //       return d['date'];
  //     })
  //   )
  //   .range([0, chartWidth]);

  // var min = d3.min(config['data'], function (d) {
  //   return d3.min(d['values'], function (v) {
  //     return Math.floor(v[valueColumn] / roundTicksFactor) * roundTicksFactor;
  //   });
  // });

  // if (min > 0) {
  //   min = 0;
  // }

  // var max = d3.max(config['data'], function (d) {
  //   return d3.max(d['values'], function (v) {
  //     return Math.ceil(v[valueColumn] / roundTicksFactor) * roundTicksFactor;
  //   });
  // });

  // var yScale = d3
  //   .scaleLinear()
  //   .domain([min, max])
  //   .range([chartHeight, 0]);

  // var colorScale = d3
  //   .scaleOrdinal()
  //   .domain(_.pluck(config['data'], 'name'))
  //   .range([
  //     COLORS['red3'],
  //     COLORS['yellow3'],
  //     COLORS['blue3'],
  //     COLORS['orange3'],
  //     COLORS['teal3']
  //   ]);

  /*
   * Render the HTML legend.
   */
  // var legend = containerElement
  //   .append('ul')
  //   .attr('class', 'key')
  //   .selectAll('g')
  //   .data(config['data'])
  //   .enter()
  //   .append('li')
  //   .attr('class', function (d, i) {
  //     return 'key-item ' + classify(d['name']);
  //   });

  // legend.append('b').style('background-color', function (d) {
  //   return colorScale(d['name']);
  // });

  // legend.append('label').text(function (d) {
  //   return d['name'];
  // });

  /*
   * Create the root SVG element.
   */
  var chartWrapper = containerElement
    .append('div')
    .attr('class', 'graphic-wrapper');

  var chartElement = chartWrapper
    .append('svg')
    .attr('width', chartWidth + margins['left'] + margins['right'])
    .attr('height', chartHeight + margins['top'] + margins['bottom'])
    .append('g')
    .attr(
      'transform',
      'translate(' + margins['left'] + ',' + margins['top'] + ')'
    );

  var x = d3
    .scaleTime()
    .range([0, chartWidth]);

  var y = d3
    .scaleLinear()
    .range([chartHeight, 0]);

  var z = d3.scaleOrdinal([
    COLORS['red3'],
    COLORS['yellow3'],
    COLORS['blue3'],
    COLORS['orange3'],
    COLORS['teal3']
  ]);

  var stack = d3.stack();

  var area = d3.area()
    .x(function (d, i) { return x(d.data.date); })
    .y0(function (d) { return y(d[0]); })
    .y1(function (d) { return y(d[1]); });

  // var keys = config['data'].columns.slice(1);

  var data = window.data = config['data'];

  var keys = ['full-day', 'half-day'];

  x.domain(d3.extent(data, function (d) { return d.date; }));

  var min = d3.min(data, function (d) {
    return d['half-day'] + d['full-day'];
  });

  if (min > 0) {
    min = 0;
  }

  var max = d3.max(config['data'], function (d) {
    return d['half-day'] + d['full-day'];
  });

  y.domain([min, max]);

  z.domain(keys);
  stack.keys(keys);

  console.log(stack(data));

  var layer = chartElement.selectAll('.layer')
    .data(stack(data))
    .enter().append('g')
    .attr('class', 'layer');

  layer.append("path")
    .attr("class", "area")
    .style("fill", function (d) { return z(d.key); })
    .attr("d", area);

  layer.filter(function (d) { return d[d.length - 1][1] - d[d.length - 1][0] > 0.01; })
    .append("text")
    .attr("x", chartWidth - 6)
    .attr("y", function (d) { return y((d[d.length - 1][0] + d[d.length - 1][1]) / 2); })
    .attr("dy", ".35em")
    .style("font", "10px sans-serif")
    .style("text-anchor", "end")
    .text(function (d) { return d.key; });

  chartElement.append("g")
    .attr("class", "axis axis--x")
    .attr("transform", "translate(0," + chartHeight + ")")
    .call(d3.axisBottom(x));

  chartElement.append("g")
    .attr("class", "axis axis--y")
    .call(d3.axisLeft(y).ticks(ticksY).tickFormat(function (d) { return d / 1e3; }));

  /*
   * Create D3 axes.
   */
  // var xAxis = d3
  //   .axisBottom(xScale)
  //   .ticks(ticksX)
  //   .tickFormat(function (d, i) {
  //     if (isMobile) {
  //       return '\u2019' + fmtYearAbbrev(d);
  //     } else {
  //       return fmtYearFull(d);
  //     }
  //   });

  // var yAxis = d3.axisLeft(yScale).ticks(ticksY);

  // /*
  //  * Render axes to chart.
  //  */
  // chartElement
  //   .append('g')
  //   .attr('class', 'x axis')
  //   .attr('transform', makeTranslate(0, chartHeight))
  //   .call(xAxis);

  // chartElement
  //   .append('g')
  //   .attr('class', 'y axis')
  //   .call(yAxis);

  // /*
  //  * Render grid to chart.
  //  */
  // var xAxisGrid = function () {
  //   return xAxis;
  // };

  // var yAxisGrid = function () {
  //   return yAxis;
  // };

  // chartElement
  //   .append('g')
  //   .attr('class', 'x grid')
  //   .attr('transform', makeTranslate(0, chartHeight))
  //   .call(
  //     xAxisGrid()
  //       .tickSize(-chartHeight, 0, 0)
  //       .tickFormat('')
  //   );

  // chartElement
  //   .append('g')
  //   .attr('class', 'y grid')
  //   .call(
  //     yAxisGrid()
  //       .tickSize(-chartWidth, 0, 0)
  //       .tickFormat('')
  //   );

  // /*
  //  * Render 0 value line.
  //  */
  // if (min < 0) {
  //   chartElement
  //     .append('line')
  //     .attr('class', 'zero-line')
  //     .attr('x1', 0)
  //     .attr('x2', chartWidth)
  //     .attr('y1', yScale(0))
  //     .attr('y2', yScale(0));
  // }

  // /*
  //  * Render lines to chart.
  //  */
  // // var line = d3
  // //   .line()
  // //   .curve(d3.curveBasis)
  // //   .x(function (d) {
  // //     return xScale(d[dateColumn]);
  // //   })
  // //   .y(function (d) {
  // //     return yScale(d[valueColumn]);
  // //   });

  // var stack = d3.stack();

  // var area = d3.area()
  //   .x(function (d) { return xScale(d[dateColumn]) })
  //   .y1(function (d) { return yScale(d[0]) })
  //   .y0(yScale(d[1]));

  // chartElement
  //   .append('g')
  //   .attr('class', 'area')
  //   .selectAll('path')
  //   .datum(config['data'])
  //   .enter()
  //   .append('path')
  //   .attr('fill', 'steelblue')
  //   .attr('d', function (d) { return area(d['values']); });

  // // chartElement
  // //   .append('g')
  // //   .attr('class', 'lines')
  // //   .selectAll('path')
  // //   .data(config['data'])
  // //   .enter()
  // //   .append('path')
  // //   .attr('class', function (d, i) {
  // //     return 'line ' + classify(d['name']);
  // //   })
  // //   .attr('stroke', function (d) {
  // //     return colorScale(d['name']);
  // //   })
  // //   .attr('d', function (d) {
  // //     return line(d['values']);
  // //   });

  // chartElement
  //   .append('g')
  //   .attr('class', 'value')
  //   .selectAll('text')
  //   .data(config['data'])
  //   .enter()
  //   .append('text')
  //   .attr('x', function (d, i) {
  //     var last = d['values'][d['values'].length - 1];

  //     return xScale(last[dateColumn]) + 5;
  //   })
  //   .attr('y', function (d) {
  //     var last = d['values'][d['values'].length - 1];

  //     return yScale(last[valueColumn]) + 3;
  //   })
  //   .text(function (d) {
  //     var last = d['values'][d['values'].length - 1];
  //     var value = last[valueColumn];

  //     var label = last[valueColumn].toFixed(1);

  //     if (!isMobile) {
  //       label = d['name'] + ': ' + label;
  //     }

  //     return label;
  //   });
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
