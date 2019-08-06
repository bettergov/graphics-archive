var pym = require('./lib/pym');
var ANALYTICS = require('./lib/analytics');
var { isMobile } = require('./lib/breakpoints');

var dataSeries = [];
var pymChild;

var {
  COLORS,
  classify,
  makeTranslate,
  processProps
} = require('./lib/helpers');

var d3 = {
  ...require('d3-axis'),
  ...require('d3-scale'),
  ...require('d3-selection'),
  ...require('d3-shape'),
  ...require('d3-interpolate'),
  ...require('d3-voronoi')
};

var fmtYearAbbrev = d => (d.getFullYear() + '').slice(-2);
var fmtYearFull = d => d.getFullYear();

var alterTickX, alterTickY;

d3.selection.prototype.first = function() {
  return d3.select(this.nodes()[0]);
};

d3.selection.prototype.last = function() {
  var last = this.size() - 1;
  return d3.select(this.nodes()[last]);
};

// https://github.com/wbkd/d3-extended
d3.selection.prototype.moveToFront = function() {
  return this.each(function() {
    this.parentNode.appendChild(this);
  });
};

d3.selection.prototype.moveToBack = function() {
  return this.each(function() {
    var firstChild = this.parentNode.firstChild;
    if (firstChild) {
      this.parentNode.insertBefore(this, firstChild);
    }
  });
};

function alterTickLabel(
  tickSelection,
  labelPrefix = '',
  labelSuffix = '',
  tickSize = 6
) {
  let translateX = 0,
    translateY = 0;

  // calculate text length of prefix
  tickSelection
    .append('text')
    .attr('xml:space', 'preserve')
    .text(labelPrefix)
    .each(function() {
      translateX -= this.getComputedTextLength();
      this.remove();
    });

  // calculate text length of suffix
  tickSelection
    .append('text')
    .attr('xml:space', 'preserve')
    .text(labelSuffix)
    .each(function() {
      translateX += this.getComputedTextLength();
      this.remove();
    });

  // modify label
  tickSelection
    .attr('transform', function() {
      // https://stackoverflow.com/a/10358266
      var xforms = this.getAttribute('transform');
      var parts = /translate\(\s*([^\s,)]+)[ ,]([^\s,)]+)/.exec(xforms);
      var firstX = parts[1],
        firstY = parts[2];

      return makeTranslate(firstX + translateX, firstY + translateY);
    })
    .select('text')
    .text(function() {
      return labelPrefix + tickSelection.text() + labelSuffix;
    });

  alterTickX = translateX;

  // add background box to label
  // var bbox = tickSelection
  //   .select('text')
  //   .node()
  //   .getBBox();

  // tickSelection
  //   .append('rect')
  //   .attr('x', bbox.x)
  //   .attr('y', bbox.y)
  //   .attr('width', bbox.width + tickSize)
  //   .attr('height', bbox.height)
  //   .style('fill', 'white')
  //   .moveToBack();
}

//Initialize graphic
var onWindowLoaded = function() {
  formatData();
  render();

  window.addEventListener('resize', render);

  pym.then(child => {
    pymChild = child;
    child.sendHeight();

    pymChild.onMessage('on-screen', function(bucket) {
      ANALYTICS.trackEvent('on-screen', bucket);
    });
    pymChild.onMessage('scroll-depth', function(data) {
      data = JSON.parse(data);
      ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });
  });
};

//Format graphic data for processing by D3.
var formatData = function() {
  DATA.forEach(function(d) {
    try {
      d.date = new Date(d.date);
    } catch (err) {
      d.meta = d.date;
      delete d.date;
    }
  });

  // Restructure tabular data for easier charting.
  for (var column in DATA[0]) {
    if (column == 'date') continue;

    dataSeries.push({
      name: column,
      values: DATA.map(d => ({
        date: d.date,
        amt: d[column]
      }))
    });
  }
};

// Render the graphic(s). Called by pym with the container width.

