// Global vars
var pymChild = null;
var isMobile = false;
var dataSeries = [];

/*
 * Initialize the graphic.
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
    for (var key in d) {
      if (key != 'date' && d[key] != null && d[key].length > 0)
        d[key] = +d[key]
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
      'name': Number(column),
      'values': DATA.map(function (d) {
        return {
          'date': d['date'],
          'amt': d[column]
        };
        // filter out empty data. uncomment this if you have inconsistent data.
        //        }).filter(function(d) {
        //            return d['amt'] != null;
      })
    });
  }

  // DATA = DATA.filter(d => d.label == 2012);
  // console.log(dataSeries);
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
  renderDotChart({
    container: '#dot-chart',
    width: containerWidth,
    data: dataSeries
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
}

/*
 * Render a bar chart.
 */
var renderDotChart = function (config) {
  /*
   * Setup
   */
  var labelColumn = 'label';
  var valueColumn = 'amt';
  // var minColumn = 'min';
  // var maxColumn = 'max';

  var barHeight = 40;
  var barGap = 5;
  var labelWidth = 60;
  var labelMargin = 10;
  var valueMinWidth = 30;
  var dotRadius = 5;

  var margins = {
    top: 0,
    right: 20,
    bottom: 20,
    left: (labelWidth + labelMargin)
  };

  var ticksX = 4;
  var roundTicksFactor = 5;

  if (isMobile) {
    ticksX = 6;
    margins['right'] = 30;
  }

  // Calculate actual chart dimensions
  var chartWidth = config['width'] - margins['left'] - margins['right'];
  var chartHeight = ((barHeight + barGap) * config['data'].length);

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config['container']);
  containerElement.html('');

  /*
   * Create the root SVG element.
   */
  var chartWrapper = containerElement.append('div')
    .attr('class', 'graphic-wrapper');

  var chartElement = chartWrapper.append('svg')
    .attr('width', chartWidth + margins['left'] + margins['right'])
    .attr('height', chartHeight + margins['top'] + margins['bottom'])
    .append('g')
    .attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');

  /*
   * Create D3 scale objects.
   */
  var min = d3.min(config.data, d => d3.min(d.values, v => v.amt));
  var max = d3.max(config.data, d => d3.max(d.values, v => v.amt));
  // var extent = [min, max];

  var xScale = d3.scale.linear()
    .domain([min, max])
    .range([0, chartWidth]);

  var yScale = d3.scale.ordinal()
    .domain(config.data.map(d => d.name))
    .rangeRoundBands([0, chartHeight], barGap);

  console.log(yScale.domain());

  /*
   * Create D3 axes.
   */
  var xAxis = d3.svg.axis()
    .scale(xScale)
    .orient('bottom')
    .ticks(ticksX)
    .tickFormat(function (d) {
      return d / 1e6 + " million";
    });

  // var yAxis = d3.svg.axis()

  /*
   * Render axes to chart.
   */
  chartElement.append('g')
    .attr('class', 'x axis')
    .attr('transform', makeTranslate(0, chartHeight))
    .call(xAxis);

  /*
   * Render grid to chart.
   */
  var xAxisGrid = function () {
    return xAxis;
  };

  chartElement.append('g')
    .attr('class', 'x grid')
    .attr('transform', makeTranslate(0, chartHeight))
    .call(xAxisGrid()
      .tickSize(-chartHeight, 0, 0)
      .tickFormat('')
    );

  /*
   * Render range bars to chart.
   */
  // chartElement.append('g')
  //   .attr('class', 'bars')
  //   .selectAll('line')
  //   .data(config['data'])
  //   .enter()
  //   .append('line')
  //   .attr('x1', function (d, i) {
  //     return xScale(d[minColumn]);
  //   })
  //   .attr('x2', function (d, i) {
  //     return xScale(d[maxColumn]);
  //   })
  //   .attr('y1', function (d, i) {
  //     return i * (barHeight + barGap) + (barHeight / 2);
  //   })
  //   .attr('y2', function (d, i) {
  //     return i * (barHeight + barGap) + (barHeight / 2);
  //   });

  // console.log(config['data']);

  // var line = d3.svg.line()
  //   .interpolate('monotone')
  //   .x(function (d) {
  //     return xScale(d[dateColumn]);
  //   })
  //   .y(function (d) {
  //     return yScale(d[valueColumn]);
  //   });

  // chartElement.append('g')
  //   .attr('class', 'lines')
  //   .selectAll('path')
  //   .data(config['data'])
  //   .enter()
  //   .append('path')
  //       .attr('class', function(d, i) {
  //           return 'line ' + classify(d['name']);
  //       })
  //       .attr('stroke', function(d) {
  //           return colorScale(d['name']);
  //       })
  //       .attr('d', function(d) {
  //           return line(d['values']);
  //       });

  // /*
  //  * Render dots to chart.
  //  */
  chartElement.append('g')
    .attr('class', 'dots')
    .selectAll('circle')
    .data(config['data'])
    .enter().append('circle')
    .attr('cx', function (d, i) {
      return xScale(d.values[1][valueColumn]);
    })
    .attr('cy', function (d, i) {
      console.log(d.name);
      // return i * (barHeight + barGap) + (barHeight / 2);
      return yScale(d.name);
    })
    .attr('r', dotRadius)

  // /*
  //  * Render bar labels.
  //  */
  // containerElement
  //   .append('ul')
  //   .attr('class', 'labels')
  //   .attr('style', formatStyle({
  //     'width': labelWidth + 'px',
  //     'top': margins['top'] + 'px',
  //     'left': '0'
  //   }))
  //   .selectAll('li')
  //   .data(config['data'])
  //   .enter()
  //   .append('li')
  //   .attr('style', function (d, i) {
  //     return formatStyle({
  //       'width': labelWidth + 'px',
  //       'height': barHeight + 'px',
  //       'left': '0px',
  //       'top': (i * (barHeight + barGap)) + 'px;'
  //     });
  //   })
  //   .attr('class', function (d) {
  //     return classify(d[labelColumn]);
  //   })
  //   .append('span')
  //   .text(function (d) {
  //     return d[labelColumn];
  //   });

  // /*
  //  * Render bar values.
  //  */
  // _.each(['shadow', 'value'], function (cls) {
  //   chartElement.append('g')
  //     .attr('class', cls)
  //     .selectAll('text')
  //     .data(config['data'])
  //     .enter().append('text')
  //     .attr('x', function (d, i) {
  //       return xScale(d[maxColumn]) + 6;
  //     })
  //     .attr('y', function (d, i) {
  //       return i * (barHeight + barGap) + (barHeight / 2) + 3;
  //     })
  //     .text(function (d) {
  //       return d[valueColumn].toFixed(1) + '%';
  //     });
  // });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;