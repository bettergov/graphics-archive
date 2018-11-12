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

// Global vars
var pymChild = null;
var isMobile = false;
var stackedData = null;

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
var formatData = function() {
	DATA.columns = _.keys(DATA[0]);

	var parseDate = d3.timeParse('%Y');
	DATA.forEach(function(d) {
		d.date = parseDate(d.date);
	});

	var keys = DATA.columns.filter(function(key) {
		return key !== 'date';
	});

	var stack = d3.stack();
	stack.keys(keys);
	stack.order(d3.StackOrderNone);
	stack.offset(d3.stackOffsetNone);

	stackedData = stack(DATA);
};

/*
 * Render the graphic.
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
	renderAreaChart({
		container: '#graphic',
		width: containerWidth,
		data: DATA,
		stackedData: stackedData
	});

	// Update iframe
	if (pymChild) {
		pymChild.sendHeight();
	}
};

/*
 * Render a graphic.
 */
var renderAreaChart = function(config) {
	var aspectWidth = 4;
	var aspectHeight = 3;

	var margins = {
		top: 0,
		right: 100,
		bottom: 20,
		left: 40
	};

	var ticksX = 10;

	if (isMobile) {
		ticksX = 5;
	}

	// Calculate actual chart dimensions
	var chartWidth = config['width'] - margins['left'] - margins['right'];
	var chartHeight =
		Math.ceil((config['width'] * aspectHeight) / aspectWidth) -
		margins['top'] -
		margins['bottom'];
	chartHeight = Math.min(350, chartHeight);

	// Clear existing graphic (for redraw)
	var containerElement = d3.select(config['container']);
	containerElement.html('');

	// Create container
	var chartElement = containerElement
		.append('svg')
		.attr('width', chartWidth + margins['left'] + margins['right'])
		.attr('height', chartHeight + margins['top'] + margins['bottom'])
		.append('g')
		.attr(
			'transform',
			'translate(' + margins['left'] + ',' + margins['top'] + ')'
		);

	// Draw here!
	var formatSi = d3.format('.3s');

	var formatNumber = d3.format(',d'),
		formatBillion = function(x) {
			return formatNumber(x);
		};

	var xScale = d3.scaleTime().range([0, chartWidth]);

	var yScale = d3.scaleLinear().range([chartHeight, 0]);

	var colorScale = d3.scaleOrdinal(d3.schemeCategory10);

	var opacityScale = d3
		.scalePow()
		.exponent(0.8)
		.range([0, 1]);

	var xAxis = d3
		.axisBottom()
		.scale(xScale)
		.ticks(ticksX)
		.tickFormat(function(d, i) {
			if (isMobile) {
				return '\u2019' + fmtYearAbbrev(d);
			} else {
				return fmtYearFull(d);
			}
		});

	var yAxis = d3
		.axisLeft()
		.scale(yScale)
		.tickFormat(formatBillion);

	var area = d3
		.area()
		.curve(d3.curveStepBefore)
		.x(function(d) {
			return xScale(d.data.date);
		})
		.y0(function(d) {
			return yScale(d[0]);
		})
		.y1(function(d) {
			return yScale(d[1]);
		});

	var keys = _.filter(_.keys(config['data'][0]), function(key) {
		return key !== 'date';
	});

	// color.domain(config['data']);
	colorScale.domain(keys);

	function add(a, b) {
		return a + b;
	}

	function getTotalFromKey(k) {
		return _.reduce(
			_.map(config['data'], function(d) {
				return +d[k];
			}),
			add,
			0
		);
	}

	var opacityMax = d3.max(keys, getTotalFromKey);

	opacityScale.domain([0, opacityMax]);

	var maxDateVal = d3.max(config['data'], function(d) {
		var vals = d3.keys(d).map(function(key) {
			return key !== 'date' ? d[key] : 0;
		});
		return d3.sum(vals);
	});

	// Set domains for axes
	xScale.domain(
		d3.extent(config['data'], function(d) {
			return d.date;
		})
	);

	yScale.domain([0, maxDateVal]);

	var browser = chartElement
		.selectAll('.town')
		.data(config['stackedData'])
		.enter()
		.append('g')
		.attr('class', function(d) {
			return 'town ' + classify(d.key);
		})
		.attr('fill-opacity', function(d) {
			var total = getTotalFromKey(d.key);
			// console.log(total);
			return opacityScale(total);
		});

	browser
		.append('path')
		.attr('class', 'area')
		.attr('d', area)
		.style('fill', function(d) {
			// return colorScale(d.key);
		});

	browser
		.append('text')
		.datum(function(d) {
			return d;
		})
		.attr('transform', function(d) {
			return (
				'translate(' +
				xScale(config['data'][12].date) +
				',' +
				yScale(d[12][1]) +
				')'
			);
		})
		.attr('y', 4)
		// .attr('x', -6)
		.attr('dy', '.35em')
		.style('text-anchor', 'start')
		.text(function(d) {
			return d.key;
		});
	// .attr('fill-opacity', 1);

	chartElement
		.append('g')
		.attr('class', 'x axis')
		.attr('transform', 'translate(0,' + chartHeight + ')')
		.call(xAxis);

	chartElement
		.append('g')
		.attr('class', 'y axis')
		.call(yAxis);

	// chartElement
	// 	.append('text')
	// 	.attr('x', 0 - margins.left)
	// 	.text('Billions of liters');

	d3.select('.town.dolton').moveToFront();
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
