var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");
var { flow, mapValues, omitBy } = require("lodash/fp");

// Global vars
var pymChild = null;
var skipLabels = ["label", "values", "offset"];

var d3 = {
  ...require("d3-axis"),
  ...require("d3-format"),
  ...require("d3-scale"),
  ...require("d3-selection")
};

var {
  COLORS,
  classify,
  makeTranslate,
  formatStyle,
  parseNumber
} = require("./lib/helpers");

// Initialize the graphic.
var onWindowLoaded = function() {
  formatData();
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

// Format graphic data for processing by D3.
var formatData = function() {
  DATA.forEach(d => {
    d.values = [];

    var x0 = 0;

    if ("offset" in d) {
      d.offset = +d.offset;
      x0 = d.offset;
    }

    var x0pos = x0,
      x0neg = x0;

    for (let key in d) {
      if (skipLabels.indexOf(key) > -1) {
        continue;
      }

      var val = +d[key];

      if (val >= 0) {
        // var x1 = x0pos + val;
        var x1 = val;

        d.values.push({
          name: key,
          x0: 0,
          x1,
          val
        });

        x0pos = x1;
      } else {
        var x1 = x0neg + d[key];

        d.values.push({
          name: key,
          x0: x0neg,
          x1,
          val
        });

        x0neg = x1;
      }
    }
  });
};

// Render the graphic(s). Called by pym with the container width.
var render = function() {
  // Render the chart!
  var container = "#stacked-bar-chart";
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

  const loadMobile = d => {
    if (d.value_mobile && isMobile.matches) {
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
  )(PROPS);

  renderStackedBarChart({
    container,
    width,
    data: DATA,
    props
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Render a stacked bar chart.
var renderStackedBarChart = function(config) {
  // Setup
  var {
    /* data refs */
    labelColumn,
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
  var chartHeight = (barHeight + barGap) * config.data.length;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  if (d3.select(".footer")) {
    var footerDims = d3
      .select(".footer")
      .node()
      .getBoundingClientRect();

    d3.select("#main-container").style(
      "margin-bottom",
      footerDims.height + "px"
    );
  }

  var xScale = d3
    .scaleLinear()
    .domain([xMin, xMax])
    .rangeRound([0, chartWidth]);

  var colorScale = d3
    .scaleOrdinal()
    .domain(
      Object.keys(config.data[0]).filter(d => skipLabels.indexOf(d) == -1)
    )
    .range(["#ccc", COLORS.teal3, COLORS.blue3, "#ccc"]);

  // Render the legend.
  // var legend = containerElement
  //   .append("ul")
  //   .attr("class", "key")
  //   .selectAll("g")
  //   .data(colorScale.domain())
  //   .enter()
  //   .append("li")
  //   .attr("class", (d, i) => `key-item key-${i} ${classify(d)}`);

  // legend.append("b").style("background-color", colorScale);

  // legend.append("label").text(d => d);

  var axisWrapper = d3.select("#x-axis-top-wrapper");
  axisWrapper.html("");

  // Create the root SVG element.
  var chartWrapper = containerElement
    .append("div")
    .attr("class", "graphic-wrapper");

  var axisTop = axisWrapper
    .append("svg")
    .attr("width", chartWidth + margins.left + margins.right)
    .attr("height", margins.top)
    .attr("id", "x-axis-top")
    .append("g")
    .attr("transform", `translate(${margins.left},${margins.top})`);

  var xAxisTop = d3
    .axisTop()
    .scale(xScale)
    .ticks(ticksX)
    .tickFormat(function(d) {
      return d3.format(valueFormat)(Math.abs(d));
    });

  axisTop
    .append("g")
    .attr("class", "x axis top")
    // .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxisTop);

  margins.top = 0;

  var chartElement = chartWrapper
    .append("svg")
    .attr("width", chartWidth + margins.left + margins.right)
    .attr("height", chartHeight + margins.top + margins.bottom)
    .append("g")
    .attr("transform", `translate(${margins.left},${margins.top})`);

  // Create D3 axes.
  // Render axes to chart.
  if (showXAxisBottom) {
    var xAxisBottom = d3
      .axisBottom()
      .scale(xScale)
      .ticks(ticksX)
      .tickFormat(function(d) {
        return d3.format(valueFormat)(Math.abs(d));
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
        return d3.format(valueFormat)(Math.abs(d));
      });

    // chartElement
    //   .append("g")
    //   .attr("class", "x axis top")
    //   // .attr("transform", makeTranslate(0, chartHeight))
    //   .call(xAxisTop);
  }

  // Render grid to chart.
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

  // console.log(config.data);

  // stack data
  // var stack = d3.stack().keys(Object.keys(config.data[0]));
  // var stack = d3.stack().keys()

  // console.log(stack(config.data));

  // Render bars to chart.
  var group = chartElement
    .selectAll(".group")
    .data(config.data)
    .enter()
    .append("g")
    .attr("class", d => "group " + classify(d[labelColumn]))
    .attr(
      "transform",
      (d, i) => "translate(0," + i * (barHeight + barGap) + ")"
    );

  group
    .selectAll("rect")
    .data(d => d.values)
    .enter()
    .append("rect")
    .attr("x", d => (d.x0 < d.x1 ? xScale(d.x0) : xScale(d.x1)))
    .attr("width", d => Math.abs(xScale(d.x1) - xScale(d.x0)))
    .attr("height", barHeight)
    .style("fill", d => colorScale(d.name))
    .attr("class", d => classify(d.name));

  // Render bar values.
  if (showBarValues) {
    group
      .append("text")
      .attr("class", "value")
      // .selectAll("text")
      // .data(d => d.values)
      // .enter()
      // .append("text")
      .html(d => {
        var text = "";
        text += "<tspan class='aux'>";
        text += d3.format(valueFormat)(d.values[1].val); // auxiliary
        text += "</tspan>";
        text += "/";
        text += d3.format(valueFormat)(d.values[0].val); // total
        return text;
      })
      .attr("x", d => xScale(d.values[0].x1))
      .attr("dx", valueGap)
      .attr("dy", barHeight / 2 + 4);
  }

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
    .attr("style", (d, i) =>
      formatStyle({
        width: labelWidth + "px",
        height: barHeight + "px",
        left: "0px",
        top: i * (barHeight + barGap) + "px"
      })
    )
    .attr("class", d => classify(d[labelColumn]))
    .append("span")
    .text(d => d[labelColumn]);

  var currHeight = chartWrapper
    .select("rect.auxiliary-full-and-part-time")
    .node()
    .getBBox().height;

  chartWrapper
    .selectAll("rect.auxiliary-full-and-part-time")
    .attr("height", currHeight * 0.6)
    .attr("y", currHeight * 0.2);

  chartWrapper
    .selectAll("text.total-officers")
    .attr("dx", 5)
    .attr("class", "outside");

  // chartWrapper
  //   .selectAll("rect.sworn-officers-full-and-part-time")
  //   .attr("width", function() {
  //     var bbox = this.getBBox();
  //     return bbox.width + bbox.x;
  //   });
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
