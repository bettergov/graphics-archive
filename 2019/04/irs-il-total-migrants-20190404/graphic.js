var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");
var { flow, mapValues, omitBy } = require("lodash/fp");

// Global vars
var pymChild = null;
var skipLabels = ["label", "values", "total", "group"];
var {
  COLORS,
  makeTranslate,
  classify,
  parseNumber,
  wrapText
} = require("./lib/helpers");

var d3 = {
  ...require("d3-axis"),
  ...require("d3-scale"),
  ...require("d3-selection"),
  ...require("d3-format"),
  ...require("d3-shape")
};

// Initialize the graphic.
var onWindowLoaded = function() {
  formatData(window.DATA);
  renderAll();

  window.addEventListener("resize", renderAll);

  pym.then(child => {
    pymChild = child;
    child.sendHeight();

    pymChild.onMessage("on-screen", function(bucket) {
      ANALYTICS.trackEvent("on-screen", bucket);
    });

    pymChild.onMessage("scroll-depth", function(data) {
      data = JSON.parse(data);
      ANALYTICS.trackEvent("scroll-depth", data.percent, data.seconds);
    });
  });
};

// Format graphic data for processing by D3.
var formatData = function(data) {
  data.forEach(function(d) {
    d.values = [];
    var y0 = 0;

    d.total = 0;

    if ("offset" in d) {
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

var renderAll = function() {
  render(
    "#stacked-column-chart",
    renderStackedColumnChart,
    window.DATA.filter(d => d.group == "total")
  );
};

// Render the graphic(s). Called by pym with the container width.
var render = function(container, cb, data = window.DATA, props = window.PROPS) {
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  const parseValue = d => {
    switch (d.type) {
      case "number":
        return parseNumber(d.use_value);
      default:
        return d.use_value;
    }
  };

  var matchesMobile = width < 500;

  const loadMobile = d => {
    if (d.value_mobile && matchesMobile) {
      d.use_value = d.value_mobile;
    } else {
      d.use_value = d.value;
    }

    return d;
  };

  var props = flow(
    mapValues(loadMobile),
    mapValues(parseValue),
    omitBy(d => d == null)
  )(props);

  cb({
    container,
    width,
    data: formatData(data),
    props
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
    // roundTicksFactor,
    yMin,
    yMax,
    xAxisTickValues,
    xScalePaddingInner,
    xScalePaddingOuter,
    /* margins */
    marginTop,
    marginRight,
    marginBottom,
    marginLeft
  } = config.props;

  var margins = {
    top: marginTop,
    right: marginRight,
    bottom: marginBottom,
    left: marginLeft
  };

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight =
    Math.ceil((config.width * aspectHeight) / aspectWidth) -
    margins.top -
    margins.bottom;
  chartHeight = Math.min(chartHeight, 300);

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  var labels = config.data.map(d => d[labelColumn]);

  // Create D3 scale objects.
  var xScale = d3
    .scaleBand()
    .domain(labels)
    .range([0, chartWidth])
    .paddingInner(xScalePaddingInner)
    .paddingOuter(xScalePaddingOuter);

  var yScale = d3
    .scaleLinear()
    .domain([yMin, yMax])
    .rangeRound([chartHeight, 0]);

  // Create the chart header
  if ("chartHeader" in config.props) {
    // console.log(config.props.chartHeader);
    const { chartHeader } = config.props;

    containerElement
      .append("h3")
      .attr("class", "graphic-header")
      .text(chartHeader);
  }

  // Create the root SVG element.
  var chartWrapper = containerElement
    .append("div")
    .attr("class", "graphic-wrapper");

  var chartElement = chartWrapper
    .append("svg")
    .attr("width", chartWidth + margins.left + margins.right)
    .attr("height", chartHeight + margins.top + margins.bottom)
    .append("g")
    .attr("transform", makeTranslate(margins.left, margins.top));

  // Create D3 axes.
  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .tickFormat(d => {
      switch (String(d)) {
        case "1991":
        case "2001":
          return d;
        default:
          return "’" + String(d).slice(2);
      }
    })
    .tickValues(xAxisTickValues && xAxisTickValues.split(", "));

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(d => d3.format(valueFormat)(d));

  // Render axes to chart.
  chartElement
    .append("g")
    .attr("class", "x axis")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxis);

  chartElement
    .append("g")
    .attr("class", "y axis")
    .call(yAxis);

  // Render grid to chart.
  var yAxisGrid = function() {
    return yAxis;
  };

  chartElement
    .append("g")
    .attr("class", "y grid")
    .call(
      yAxisGrid()
        .tickSize(-chartWidth, 0)
        .tickFormat("")
    );

  // Render bars to chart.
  var bars = chartElement
    .append("g")
    .attr("class", "bars")
    .selectAll(".bar")
    .data(config.data)
    .enter()
    .append("g")
    .attr("class", "bar")
    .attr("transform", function(d) {
      return makeTranslate(xScale(d[labelColumn]), 0);
    });

  const arc = (r, sign) =>
    r
      ? `a${r * sign[0]},${r * sign[1]} 0 0 1 ${r * sign[2]},${r * sign[3]}`
      : "";

  function roundedRect(x, y, width, height, r) {
    r = [
      Math.min(r[0], height, width),
      Math.min(r[1], height, width),
      Math.min(r[2], height, width),
      Math.min(r[3], height, width)
    ];

    return `M${x + r[0]},${y}h${width - r[0] - r[1]}${arc(r[1], [
      1,
      1,
      1,
      1
    ])}v${height - r[1] - r[2]}${arc(r[2], [1, 1, -1, 1])}h${-width +
      r[2] +
      r[3]}${arc(r[3], [1, 1, -1, -1])}v${-height + r[3] + r[0]}${arc(r[0], [
      1,
      1,
      1,
      -1
    ])}z`;
  }

  bars
    .selectAll("path")
    .data(d => d.values)
    .enter()
    .append("path")
    .attr("d", d => {
      // var r = xScale.paddingInner() * xScale.bandwidth();
      r = 0;

      return roundedRect(
        0,
        d.y1 < d.y0 ? yScale(d.y0) : yScale(d.y1),
        xScale.bandwidth(),
        Math.abs(yScale(d.y0) - yScale(d.y1)),
        d.y1 < d.y0 ? [0, 0, r, r] : [r, r, 0, 0]
      );
    })
    .attr("fill", "currentColor")
    .attr("class", function(d) {
      return classify(d.name);
    });

  // Render 0 value line.
  chartElement
    .append("line")
    .attr("class", "zero-line")
    .attr("x1", 0)
    .attr("x2", chartWidth)
    .attr("y1", yScale(0))
    .attr("y2", yScale(0));

  // Render the net migration as a line
  var line = d3
    .line()
    .defined(d => d.values.length > 0)
    .x(function(d) {
      return xScale(d.label) + xScale.bandwidth() / 2;
    })
    .y(function(d) {
      return yScale(d.total);
    });

  var dataCharted = chartElement
    .append("g")
    .attr("class", "data-charted")
    .attr("color", "#333")
    .selectAll("g")
    .data([config.data])
    .enter()
    .append("g");

  // render dashed line
  dataCharted
    .append("path")
    .attr("class", "line")
    .attr("d", d => {
      var filtered = d.filter(v => [2014, 2016].includes(v.label));
      return line(filtered);
    })
    .attr("stroke", "currentColor")
    .attr("stroke-dasharray", "2,5");

  // render normal line
  dataCharted
    .append("path")
    .attr("class", "line")
    .attr("d", d => line(d))
    .attr("stroke", "currentColor");

  // Render endpoints and labels
  var first = config.data[0];
  var last = config.data[config.data.length - 1];
  var valueColumn = "total";

  dataCharted
    .append("circle")
    .attr("class", "startpoint")
    .attr("cx", xScale(config.data[0].label) + xScale.bandwidth() / 2)
    .attr("cy", yScale(config.data[0].total))
    .attr("r", 3)
    .attr("fill", "#ccc")
    .attr("stroke", "currentColor")
    .attr("stroke-width", 2.5);

  dataCharted
    .append("circle")
    .attr("class", "endpoint")
    .attr("cx", xScale(last.label) + xScale.bandwidth() / 2)
    .attr("cy", yScale(last.total))
    .attr("r", 3)
    .attr("fill", "currentColor")
    .attr("stroke", "currentColor")
    .attr("stroke-width", 2);

  dataCharted
    .append("text")
    .attr("class", "value")
    .attr("fill", "currentColor")
    .attr("font-weight", "bold")
    .attr("font-size", "12px")
    .attr("x", function() {
      return xScale(last.label) + xScale.bandwidth() / 2 + 8;
    })
    .attr("y", function() {
      return yScale(last[valueColumn]) + 3;
    })
    .text(function() {
      var label = d3.format(",")(last[valueColumn]);

      return label;
    });

  dataCharted
    .append("text")
    .attr("class", "value")
    .attr("fill", "currentColor")
    .attr("font-weight", "bold")
    .attr("font-size", "12px")
    .attr("x", function(d, i) {
      return xScale(first.label) + xScale.bandwidth() / 2 - 11;
    })
    .attr("y", function(d) {
      return yScale(first[valueColumn]) + 3;
    })
    .text(function(d) {
      var label = d3.format(",")(first[valueColumn]);

      return label;
    })
    .attr("text-anchor", "end");

  dataCharted
    .append("text")
    .attr("class", "label")
    .text("Net migration")
    .attr("x", xScale(2008))
    .attr(
      "y",
      yScale(config.data[Math.round(config.data.length / 2)].total) + 15
    )
    .attr("text-anchor", "middle")
    .attr("fill", "currentColor");

  // Render values to chart.
  if (showBarValues) {
    bars
      .selectAll("text")
      .data(function(d) {
        return d.values;
      })
      .enter()
      .append("text")
      .text(function(d) {
        return d3.format(valueFormat)(d.val);
      })
      .attr("class", function(d) {
        return classify(d.name);
      })
      .attr("x", function(d) {
        return xScale.bandwidth() / 2;
      })
      .attr("y", function(d) {
        var textHeight = d3
          .select(this)
          .node()
          .getBBox().height;
        var barHeight = Math.abs(yScale(d.y0) - yScale(d.y1));

        if (textHeight + valueGap * 2 > barHeight) {
          d3.select(this).classed("hidden", true);
        }

        var barCenter = yScale(d.y1) + (yScale(d.y0) - yScale(d.y1)) / 2;

        return barCenter + textHeight / 2;
      })
      .attr("text-anchor", "middle");
  }

  var labels = chartElement.append("g").attr("class", "labels");

  labels
    .append("text")
    .text("Filers entering Illinois")
    .attr("x", 5)
    .attr("y", yScale(6e4))
    .attr("class", "label inflow")
    .call(wrapText, marginRight, 14);

  labels
    .append("text")
    .text("Filers leaving Illinois")
    .attr("x", 5)
    .attr("y", yScale(-6e4))
    .attr("class", "label outflow")
    .call(wrapText, marginRight, 14)
    .append("rect")
    .attr("height", 1)
    .attr("width", 10);
};

// Initially load the graphic
//(NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;
