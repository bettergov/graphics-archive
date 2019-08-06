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
        d['amt'] = +d['amt'] / 1e6;
        d['label'] = +d['label'];
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
    renderColumnChart({
        container: '#column-chart',
        width: containerWidth,
        data: DATA
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render a column chart.
 */
var renderColumnChart = function(config) {
    /*
     * Setup chart container.
     */
    var labelColumn = 'label';
    var valueColumn = 'amt';

    var aspectWidth = isMobile ? 4 : 16;
    var aspectHeight = isMobile ? 3 : 9;
    var valueGap = 6;

    var margins = {
        top: 5,
        right: 15,
        bottom: 20,
        left: 30
    };

    var ticksX = isMobile ? 5 : 10;
    var tickValuesX = isMobile ? [1957, 1960, 1970, 1980, 1990, 2000, 2010, 2017] : [1957, 1960, 1965, 1970, 1975, 1980, 1985, 1990, 1995, 2000,2005, 2010, 2015, 2017];
    var ticksY = 4;
    var roundTicksFactor = 50;

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];
    chartHeight = Math.min(chartHeight, 400);

    // Calculate bar width
    var barPadding = isMobile ? 0 : .25;
    // var barPadding = .25;
    var barWidth = chartWidth / config['data'].length * (1 - barPadding);

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
    var xMin = barWidth * (1 + barPadding) / 2;
    var xMax = chartWidth - (barWidth * (1 + barPadding)/2);

    var xScale = d3.scale.linear()
        // .domain([d3.extent(config['data'], function(d) { console.log(d[labelColumn]); return d[labelColumn] })])
        .domain([1957, 2017])
        .range([xMin, xMax]);

    var min = d3.min(config['data'], function(d) {
        return Math.floor(d[valueColumn] / roundTicksFactor) * roundTicksFactor;
    });

    if (min > 0) {
        min = 0;
    }

    // var max = d3.max(config['data'], function(d) {
    //     return Math.ceil(d[valueColumn] / roundTicksFactor) * roundTicksFactor;
    // });

    var max = 1.5;

    var yScale = d3.scale.linear()
        .domain([min, max])
        .range([chartHeight, 0]);

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        // .ticks(ticksX)
        .tickValues(tickValuesX)
        .tickFormat(function(d, i) {
            if (isMobile) {
                return d % 5 == 0 ? "" : d;
            } else {
                return (d == 1957 || d == 2000) ? d : d.toString().substr(2,2);
            }
            
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY);
        // .tickFormat(function(d) {
        //     if (d == 1.5) { 
        //         return "1.5 million" 
        //     } else {
        //         return d
        //     }
        //     // return fmtComma(d);
        // });

    /*
     * Render grid to chart.
     */
    var yAxisGrid = function() {
        return yAxis;
    };

    chartElement.append('g')
        .attr('class', 'y grid')
        .call(yAxisGrid()
            .tickSize(-chartWidth, 0)
            .tickFormat('')
        );

    /*
     * Render label background to chart.
     */
    
    chartElement.append('rect')
        .attr('class', 'label-bg')
        .attr('x', -5)
        .attr('y', -10)
        .attr('width', 50)
        .attr('height', 20)
        .attr('fill', 'white');

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);

    chartElement.append('g')
        .attr('class', 'y axis')
        .call(yAxis
            .tickSize(0, 6)
            .tickFormat(function(d) {
                if (d == 1.5) { 
                    return "1.5 million" 
                } else {
                    return d
                }
            })
        );

    /*
     * Render bars to chart.
     */
    chartElement.append('g')
        .attr('class', 'bars')
        .selectAll('rect')
        .data(config['data'])
        .enter()
        .append('rect')
            .attr('x', function(d) {
                // console.log(xScale(d[labelColumn]))
                return xScale(d[labelColumn]) - barWidth/2;
            })
            .attr('y', function(d) {
                if (d[valueColumn] < 0) {
                    return yScale(0);
                }

                return yScale(d[valueColumn]);
            })
            .attr('width', barWidth)
            .attr('height', function(d) {
                if (d[valueColumn] < 0) {
                    return yScale(d[valueColumn]) - yScale(0);
                }

                return yScale(0) - yScale(d[valueColumn]);
            })
            .attr('class', function(d) {
                return 'bar bar-' + d[labelColumn];
            })
            .classed('highlight', function(d) {
                return d[valueColumn] >= 1.179;
            });

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
     * Render 2017 line to chart.
     */

    var twentyseventeen = chartElement.append('g')
        .attr('class', 'twentyseventeen-level');

    twentyseventeen.append('line')
        .attr('x1', 0)
        .attr('x2', chartWidth)
        .attr('y1', yScale(1.18))
        .attr('y2', yScale(1.18));
    
    twentyseventeen.append('text')
        .attr('x', xScale(2017))
        .attr('y', yScale(1.18) - 8)
        .attr('dy', ".2em")
        .attr('text-anchor', 'end')
        .attr('font-size', isMobile ? "12px" : "15px" )
        .text('2017 level: 1.18 million')
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
