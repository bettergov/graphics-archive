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
}

/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
    DATA.forEach(function(d) {
        d['Shootings'] = +d['Shootings'] ? +d['Shootings'] : 0;
        d['Median household income'] = +d['Median household income'];
    });
}

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
}

/*
 * Render a bar chart.
 */
var renderDotChart = function(config) {
    /*
     * Setup
     */

    var xColumn = 'Median household income'
    var yColumn = 'Shootings'

    var dotRadius = 4;

    var margins = {
        top: 20,
        right: 20,
        bottom: 30,
        // left: (labelWidth + labelMargin)
        left: 20
    };

    var ticksX = 6;
    var ticksY = 5;
    var roundTicksFactor = 1e4;

    if (isMobile) {
        ticksX = 4;
        margins['right'] = 30;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    // var chartHeight = ((barHeight + barGap) * config['data'].length);
    if (isMobile) {
        var chartHeight = chartWidth * 3/4;
    } else {
        var chartHeight = Math.min(chartWidth * 9/16, 300);
    }
    

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
    // var min = 0;
    // var max = d3.max(config['data'], function(d) {
    //     return Math.ceil(d[maxColumn] / roundTicksFactor) * roundTicksFactor;
    // });

    var xMin = 0;
    var xMax = d3.max(config['data'], function(d) {
            return Math.ceil(d[xColumn] / roundTicksFactor) * roundTicksFactor;
        });

    var xScale = d3.scale.linear()
        .domain([xMin, xMax])
        .range([0, chartWidth]);

    var yScale = d3.scale.linear()
        .domain(d3.extent(config['data'], function(d) { return d[yColumn]; }))
        .range([chartHeight, 0]);

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d) {
            return '$' + d.formatMoney(0);
        });
    
    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickSize(-chartWidth);

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis)
      .append("text")
        .attr("class", "label")
        .attr("x", chartWidth)
        .attr("y", -6)
        .style("text-anchor", "end")
        .text("Median household income");

    chartElement.append("g")
        .attr("class", "y axis")
        .call(yAxis)
      .append("text")
        .attr("class", "label")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("Police shootings")

    /*
     * Render dots to chart
     */
    
    
    chartElement.append('g')
        .attr('class', 'dots')
        .selectAll("circle")
        .data(config['data'])
      .enter().append("circle")
        .attr("r", dotRadius)
        .attr("cx", function(d) { return xScale(d[xColumn]); })
        .attr("cy", function(d) { return yScale(d[yColumn]); })
        .attr("title", function(d) { return d['Name'] });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
