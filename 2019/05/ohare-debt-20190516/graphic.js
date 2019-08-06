var pym = require('./lib/pym');
var ANALYTICS = require('./lib/analytics');

// Global vars
var pymChild = null;
var skipLabels = ['label', 'values', 'total'];
var {
  COLORS,
  fmtComma,
  makeTranslate,
  classify,
  processProps
} = require('./lib/helpers');

var alterTick;

var textures = require('textures');

var d3 = {
  ...require('d3-axis'),
  ...require('d3-scale'),
  ...require('d3-selection'),
  ...require('d3-format')
};

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
      // translateX += this.getComputedTextLength();
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

  alterTick = translateX;

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

  // add background box to label
  // var bbox = tickSelection
  //   .select("text")
  //   .node()
  //   .getBBox();

  // tickSelection
  //   .append("rect")
  //   .attr("x", bbox.x)
  //   .attr("y", bbox.y)
  //   .attr("width", bbox.width + tickSize)
  //   .attr("height", bbox.height)
  //   .style("fill", "white")
  //   .moveToBack();
}

// Initialize the graphic.
var onWindowLoaded = function() {
  formatData(window.DATA);
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

// Format graphic data for processing by D3.
var formatData = function(data) {
  data.forEach(function(d) {
    d.values = [];
    var y0 = 0;

    d.total = 0;

    if ('offset' in d) {
      d.offset = +d.offset;
      y0 = d.offset;
    }

    var y0pos = y0,
      y0neg = y0;

    for (let key in d) {
      if (skipLabels.indexOf(key) > -1) {
        continue;
      }

      d.total += d[key];

      if (d[key] > 0) {
        var y1 = y0pos + d[key];

        d.values.push({
          name: key,
          y0: y0pos,
          y1,
          val: d[key]
        });

        y0pos = y1;
      } else if (d[key] < 0) {
        var y1 = y0neg + d[key];

        d.values.push({
          name: key,
          y0: y0neg,
          y1,
          val: d[key]
        });

        y0neg = y1;
      }
    }
  });
  return data;
};

// Render the graphic(s). Called by pym with the container width.
var render = function(containerWidth) {
  var container = '#stacked-column-chart';
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  renderStackedColumnChart({
    container,
    width,
    data: DATA,
    props: processProps(PROPS)
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Render a stacked column chart.
var renderStackedColumnChart = function(config) {
  // Setup
  var {
    margins,
    /* data refs */
    labelColumn,
    aspectWidth,
    aspectHeight,
    /* labels */
    valueGap,
    showBarValues,
    valueFormat,
    /* axes */
    ticksY,
    roundTicksFactor,
    yMin,
    yMax,
    xAxisTickValues
  } = config.props;

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight =
    Math.ceil((config.width * aspectHeight) / aspectWidth) -
    margins.top -
    margins.bottom;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html('');

  var labels = config.data.map(d => d[labelColumn]);

  // Create D3 scale objects.
  var xScale = d3
    .scaleBand()
    .domain(labels)
    .range([0, chartWidth])
    .padding(0.1);

  var yScale = d3
    .scaleLinear()
    .domain([yMin, yMax])
    .rangeRound([chartHeight, 0]);

  const texture = textures
    .lines()
    .thicker()
    // .stroke("white")
    .stroke(COLORS.red3)
    .background(COLORS.red5);

  var colorScale = d3
    .scaleOrdinal()
    .domain(
      Object.keys(config.data[0]).filter(k => skipLabels.indexOf(k) == -1)
    )
    .range([COLORS.red3, texture.url()]);

  // Render the legend.
  var legend = containerElement
    .append('ul')
    .attr('class', 'key')
    .selectAll('g')
    .data(colorScale.domain())
    .enter()
    .append('li')
    .attr('class', function(d, i) {
      return `key-item key-${i} ${classify(d)}`;
    });

  // legend.append("b").style("background-color", d => colorScale(d));
  legend
    .append('b')
    .append('svg')
    .attr('height', 15)
    .attr('width', 15)
    .call(texture)
    .append('rect')
    .attr('height', 15)
    .attr('width', 15)
    .attr('fill', d => colorScale(d));

  legend.append('label').text(d => d);

  // Create the root SVG element.
  var chartWrapper = containerElement
    .append('div')
    .attr('class', 'graphic-wrapper');

  var chartElement = chartWrapper
    .append('svg')
    .attr('width', chartWidth + margins.left + margins.right)
    .attr('height', chartHeight + margins.top + margins.bottom)
    .append('g')
    .attr('transform', makeTranslate(margins.left, margins.top));

  chartElement.call(texture);

  // Create D3 axes.
  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .tickFormat(d => {
      if (d == '2005') {
        return d;
      } else if (d == '2010' || d == '2015') {
        return '\u2019' + String(d).slice(2);
      } else {
        return null;
      }
    })
    .tickValues(xAxisTickValues && xAxisTickValues.split(', '));

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(d => Math.abs(d));
  // .tickFormat(d => d3.format(valueFormat)(d));

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

  // Render grid to chart.
  var yAxisGrid = function() {
    return yAxis;
  };

  alterTickLabel(
    d3.selectAll('.y.axis .tick').last(),
    '$',
    ' billion',
    yAxis.tickSize()
  );

  chartElement
    .append('g')
    .attr('class', 'y grid')
    .call(
      yAxisGrid()
        .tickSize(-chartWidth, 0)
        .tickFormat('')
    )
    .moveToBack();

  d3.selectAll('.y.grid .tick line')
    .last()
    .attr('x1', alterTick);

  // create a tooltip
  var tooltip = d3
    .select('.graphic-wrapper')
    .append('div')
    .style('opacity', 0)
    .attr('class', 'tooltip');

  var mouseover = function(d) {
    // d3.selectAll(siblings(this, "path")).style("opacity", 0.8);
    d3.select(this).style('opacity', 0.8);

    // d3.selectAll(siblings(this, "text")).style("fill-opacity", 1);

    tooltip.style('opacity', 1).style('z-index', 'unset');

    d3.select(this).style('cursor', 'crosshair');

    d3.select(this.parentNode).moveToFront();
  };

  var mousemove = function(d) {
    var year = d3.select(this.parentNode).data()[0].label;

    tooltip
      .html(
        `<strong>${d.name} (${year})</strong><br/>$${fmtComma(
          Math.abs(d.val)
        )} billion`
      )
      .style(
        'left',
        event.layerX * 2 < window.innerWidth
          ? event.layerX + 10 + 'px'
          : event.layerX - 10 - 150 + 'px'
      )
      .style('top', event.layerY - 15 + 'px');
  };

  var mouseleave = function() {
    // d3.selectAll(siblings(this, "path")).style("opacity", 1);
    d3.select(this).style('opacity', 1);

    // d3.selectAll(siblings(this, "text")).style("fill-opacity", 0);
    tooltip.style('opacity', 0).style('z-index', -1);

    d3.select(this).style('cursor', 'default');
  };

  // Render bars to chart.
  var bars = chartElement
    .selectAll('.bars')
    .data(config.data)
    .enter()
    .append('g')
    .attr('class', 'bar')
    .attr('transform', d => makeTranslate(xScale(d[labelColumn]), 0));

  bars
    .selectAll('rect')
    .data(d => d.values)
    .enter()
    .append('rect')
    .attr('y', d => (d.y1 < d.y0 ? yScale(d.y0) : yScale(d.y1)))
    .attr('width', xScale.bandwidth())
    .attr('height', d => Math.abs(yScale(d.y0) - yScale(d.y1)))
    .style('fill', d => colorScale(d.name))
    .attr('class', d => classify(d.name))
    .on('mouseover', mouseover)
    .on('mousemove', mousemove)
    .on('mouseleave', mouseleave);

  // Render 0 value line.
  chartElement
    .append('line')
    .attr('class', 'zero-line')
    .attr('x1', 0)
    .attr('x2', chartWidth)
    .attr('y1', yScale(0))
    .attr('y2', yScale(0));

  // Render values to chart.
  if (showBarValues) {
    bars
      .selectAll('text')
      .data(function(d) {
        return d.values;
      })
      .enter()
      .append('text')
      .text(function(d) {
        return d3.format(valueFormat)(d.val);
      })
      .attr('class', function(d) {
        return classify(d.name);
      })
      .attr('x', function(d) {
        return xScale.bandwidth() / 2;
      })
      .attr('y', function(d) {
        var textHeight = d3
          .select(this)
          .node()
          .getBBox().height;
        var barHeight = Math.abs(yScale(d.y0) - yScale(d.y1));

        if (textHeight + valueGap * 2 > barHeight) {
          d3.select(this).classed('hidden', true);
        }

        var barCenter = yScale(d.y1) + (yScale(d.y0) - yScale(d.y1)) / 2;

        return barCenter + textHeight / 2;
      })
      .attr('text-anchor', 'middle');
  }
};

// Initially load the graphic
//(NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;
