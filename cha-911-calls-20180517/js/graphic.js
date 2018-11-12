// Global vars
var pymChild = null;
var isMobile = false;
var dataSeries = [];

/*
 * Initialize graphic
 */
var onWindowLoaded = function() {
  if (Modernizr.svg) {
    formatData();

    pymChild = new pym.Child({
      renderCallback: render
    });
  } else {
    pymChild = new pym.Child({});
  }

  pymChild.onMessage('on-screen', function(bucket) {
    ANALYTICS.trackEvent('on-screen', bucket);
  });
  pymChild.onMessage('scroll-depth', function(data) {
    data = JSON.parse(data);
    ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
  });
};

/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
  DATA.forEach(function(d) {
    d['date'] = d3.time.format('%m/%d/%y').parse(d['date']);

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
      values: DATA.map(function(d, i) {
        var first = DATA[0][column];
        return {
          date: d['date'],
          amt: d[column],
          percent: (d[column] - first) / first
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
var render = function(containerWidth) {
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
    width: containerWidth / 2,
    data: [dataSeries[0]]
  });

  renderLineChart({
    container: '#line-chart-2',
    width: containerWidth / 2,
    data: [dataSeries[1]]
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

/*
 * Render a line chart.
 */
var renderLineChart = function(config) {
  /*
   * Setup
   */
  var dateColumn = 'date';
  var valueColumn = 'percent';

  // var aspectWidth = isMobile ? 4 : 16;
  // var aspectHeight = isMobile ? 3 : 9;
  var aspectWidth = 4;
  var aspectHeight = 3;

  var margins = {
    top: 15,
    right: 40,
    bottom: 20,
    left: 40
  };

  // var ticksX = 10;
  var ticksX = 5;
  var ticksY = 5;
  var roundTicksFactor = 0.1;
  var tickValuesY = [0, 0.2, 0.4, 0.6, 0.8];

  if (isMobile) {
    // ticksX = 5;
    // ticksY = 5;
    // margins['right'] = 40;
    tickValuesY = [0, 0.4, 0.8];
  }

  // Calculate actual chart dimensions
  var chartWidth = config['width'] - margins['left'] - margins['right'];
  var chartHeight =
    Math.ceil(config['width'] * aspectHeight / aspectWidth) -
    margins['top'] -
    margins['bottom'];

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config['container']);
  containerElement.html('');

  /*
   * Create D3 scale objects.
   */
  var xScale = d3.time
    .scale()
    .domain(
      d3.extent(config['data'][0]['values'], function(d) {
        return d['date'];
      })
    )
    .range([0, chartWidth]);

  var min = d3.min(config['data'], function(d) {
    return d3.min(d['values'], function(v) {
      return Math.floor(v[valueColumn] / roundTicksFactor) * roundTicksFactor;
    });
  });

  // if (min > 0) {
  //   min = 0;
  // }

  var max = d3.max(config['data'], function(d) {
    return d3.max(d['values'], function(v) {
      return Math.ceil(v[valueColumn] / roundTicksFactor) * roundTicksFactor;
    });
  });

  min = -0.05;
  max = 0.8;

  var yScale = d3.scale
    .linear()
    .domain([min, max])
    .range([chartHeight, 0])
    .nice();

  var min = d3.min(config['data'], function(d) {
    return d3.min(d['values'], function(v) {
      return Math.floor(v['amt'] / roundTicksFactor) * roundTicksFactor;
    });
  });

  // if (min > 0) {
  //   min = 0;
  // }

  var max = d3.max(config['data'], function(d) {
    return d3.max(d['values'], function(v) {
      return Math.ceil(v['amt'] / roundTicksFactor) * roundTicksFactor;
    });
  });

  var yScaleRight = d3.scale
    .linear()
    .domain([min, max])
    .range([chartHeight, 0])
    .nice();

  var colorScale = d3.scale
    .ordinal()
    .domain(_.pluck(config['data'], 'name'))
    .range([
      COLORS['red3'],
      COLORS['yellow3'],
      COLORS['blue3'],
      COLORS['orange3'],
      COLORS['teal3']
    ]);

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
  //   .attr('class', function(d, i) {
  //     return 'key-item ' + classify(d['name']);
  //   });

  // legend.append('b').style('background-color', function(d) {
  //   return colorScale(d['name']);
  // });

  // legend.append('label').text(function(d) {
  //   return d['name'];
  // });

  var title = containerElement
    .append('div')
    .attr('class', 'title')
    .selectAll('g')
    .data(config['data'])
    .enter()
    .append('b')
    .text(function(d) {
      return d['name'];
    });

  /*
   * Create the root SVG element.
   */
  var chartWrapper = containerElement
    .append('div')
    .attr('class', 'graphic-wrapper');

  var svg = chartWrapper
    .append('svg')
    .attr('width', chartWidth + margins['left'] + margins['right'])
    .attr('height', chartHeight + margins['top'] + margins['bottom']);

  var defs = svg.append('defs');

  defs
    .append('marker')
    .attr('id', 'markerCircle')
    .attr('markerWidth', 6)
    .attr('markerHeight', 6)
    .attr('refX', 3)
    .attr('refY', 3)
    .append('circle')
    .attr('cx', 3)
    .attr('cy', 3)
    .attr('r', 1.5)
    .attr('style', 'stroke: #fff; fill: #D8472B; stroke-width: .5px;');

  defs
    .append('marker')
    .attr('id', 'markerCircleOpen')
    .attr('markerWidth', 6)
    .attr('markerHeight', 6)
    .attr('refX', 3)
    .attr('refY', 3)
    .append('circle')
    .attr('cx', 3)
    .attr('cy', 3)
    .attr('r', 1.25)
    .attr('style', 'stroke: #D8472B; fill: #fff; stroke-width: .75px;');

  var chartElement = svg
    .append('g')
    .attr(
      'transform',
      'translate(' + margins['left'] + ',' + margins['top'] + ')'
    );

  /*
   * Create D3 axes.
   */
  var xAxis = d3.svg
    .axis()
    .scale(xScale)
    .orient('bottom')
    .tickValues([new Date('1/1/2014'), new Date('1/1/2017')])
    .tickSize(0)
    .tickFormat(function(d, i) {
      if (isMobile) {
        return '\u2019' + fmtYearAbbrev(d);
      } else {
        return fmtYearFull(d);
      }
    });

  var yAxis = d3.svg
    .axis()
    .scale(yScale)
    .orient('left')
    // .ticks(ticksY)
    .tickValues(tickValuesY)
    .tickFormat(function(d) {
      if (d != 0) {
        return '+' + d * 100 + '%';
      } else {
        return '0%';
      }
    });

  var yAxisRight = d3.svg
    .axis()
    .scale(yScaleRight)
    .orient('right')
    .ticks(5);

  /*
   * Render axes to chart.
   */
  chartElement
    .append('g')
    .attr('class', 'x axis')
    .attr('transform', makeTranslate(0, chartHeight))
    .call(xAxis);

  chartElement
    .append('g')
    .attr('class', 'y axis left')
    .call(yAxis);

  // chartElement
  //   .append('g')
  //   .attr('class', 'y axis right')
  //   .attr('transform', makeTranslate(chartWidth + 10, 0))
  //   .call(yAxisRight);

  /*
   * Render grid to chart.
   */
  var xAxisGrid = function() {
    return xAxis;
  };

  var yAxisGrid = function() {
    return yAxis;
  };

  // chartElement
  //   .append('g')
  //   .attr('class', 'x grid')
  //   .attr('transform', makeTranslate(0, chartHeight))
  //   .call(
  //     xAxisGrid()
  //       .tickSize(-chartHeight, 0, 0)
  //       .tickFormat('')
  //   );

  chartElement
    .append('g')
    .attr('class', 'y grid')
    .call(
      yAxisGrid()
        .tickSize(-chartWidth, 0, 0)
        .tickFormat('')
    );

  /*
   * Render 0 value line.
   */
  if (min < 0) {
    chartElement
      .append('line')
      .attr('class', 'zero-line')
      .attr('x1', 0)
      .attr('x2', chartWidth)
      .attr('y1', yScale(0))
      .attr('y2', yScale(0));
  }

  /*
   * Render lines to chart.
   */
  var line = d3.svg
    .line()
    // .interpolate('monotone')
    .x(function(d) {
      return xScale(d[dateColumn]);
    })
    .y(function(d) {
      return yScale(d[valueColumn]);
    });

  chartElement
    .append('g')
    .attr('class', 'lines')
    .selectAll('path')
    .data(config['data'])
    .enter()
    .append('path')
    .attr('class', function(d, i) {
      return 'line ' + classify(d['name']);
    })
    .attr('stroke', function(d) {
      return colorScale(d['name']);
    })
    .attr('d', function(d) {
      return line(d['values']);
    });

  chartElement
    .append('g')
    .attr('class', 'value')
    .selectAll('text')
    .data(config['data'])
    .enter()
    .append('text')
    .attr('x', function(d, i) {
      var first = d['values'][0];

      return xScale(first[dateColumn]) - 5;
    })
    .attr('y', function(d) {
      var first = d['values'][0];

      return yScale(first[valueColumn]) - 10;
    })
    .text(function(d) {
      var first = d['values'][0];
      var value = first[valueColumn];

      var label = first.amt;

      return label.toLocaleString() + ' calls';
    });

  chartElement
    .append('g')
    .attr('class', 'value')
    .selectAll('text')
    .data(config['data'])
    .enter()
    .append('text')
    .attr('x', function(d, i) {
      var last = d['values'][d['values'].length - 1];

      return xScale(last[dateColumn]);
    })
    .attr('y', function(d) {
      var last = d['values'][d['values'].length - 1];

      return yScale(last[valueColumn]) - 7;
    })
    .attr('text-anchor', 'start')
    .text(function(d) {
      var last = d['values'][d['values'].length - 1];
      var value = last[valueColumn];

      var label = last.amt;

      return label.toLocaleString();
    });
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
