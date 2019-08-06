// Global vars
var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");
var { flow, mapValues, omitBy, forEach } = require("lodash/fp");
var renderColumnChart = require("./_renderColChart");

var pymChild;

const {
  // COLORS,
  makeTranslate,
  classify,
  formatStyle,
  lookupColor,
  parseNumber
} = require("./lib/helpers");

var d3 = Object.assign(
  {},
  require("d3-axis"),
  require("d3-format"),
  require("d3-scale"),
  require("d3-selection"),
  require("d3-svg-annotation")
);

// Initialize the graphic.
var onWindowLoaded = function() {
  render();

  window.addEventListener("resize", render);

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

// Render the graphic(s). Called by pym with the container width.
var render = function() {
  // Render the chart!
  console.log("resized and rendering!");

  var container = "#bar-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  const parseValue = d => {
    switch (d.type) {
      case "number":
        return parseNumber(d.value);
      default:
        return d.value;
    }
  };

  var props = flow(
    mapValues(parseValue),
    omitBy(d => d == null)
  )(PROPS);

  // Parse data.
  var data = forEach((val, key) => {
    val[props.valueColumn] = parseNumber(val[props.valueColumn]);
    return val;
  })(DATA);

  renderBarChart({
    container,
    width,
    data,
    props
  });

  var container_b = "#column-chart";
  var element_b = document.querySelector(container_b);
  var width_b = element_b.offsetWidth;

  var props_b = flow(
    mapValues(parseValue),
    omitBy(d => d == null)
  )(PROPS_B);

  // Parse data.
  var data_b = forEach((val, key) => {
    val[props.valueColumn] = parseNumber(val[props.valueColumn]);
    return val;
  })(DATA_B);

  renderColumnChart({
    container: container_b,
    width: width_b,
    data: data_b,
    props: props_b
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Render a bar chart.
var renderBarChart = function(config) {
  // Setup
  var {
    /* data refs */
    labelColumn,
    valueColumn,
    /* bars */
    barHeight,
    barGap,
    /* labels */
    labelWidth,
    labelMargin,
    valueGap,
    valueFormat = "",
    showBarValues,
    /* x axis */
    ticksX,
    roundTicksFactor,
    showXAxisTop,
    showXAxisBottom,
    showXAxisGrid,
    xMin,
    xMax,
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
  var chartHeight = barGap + (barHeight + barGap) * config.data.length;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  containerElement
    .append("div")
    .attr("class", "graphic-title")
    .html(`<h2><strong>Environmental staff, by year</strong></h2>`);

  // Create the root SVG element.
  var chartWrapper = containerElement
    .append("div")
    .attr("class", "graphic-wrapper");

  var chartElement = chartWrapper
    .append("svg")
    .attr("width", chartWidth + margins.left + margins.right)
    .attr("height", chartHeight + margins.top + margins.bottom)
    .append("g")
    .attr("transform", "translate(" + margins.left + "," + margins.top + ")");

  // Create D3 scale objects.
  var xScale = d3
    .scaleLinear()
    .domain([xMin, xMax])
    .range([0, chartWidth]);

  // Create D3 axes.
  // Render axes to chart.
  if (showXAxisBottom) {
    var xAxisBottom = d3
      .axisBottom()
      .scale(xScale)
      .ticks(ticksX)
      .tickFormat(function(d) {
        return d3.format(valueFormat)(d);
      });

    chartElement
      .append("g")
      .attr("class", "x axis bottom")
      .attr("transform", makeTranslate(0, chartHeight))
      .call(xAxisBottom);
  }

  if (showXAxisTop) {
    var xAxisTop = d3
      .axisTop()
      .scale(xScale)
      .ticks(ticksX)
      .tickFormat(function(d) {
        return d3.format(valueFormat)(d);
      });

    chartElement
      .append("g")
      .attr("class", "x axis top")
      // .attr("transform", makeTranslate(0, chartHeight))
      .call(xAxisTop);
  }

  if (showXAxisGrid) {
    // Render grid to chart.
    var xAxisGrid = d3
      .axisBottom()
      .scale(xScale)
      .ticks(ticksX)
      .tickSize(-chartHeight, 0, 0)
      .tickFormat("");

    chartElement
      .append("g")
      .attr("class", "x grid")
      .attr("transform", makeTranslate(0, chartHeight))
      .call(xAxisGrid);
  }

  //Render bars to chart.
  chartElement
    .append("g")
    .attr("class", "bars")
    .selectAll("rect")
    .data(config.data)
    .enter()
    .append("rect")
    .attr("x", d => (d[valueColumn] >= 0 ? xScale(0) : xScale(d[valueColumn])))
    .attr("width", d => {
      return Math.abs(xScale(0) - xScale(d[valueColumn]));
    })
    .attr("y", (d, i) => barGap + i * (barHeight + barGap))
    .attr("height", barHeight)
    .attr("class", (d, i) => `bar-${i} ${classify(d[labelColumn])}`)
    .attr("fill", d => lookupColor(d.fill));

  // Render 0-line.
  if (xMin <= 0) {
    chartElement
      .append("line")
      .attr("class", "zero-line")
      .attr("x1", xScale(0))
      .attr("x2", xScale(0))
      .attr("y1", 0)
      .attr("y2", chartHeight);
  }

  // Render bar labels.
  chartWrapper
    .append("ul")
    .attr("class", "labels")
    .attr(
      "style",
      formatStyle({
        width: labelWidth + "px",
        top: margins.top + "px",
        left: "0"
      })
    )
    .selectAll("li")
    .data(config.data)
    .enter()
    .append("li")
    .attr("style", function(d, i) {
      return formatStyle({
        width: labelWidth + "px",
        height: barHeight + "px",
        left: "0px",
        top: barGap + i * (barHeight + barGap) + "px"
      });
    })
    .attr("class", function(d) {
      return "label label-" + classify(d[labelColumn]);
    })
    .append("span")
    .text(d => d[labelColumn]);

  // Render bar values.
  if (showBarValues) {
    chartElement
      .append("g")
      .attr("class", "value")
      .selectAll("text")
      .data(config.data)
      .enter()
      .append("text")
      .text(d => {
        var text = d3.format(valueFormat)(d[valueColumn]);
        if ("valuePrefix" in d) {
          text = d.valuePrefix + text;
        }
        if ("valueSuffix" in d) {
          text += d.valueSuffix;
        }
        return text;
      })
      .attr("x", d => xScale(d[valueColumn]))
      .attr("y", (d, i) => barGap + i * (barHeight + barGap))
      .attr("dx", function(d) {
        var xStart = xScale(d[valueColumn]);
        var textWidth = this.getComputedTextLength();

        // Negative case
        if (d[valueColumn] < 0) {
          var outsideOffset = -(valueGap + textWidth);

          if (xStart + outsideOffset < 0) {
            d3.select(this).classed("in", true);
            return valueGap;
          } else {
            d3.select(this).classed("out", true);
            return outsideOffset;
          }
          // Positive case
        } else {
          if (xStart + valueGap + textWidth > chartWidth) {
            d3.select(this).classed("in", true);
            return -(valueGap + textWidth);
          } else {
            d3.select(this).classed("out", true);
            return valueGap;
          }
        }
      })
      .attr("dy", barHeight / 2 + 3);
  }

  const annotationType = d3.annotationXYThreshold;

  const annotations = [
    {
      note: {
        label: "Rahm Emanuel's first full year as mayor of Chicago",
        bgPadding: 5,
        wrap: xScale(9),
        padding: 5
      },
      connector: {
        end: "dot"
      },
      className: "show-bg",
      x: xScale(10),
      y: barGap + 2 * (barHeight + barGap) + 0.5 * barHeight,
      dx: xScale(6),
      dy: 37
    }
  ];

  const makeAnnotations = d3
    .annotation()
    .editMode(false)
    .type(annotationType)
    .annotations(annotations);

  chartElement
    .append("g")
    .attr("class", "annotation-group")
    .call(makeAnnotations);
};

// Initially load the graphic
window.onload = onWindowLoaded;
