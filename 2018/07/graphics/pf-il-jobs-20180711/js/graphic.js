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
}

/*
 * Format graphic data for processing by D3.
 */
var formatData = function () {
  DATA.forEach(function (d) {
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
      'name': column,
      'values': DATA.map(function (d) {
        return {
          'date': d['date'],
          'amt': d[column] / 1000
        };
        // filter out empty data. uncomment this if you have inconsistent data.
        //        }).filter(function(d) {
        //            return d['amt'] != null;
      })
    });
  }
}

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
    data: dataSeries
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
}

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
    right: 5,
    bottom: 20,
    left: 35
  };

  var ticksX = 5;
  var ticksY = 5;
  var roundTicksFactor = .2;

  // Mobile
  if (isMobile) {
    ticksX = 5;
    ticksY = 5;
    margins['right'] = 25;
  }

  // Calculate actual chart dimensions
  var chartWidth = config['width'] - margins['left'] - margins['right'];
  var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];
  chartHeight = Math.min(chartHeight, 350);

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config['container']);
  containerElement.html('');

  /*
   * Create D3 scale objects.
   */
  var xScale = d3.time.scale()
    .domain(d3.extent(config['data'][0]['values'], function (d) {
      return d['date'];
    }))
    .range([0, chartWidth])

  var min = d3.min(config['data'], function (d) {
    return d3.min(d['values'], function (v) {
      return Math.floor(v[valueColumn] / roundTicksFactor) * roundTicksFactor;
    })
  });

  // if (min > 0) {
  //     min = 0;
  // }

  min = 5.8;

  var max = d3.max(config['data'], function (d) {
    return d3.max(d['values'], function (v) {
      return Math.ceil(v[valueColumn] / roundTicksFactor) * roundTicksFactor;
    })
  });

  var yScale = d3.scale.linear()
    .domain([min, max])
    .range([chartHeight, 0]);

  var colorScale = d3.scale.ordinal()
    .domain(_.pluck(config['data'], 'name'))
    .range([COLORS['red3'], COLORS['yellow3'], COLORS['blue3'], COLORS['orange3'], COLORS['teal3']]);

  /*
   * Render the HTML legend.
   */
  // var legend = containerElement.append('ul')
  //   .attr('class', 'key')
  //   .selectAll('g')
  //   .data(config['data'])
  //   .enter().append('li')
  //   .attr('class', function (d, i) {
  //     return 'key-item ' + classify(d['name']);
  //   });

  // legend.append('b')
  //   .style('background-color', function (d) {
  //     return colorScale(d['name']);
  //   });

  // legend.append('label')
  //   .text(function (d) {
  //     return d['name'];
  //   });

  /*
   * Create the root SVG element.
   */
  var chartWrapper = containerElement.append('div')
    .attr('class', 'graphic-wrapper');

  var svg = chartWrapper.append('svg')
    .attr('width', chartWidth + margins['left'] + margins['right'])
    .attr('height', chartHeight + margins['top'] + margins['bottom']);

  var defs = svg.append('defs');

  var lgrad = defs.append('linearGradient')
    .attr('id', 'lgrad')
    .attr('x1', '50%')
    .attr('y1', '0%')
    .attr('x2', '50%')
    .attr('y2', '100%');

  // lgrad.append('stop')
  //   .attr('offset', '0%')
  //   .attr('style', 'stop-color:rgb(157,203,81);stop-opacity:1;');

  lgrad.append('stop')
    .attr('offset', '0%')
    .attr('style', 'stop-color:rgb(216,231,181);stop-opacity:1;');

  lgrad.append('stop')
    .attr('offset', '6.5%')
    .attr('style', 'stop-color:rgb(255,255,255);stop-opacity:1;');


  var chartElement = svg.append('g')
    .attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');

  /*
   * Create D3 axes.
   */
  var xAxis = d3.svg.axis()
    .scale(xScale)
    .orient('bottom')
    .ticks(ticksX)
    .tickFormat(function (d, i) {
      if (isMobile) {
        return '\u2019' + fmtYearAbbrev(d);
      } else {
        return fmtYearFull(d);
      }
    });

  var yAxis = d3.svg.axis()
    .scale(yScale)
    .orient('left')
    .ticks(ticksY)
    .tickFormat(function (d) {
      return d.toFixed(1) + "M"
    })

  /*
   * Render axes to chart.
   */
  chartElement.append('g')
    .attr('class', 'x axis')
    .attr('transform', makeTranslate(0, chartHeight))
    .call(xAxis);

  chartElement.append('g')
    .attr('class', 'y axis')
    .call(yAxis);

  /*
   * Render grid to chart.
   */
  var xAxisGrid = function () {
    return xAxis;
  }

  var yAxisGrid = function () {
    return yAxis;
  }

  chartElement.append('g')
    .attr('class', 'x grid')
    .attr('transform', makeTranslate(0, chartHeight))
    .call(xAxisGrid()
      .tickSize(-chartHeight, 0, 0)
      .tickFormat('')
    );

  chartElement.append('g')
    .attr('class', 'y grid')
    .call(yAxisGrid()
      .tickSize(-chartWidth, 0, 0)
      .tickFormat('')
    );

  /*
   * Render 0 value line.
   */
  if (min < 0) {
    chartElement.append('line')
      .attr('class', 'zero-line')
      .attr('x1', 0)
      .attr('x2', chartWidth)
      .attr('y1', yScale(0))
      .attr('y2', yScale(0));
  }

  /*
   * Render lines to chart.
   */
  var line = d3.svg.line()
    .interpolate('monotone')
    .x(function (d) {
      return xScale(d[dateColumn]);
    })
    .y(function (d) {
      return yScale(d[valueColumn]);
    });

  var area = d3.svg
    .area()
    // .interpolate('monotone')
    .x(function (d) {
      return xScale(d[dateColumn]);
    })
    .y0(yScale(0))
    .y1(function (d) {
      return yScale(d[valueColumn]);
    });

  var graphic = chartElement.append('g')
    .attr('class', 'main-graphic');



  var anno = graphic.append('g')
    .attr('class', 'annotation');

  anno.append('path')
    .attr('d',
      'M' + xScale(new Date('1/1/2015')) + ' ' + yScale(5.9) + ' ' +
      'L' + xScale(new Date('1/1/2015')) + ' ' + yScale(6.15) + ' ' +
      'L' + (xScale(new Date('1/1/2015')) + 20) + ' ' + yScale(6.15))
    .attr('stroke', '#888')
    .attr('stroke-width', '1.5px')
    .attr('fill', 'none');

  anno.append('text')
    .attr('x', xScale(new Date('1/4/2015')))
    .attr('y', yScale(6.15))
    .attr('dx', 5)
    .attr('dy', 15)
    .attr('fill', '#888')
    .attr('font-size', '13px')
    .text('Bruce Rauner becomes governor')
    .call(wrapText, 100, 15);

  // anno.append('line')
  //   .attr('x1', xScale(new Date('1/1/2015')))
  //   .attr('y1', yScale(5.9))
  //   .attr('x2', xScale(new Date('1/1/2015')))
  //   .attr('y2', yScale(6.15))
  //   .attr('stroke', '#888')
  //   .attr('stroke-width', '2px');

  // anno.append('line')
  //   .attr('x1', xScale(new Date('1/1/2015')))
  //   .attr('y1', yScale(6.15))
  //   .attr('x2', xScale(new Date('1/1/2015')) + 50)
  //   .attr('y2', yScale(6.15))
  //   .attr('stroke', '#888')
  //   .attr('stroke-width', '2px');


  graphic
    .append('clipPath')
    .attr('id', 'clipPath')
    .append('rect')
    .attr('width', chartWidth + 10)
    .attr('height', yScale(yScale.domain()[0]) - yScale(yScale.domain()[1]))
    .attr('x', -5)
    .attr('y', 0);

  graphic.append('g')
    .attr('class', 'area')
    .selectAll('path')
    .data(config['data'])
    .enter()
    .append('path')
    .attr('class', function (d, i) {
      return 'area ' + classify(d['name']);
    })
    .attr('stroke', function (d) {
      return colorScale(d['name']);
    })
    .attr('d', function (d) {
      return area(d['values']);
    });

  graphic.append('g')
    .attr('class', 'lines')
    .selectAll('path')
    .data(config['data'])
    .enter()
    .append('path')
    .attr('class', function (d, i) {
      return 'line ' + classify(d['name']);
    })
    .attr('stroke', function (d) {
      return colorScale(d['name']);
    })
    .attr('d', function (d) {
      return line(d['values']);
    });

  graphic.append('g')
    .attr('class', 'value')
    .selectAll('text')
    .data(config['data'])
    .enter().append('text')
    .attr('x', function (d, i) {
      var last = d['values'][d['values'].length - 1];

      return xScale(last[dateColumn]) + 5;
    })
    .attr('y', function (d) {
      var last = d['values'][d['values'].length - 1];

      return yScale(last[valueColumn]) + 3;
    })
    .text(function (d) {
      var last = d['values'][d['values'].length - 1];
      var value = last[valueColumn];

      var label = last[valueColumn].toFixed(1);

      // if (!isMobile) {
      //   label = d['name'] + ': ' + label;
      // }

      return label;
    });

}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;