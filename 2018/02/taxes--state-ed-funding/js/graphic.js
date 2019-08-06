// Global config
var MAP_TEMPLATE_ID = '#map-template';

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

var formatData = function () {
    DATA.forEach(function (d) {
        d.value = +d.value;
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

    if (LABELS['is_numeric'] && LABELS['is_numeric'].toLowerCase() == 'true') {
        var isNumeric = true;
    } else {
        var isNumeric = false;
    }

    // Render the map!
    renderStateGridMap({
        container: '#state-grid-map',
        width: containerWidth,
        data: DATA,
        // isNumeric will style the legend as a numeric scale
        isNumeric: isNumeric
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}


/*
 * Render a state grid map.
 */
var renderStateGridMap = function(config) {
    var valueColumn = 'category';

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');


    // Copy map template
    var template = d3.select(MAP_TEMPLATE_ID);
    containerElement.html(template.html());

    // Extract categories from data
    var categories = [];

    if (LABELS['legend_labels'] && LABELS['legend_labels'] !== '') {
        // If custom legend labels are specified
        var legendLabels = LABELS['legend_labels'].split(',');
        _.each(legendLabels, function(label) {
            categories.push(label.trim());
        });
    } else {
        // Default: Return sorted array of categories
         _.each(config['data'], function(state) {
            if (state[valueColumn] != null) {
                categories.push(state[valueColumn]);
            }
        });

        categories = d3.set(categories).values().sort();
    }

    // Create legend
    var legendWrapper = containerElement.select('.key-wrap');
    var legendElement = containerElement.select('.key');

    if (config['isNumeric']) {
        legendWrapper.classed('numeric-scale', true);

        var colorScale = d3.scale.ordinal()
            .domain(categories)
            .range(['#336664','#448885','#51a09e','#77bbb8','#99ccca','#bbdddc','#ddeeed']);
    } else {
        // Define color scale
        var colorScale = d3.scale.ordinal()
            .domain(categories)
            .range([COLORS['red3'], COLORS['yellow3'], COLORS['blue3'], COLORS['orange3'], COLORS['teal3']]);
    }

    _.each(colorScale.domain(), function(key, i) {
        var keyItem = legendElement.append('li')
            .classed('key-item', true)

        keyItem.append('b')
            .style('background', colorScale(key));

        keyItem.append('label')
            .text(key);

        // Add the optional upper bound label on numeric scale
        if (config['isNumeric'] && i == categories.length - 1) {
            if (LABELS['max_label'] && LABELS['max_label'] !== '') {
                keyItem.append('label')
                    .attr('class', 'end-label')
                    .text(LABELS['max_label']);
            }
        }
    });

    // Select SVG element
    var chartElement = containerElement.select('svg');

    // resize map (needs to be explicitly set for IE11)
    chartElement.attr('width', config['width'])
        .attr('height', function() {
            var s = d3.select(this);
            var viewBox = s.attr('viewBox').split(' ');
            return Math.floor(config['width'] * parseInt(viewBox[3]) / parseInt(viewBox[2]));
        });

    // Draw state boxes
    chartElement.select('.states').selectAll('rect')
        .data(STATES)
        .enter().append('rect')
            .attr('width', function(d) {
                return d.dim;
            })
            .attr('height', function(d) {
                return d.dim;
            })
            .attr('x', function(d) {
                return d.x;
            })
            .attr('y', function(d) {
                return d.y;
            })
            .attr('class', function(d) { 
                return 'state-' + classify(d.name);
            });

    // Set state colors
    _.each(config['data'], function(state) {
        if (state[valueColumn] !== null) {
            var stateClass = 'state-' + classify(state['state_name']);
            var categoryClass = 'category-' + classify(state[valueColumn]);

            chartElement.select('.' + stateClass)
                .attr('class', stateClass + ' state-active ' + categoryClass)
                .attr('fill', colorScale(state[valueColumn]));
        }
    });

    // Draw state labels
    chartElement.append('g')
        .selectAll('text')
            .data(config['data'])
        .enter().append('text')
            .attr('text-anchor', 'middle')
            .text(function(d) {
                var state = _.findWhere(STATES, { 'name': d['state_name'] });

                return isMobile ? state['usps'] : state['ap'];
                // return Math.round(d.value * 100).toFixed(0);
            })
            .attr('class', function(d) {
                return d[valueColumn] !== null ? 'category-' + classify(d[valueColumn]) + ' label label-active' : 'label';
            })
            .attr('x', function(d) {
                var className = '.state-' + classify(d['state_name']);
                var tileBox = chartElement.select(className)[0][0].getBBox();
                return tileBox['x'] + tileBox['width'] * 0.52;
            })
            .attr('y', function(d) {
                var className = '.state-' + classify(d['state_name']);
                var tileBox = chartElement.select(className)[0][0].getBBox();
                var textBox = d3.select(this)[0][0].getBBox();
                var textOffset = textBox['height'] / 2;

                if (isMobile) {
                    textOffset -= 1;
                }

                return isMobile ? (tileBox['y'] + tileBox['height'] * 0.50) + textOffset : (tileBox['y'] + tileBox['height'] * 0.35) + textOffset;
            });
        if (!isMobile) {
            chartElement.append('g')
            .selectAll('text')
            .data(config['data'])
            .enter().append('text')
                .attr('class', function(d) {
                    return d[valueColumn] !== null ? 'category-' + classify(d[valueColumn]) + ' label label-active label-value' : 'label label-value';
                })
                .attr('text-anchor', 'middle')
                .text(function(d) {
                    return Math.round(d.value * 100).toFixed(0);
                })
                .attr('x', function(d){
                    var className = '.state-' + classify(d['state_name']);
                    var tileBox = chartElement.select(className)[0][0].getBBox();
                    return tileBox['x'] + tileBox['width'] * 0.52;
                })
                .attr('y', function(d) {
                    var className = '.state-' + classify(d['state_name']);
                    var tileBox = chartElement.select(className)[0][0].getBBox();
                    var textBox = d3.select(this)[0][0].getBBox();
                    var textOffset = textBox['height'] / 2;

                    if (isMobile) {
                        textOffset -= 1;
                    }

                    return (tileBox['y'] + tileBox['height'] * 0.70) + textOffset;
                });
        }
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;