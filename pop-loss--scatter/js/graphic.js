// Global vars
var pymChild = null;
var isMobile = false;

/*
 * Initialize the graphic.
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
var xColumn = '"Tax Climate" rank',
  yColumn = 'Population growth since 2010';

var xFormat = function(d) {
    return d;
  },
  yFormat = function(d) {
    return d * 100 + '%';
  };

var formatData = function() {
  DATA.forEach(function(d) {
    d.x = +d[xColumn];
    d.y = +d[yColumn];
    d.x2 = d.x * d.x;
    d.xy = d.x * d.y;
  });
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
  renderDotChart({
    container: '#dot-chart',
    width: containerWidth,
    data: DATA
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

/*
 * Render a bar chart.
 */
var renderDotChart = function(config) {
  /*
   * Setup
   */
  var dotRadius = 7;

  var margins = {
    top: 20,
    right: 30,
    bottom: 45,
    // left: (labelWidth + labelMargin)
    left: 120
  };

  var ticksX = 6,
    ticksY = 5;

  if (isMobile) {
    ticksX = 4;
    dotRadius = 5;
  }

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right,
    chartHeight;
  if (isMobile) {
    chartHeight = chartWidth;
  } else {
    chartHeight = 300;
  }

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html('');

  /*
   * Create the root SVG element.
   */
  var chartWrapper = containerElement
    .append('div')
    .attr('class', 'graphic-wrapper');

  var chartElement = chartWrapper
    .append('svg')
    .attr('width', chartWidth + margins.left + margins.right)
    .attr('height', chartHeight + margins.top + margins.bottom)
    .append('g')
    .attr('transform', 'translate(' + margins.left + ',' + margins.top + ')');

  var tooltip = containerElement
    .append('div')
    .style('position', 'absolute')
    .style('z-index', '10')
    .style('visibility', 'hidden')
    .text('a simple tooltip')
    .attr('class', 'tooltip');

  var fixedTooltip = containerElement
    .append('div')
    .style('position', 'absolute')
    .style('z-index', '9')
    .attr('class', 'tooltip')
    .text('Illinois');

  var fixedTooltip2 = containerElement
    .append('div')
    .style('position', 'absolute')
    .style('z-index', '9')
    .attr('class', 'tooltip')
    .text('Minnesota');

  /*
   * Create D3 scale objects.
   */
  var xDomain = [0, 50];

  var yDomain = d3.extent(config.data, function(d) {
    return d.y;
  });

  var xScale = d3
    .scaleLinear()
    .domain(xDomain)
    .nice()
    .range([0, chartWidth]);

  var yScale = d3
    .scaleLinear()
    .domain(yDomain)
    .nice()
    .range([chartHeight, 0]);

  /*
   * Create D3 axes.
   */
  var xAxis = d3
    .axisBottom(xScale)
    .ticks(ticksX)
    .tickFormat(xFormat);

  var yAxis = d3
    .axisLeft(yScale)
    .ticks(ticksY)
    .tickFormat(yFormat);

  /*
   * Line constructor.
   */
  var line = d3
    .line()
    .x(function(d) {
      return xScale(d[0]);
    })
    .y(function(d) {
      return yScale(d[1]);
    });

  /*
   * Function calculating the best fit line using least squares
   * regression. Returns data to be fed to line.
   */
  var bestFitData = function(data) {
    var N = data.length;
    var sumColumn = function(col) {
      var slope = d3.sum(data, function(d) {
        return d[col];
      });
      return slope;
    };

    // https://www.mathsisfun.com/data/least-squares-regression.html
    var m =
      (N * sumColumn('xy') - sumColumn('x') * sumColumn('y')) /
      (N * sumColumn('x2') - sumColumn('x') * sumColumn('x'));
    var b = (sumColumn('y') - m * sumColumn('x')) / N;
    var y = function(x) {
      return m * x + b;
    };

    var xMin = xScale.domain()[0],
      xMax = xScale.domain()[1];

    var bestFit = [[xMin, y(xMin)], [xMax, y(xMax)]];

    // console.log("Sample size: " + N)
    // console.log("Mean x: " + (sumColumn('x') / N));
    // console.log("Mean y: " + (sumColumn('y') / N));
    // console.log("Intercept: " + b);
    // console.log("Slope: " + m);
    // console.log(bestFit);

    return bestFit;
  };

  /*
   * Render axes to chart.
   */
  chartElement
    .append('g')
    .attr('class', 'x axis')
    .attr('transform', makeTranslate(0, chartHeight))
    .call(xAxis)
    .append('text')
    .attr('class', 'label')
    .attr('x', chartWidth / 2)
    .attr('y', 40)
    .style('text-anchor', 'middle')
    .text(xColumn);

  chartElement
    .append('g')
    .attr('class', 'y axis')
    .call(yAxis)
    .append('text')
    .attr('class', 'label')
    .attr('x', -40)
    .attr('y', chartHeight / 2 - 30)
    .attr('dx', 0)
    .attr('dy', 0)
    .text(yColumn)
    .call(wrapText, 75, 15);

  /*
   * Render grid to chart.
   */
  var xAxisGrid = function() {
    return xAxis;
  };

  var yAxisGrid = function() {
    return yAxis;
  };

  chartElement
    .append('g')
    .attr('class', 'x grid')
    .attr('transform', makeTranslate(0, chartHeight))
    .call(
      xAxisGrid()
        .tickSize(-chartHeight, 0, 0)
        .tickFormat('')
    );

  chartElement
    .append('g')
    .attr('class', 'y grid')
    .call(
      yAxisGrid()
        .tickSize(-chartWidth, 0, 0)
        .tickFormat('')
    );

  /*
   * Render dots to chart
   */
  chartElement
    .append('g')
    .attr('class', 'dots')
    .selectAll('circle')
    .data(config.data)
    .enter()
    .append('circle')
    .attr('r', dotRadius)
    .attr('cx', function(d) {
      return xScale(d.x);
    })
    .attr('cy', function(d) {
      return yScale(d.y);
    })
    .attr('fill', COLORS['teal3'])
    .attr('stroke', COLORS['teal1'])
    .attr('class', function(d) {
      return 'dot-' + classify(d.state_name);
    })
    .on('mouseover', function() {
      return tooltip.style('visibility', 'visible');
    })
    .on('mousemove', function(d) {
      return tooltip
        .style('top', yScale(d.y) - 3 + 'px')
        .style('left', xScale(d.x) + margins.left - 50 + 'px')
        .text(d.state_name);
    })
    .on('mouseout', function() {
      return tooltip.style('visibility', 'hidden').style('left', '-99px');
    });

  /*
   * Render least-squares line to chart
   */
  var trendElement = chartElement.append('g').attr('class', 'trend');

  trendElement
    .append('path')
    .datum(bestFitData(config.data))
    .attr('class', 'line least-squares')
    .attr('fill', 'none')
    .attr('stroke', COLORS['teal2'])
    .attr('stroke-linejoin', 'round')
    .attr('stroke-linecap', 'round')
    .attr('stroke-width', 4)
    .attr('d', line);

  trendElement
    .append('text')
    .attr('x', xScale(90))
    .attr('y', yScale(700))
    .attr('dy', '.6em')
    .style('text-anchor', 'end')
    .attr('fill', COLORS['teal2'])
    .style('text-transform', 'uppercase')
    .style('font-weight', 'bold')
    .text('trend');

  /*
   * Render fixed tooltip
   */
  var point = _.findWhere(config.data, {
    state_name: 'Illinois'
  });
  fixedTooltip
    .text('Illinois')
    .style('top', yScale(point.y) - 3 + 'px')
    .style('left', xScale(point.x) + margins.left - 50 + 'px');

  point = _.findWhere(config.data, {
    state_name: 'Minnesota'
  });
  fixedTooltip2
    .text('Minnesota')
    .style('top', yScale(point.y) - 3 + 'px')
    .style('left', xScale(point.x) + margins.left - 50 + 'px');
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
