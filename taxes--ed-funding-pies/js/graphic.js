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
        d.funds = function(d) { return {name: d.state_name, fund: }}
        d.federal = +d.federal;
        d.state = +d.state;
        d.local = +d.local;
        d['local property taxes'] = +d['local property taxes'];
        d.total = +d.total;
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

    // Select SVG element
    var chartElement = containerElement.select('svg');

    // resize map (needs to be explicitly set for IE11)
    chartElement.attr('width', config['width'])
        .attr('height', function() {
            var s = d3.select(this);
            var viewBox = s.attr('viewBox').split(' ');
            return Math.floor(config['width'] * parseInt(viewBox[3]) / parseInt(viewBox[2]));
        });

    // Create radius scale
    var radiusScale = d3.scaleLinear()
        .domain(d3.extent(config.data, function(d) { return Math.sqrt(d.total); }))
        .range([2,30]);

    // Draw state circles
    chartElement.select('.states').selectAll('circle')
        .data(STATES)
        .enter().append('circle')
            .attr('r', function(d) {
                return radiusScale(Math.sqrt(d.value));
            })
            .attr('cx', function(d) {
                return d.x;
            })
            .attr('cy', function(d) {
                return d.y;
            })
            .attr('class', function(d) { 
                return 'state-' + classify(d.name);
            });

    var pie = d3.pie()
        .sort(null)
        .value(function(d) { return d.total; });

    var path = d3.arc()
        .outerRadius( 30 )
        .innerRadius( 0 );

    chartElement.append('g')
        .selectAll('.arc')
        .data(pie(config['data']))
        .enter().append("g")
            .attr("class", function(d){ console.log(d); return "arc"; });

    // Draw state labels
    // chartElement.append('g')
    //     .selectAll('text')
    //         .data(config['data'])
    //     .enter().append('text')
    //         .attr('text-anchor', 'middle')
    //         .text(function(d) {
    //             var state = _.findWhere(STATES, { 'name': d['state_name'] });
    //             return isMobile ? state['usps'] : state['ap'];
    //         })
    //         .attr('x', function(d) {
    //             var className = '.state-' + classify(d['state_name']);
    //             var tileBox = chartElement.select(className)[0][0].getBBox();
    //             return tileBox['x'] + tileBox['width'] * 0.52;
    //         })
    //         .attr('y', function(d) {
    //             var className = '.state-' + classify(d['state_name']);
    //             var tileBox = chartElement.select(className)[0][0].getBBox();
    //             var textBox = d3.select(this)[0][0].getBBox();
    //             var textOffset = textBox['height'] / 2;

    //             if (isMobile) {
    //                 textOffset -= 1;
    //             }

    //             return (tileBox['y'] + tileBox['height'] * 0.5) + textOffset;
    //         });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