var render = function() {
  // Render the chart!
  var container = '#line-chart';
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  renderLineChart({
    container,
    width,
    data: dataSeries,
    props: processProps(PROPS)
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Render a line chart.
var renderLineChart = function(config) {
  var {
    margins,
    aspectWidth,
    aspectHeight,
    dateColumn,
    /* axes */
    ticksX,
    ticksY,
    roundTicksFactor,
    yMin,
    yMax,
    maxChartHeight
  } = config.props;

  // Setup
  var valueColumn = 'amt';

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight =
    Math.ceil((config.width * aspectHeight) / aspectWidth) -
    margins.top -
    margins.bottom;

  chartHeight = Math.min(chartHeight, maxChartHeight);

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html('');

  var dates = config.data[0].values.map(d => d[dateColumn]);
  var extent = [dates[0], dates[dates.length - 1]];

  var xScale = d3
    .scaleTime()
    .domain(extent)
    .range([0, chartWidth]);

  var yScale = d3
    .scaleLinear()
    .domain([yMin, yMax])
    .range([chartHeight, 0]);

  var colorScale = d3
    .scaleOrdinal()
    .domain(
      config.data.map(function(d) {
        return d.name;
      })
    )
    .range(['#666', '#ddd24b', COLORS.blue3, COLORS.orange3, COLORS.red3]);

  // Render the HTML legend.

  var legend = containerElement
    .append('ul')
    .attr('class', 'key')
    .selectAll('g')
    .data(config.data)
    .enter()
    .append('li')
    .attr('class', d => `key-item ${classify(d.name)}`)
    .style('color', d => colorScale(d.name));

  legend.append('b').style('background-color', d => colorScale(d.name));

  legend.append('label').text(d => d.name);

  // Create the root SVG element.

  var chartWrapper = containerElement
    .append('div')
    .attr('class', 'graphic-wrapper');

  var chartElement = chartWrapper
    .append('svg')
    .attr('width', chartWidth + margins.left + margins.right)
    .attr('height', chartHeight + margins.top + margins.bottom)
    .append('g')
    .attr('transform', `translate(${margins.left},${margins.top})`);

  // Create D3 axes.

  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .ticks(ticksX)
    .tickFormat(d => {
      var year = d.getFullYear();

      if (year == 2005) {
        return year;
      } else if (year == '2010' || year == '2015') {
        return '\u2019' + String(year).slice(2);
      } else {
        return null;
      }
    });
  // .tickValues([2005, 2010, 2015]);

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY);

  // Render axes to chart.

  chartElement
    .append('g')
    .attr('class', 'x axis')
    .attr('transform', makeTranslate(0, chartHeight))
    .call(xAxis);

  chartElement
    .append('g')
    .attr('class', 'y axis')
    .call(yAxis);

  alterTickLabel(
    d3.selectAll('.y.axis .tick').last(),
    '',
    '% on time',
    yAxis.tickSize()
  );

  // Render grid to chart.

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
  //   )
  //   .moveToBack();

  chartElement
    .append('g')
    .attr('class', 'y grid')
    .call(
      yAxisGrid()
        .tickSize(-chartWidth, 0, 0)
        .tickFormat('')
    )
    .moveToBack();

  d3.selectAll('.y.grid .tick line')
    .last()
    .attr('x1', alterTickX);

  // Render 0 value line.

  if (yMin < 0) {
    chartElement
      .append('line')
      .attr('class', 'zero-line')
      .attr('x1', 0)
      .attr('x2', chartWidth)
      .attr('y1', yScale(0))
      .attr('y2', yScale(0));
  }

  // Render lines to chart.
  var line = d3
    .line()
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
    .data(config.data)
    .enter()
    .append('path')
    .attr('class', d => 'line ' + classify(d.name))
    .attr('stroke', d => colorScale(d.name))
    .attr('d', d => line(d.values));

  chartElement
    .append('g')
    .attr('class', 'value key display-desktop')
    .selectAll('foreignObject')
    .data(config.data)
    .enter()
    .append('foreignObject')
    .attr('x', function(d, i) {
      var last = d.values[d.values.length - 1];

      return xScale(last[dateColumn]) + 5;
    })
    .attr('y', function(d) {
      var last = d.values[d.values.length - 1];

      return yScale(last[valueColumn]) + 3;
    })
    .attr('width', margins.right)
    .attr('height', 30)
    .attr('class', d => `key-item ${classify(d.name)}`)
    .style('color', d => colorScale(d.name))
    .html(function(d) {
      var last = d.values[d.values.length - 1];
      var value = last[valueColumn];

      var label = last[valueColumn].toFixed(1);

      if (!isMobile.matches) {
        label = `<b style="background-color: ${colorScale(d.name)};"></b>
        <label>${d.name}</label>`;
      }

      return label;
    });

  // Render voronoi for tooltip
  // const delaunay = Delaunay.from()

  var voronoi = d3
    .voronoi()
    .x(d => xScale(d[dateColumn]))
    .y(d => yScale(d[valueColumn]))
    .extent([
      [-margins.left, -margins.top],
      [chartWidth + margins.right, chartHeight + margins.bottom]
    ]);

  var focus = chartElement
    .append('g')
    .attr('transform', 'translate(-100,-100)')
    .attr('class', 'focus');

  focus
    .append('circle')
    .attr('r', 4)
    .style('fill', 'currentColor');

  focus
    .append('text')
    .attr('y', -10)
    .attr('class', 'tooltip');

  var voronoiGroup = chartElement.append('g').attr('class', 'voronoi');

  voronoiGroup
    .selectAll('path')
    .data(
      voronoi.polygons(
        config.data
          .map(d => d.values.map(v => Object.assign(v, { name: d.name })))
          .flat()
      )
    )
    .enter()
    .append('path')
    .attr('d', function(d) {
      return d ? 'M' + d.join('L') + 'Z' : null;
    })
    .on('mouseover', mouseover)
    .on('mouseout', mouseout);

  function mouseover(d) {
    // d.data.city.line.parentNode.appendChild(d.data.city.line);
    focus.attr(
      'transform',
      'translate(' +
        xScale(d.data[dateColumn]) +
        ',' +
        yScale(d.data[valueColumn]) +
        ')'
    );

    focus.style('color', colorScale(d.data.name));
    focus
      .select('text')
      .attr('text-anchor', function() {
        var xPos = xScale(d.data[dateColumn]);
        var width = this.getBBox().width;

        if (xPos < width / 2) {
          return 'start';
        }

        if (chartWidth - xPos < width / 2) {
          return 'end';
        }

        return 'middle';
      })
      .html(
        `<tspan>${d.data.name}</tspan> <tspan>${fmtYearFull(
          d.data[dateColumn]
        )}</tspan> <tspan>${d.data[valueColumn]}% on time</tspan>`
      );
  }

  function mouseout(d) {
    focus.attr('transform', 'translate(-100,-100)');
  }
};

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;
