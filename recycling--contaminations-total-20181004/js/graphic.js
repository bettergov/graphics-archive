// Global vars
var pymChild = null;
var isMobile = false;
var dataSeries = [];

/*
 * Initialize graphic
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
	DATA.forEach(function(d) {
		var parseTime = d3.timeParse('%Y-%m-%d');
		d['date'] = parseTime(d['date']);

		for (var key in d) {
			if (key != 'date' && d[key] != null && d[key].length > 0) {
				d[key] = +d[key];
			}
		}
	});

	/*
   * Restructure tabular data for easier charting.
   */
	for (var column in DATA[0]) {
		if (column == 'date') {
			continue;
		}

		dataSeries.push({
			name: column,
			values: DATA.map(function(d) {
				return {
					date: d['date'],
					amt: d[column]
				};
				// filter out empty data. uncomment this if you have inconsistent data.
				//        }).filter(function(d) {
				//            return d['amt'] != null;
			})
		});
	}
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

	function transpose(data) {
		var result = {};
		_.each(data, function(row) {
			_.each(Object.keys(row), function(key) {
				result[key] = result[key] || [];
				var value = row[key];
				result[key].push(value);
			});
		});
		return result;
	}

	var transposed = transpose(DATA);
	delete transposed['date'];

	var yMin = d3.min(Object.keys(transposed), function(key) {
		return d3.min(transposed[key]);
	});

	var yMax = d3.max(Object.keys(transposed), function(key) {
		return d3.max(transposed[key]);
	});

	d3.select('#area-charts').html('');

	// Render the charts!
	dataSeries.forEach(function(d, i) {
		id = 'area-chart-' + classify(d.name);

		d3.select('#area-charts')
			.append('div')
			.attr('id', id)
			.attr('class', 'area-chart');

		elementWidth = document.getElementById(id).offsetWidth;

		if (elementWidth <= MOBILE_THRESHOLD) {
			isMobile = true;
		} else {
			isMobile = false;
		}

		renderLineChart({
			container: '#' + id,
			width: elementWidth,
			data: [d],
			yMin: yMin,
			yMax: yMax
		});
	});

	// Update iframe
	if (pymChild) {
		pymChild.sendHeight();
	}
};

/*
 * Render a line chart.
 */
var renderLineChart = function(config) {
	/*
   * Setup
   */
	var dateColumn = 'date';
	var valueColumn = 'amt';

	var aspectWidth = isMobile ? 4 : 16;
	var aspectHeight = isMobile ? 6 : 9;

	var margins = {
		top: 10,
		right: 30,
		bottom: 20,
		left: 10
	};

	var ticksX = 10;
	var ticksY = 10;
	var roundTicksFactor = 5;

	// Mobile
	if (isMobile) {
		ticksX = 5;
		ticksY = 5;
	}

	// Calculate actual chart dimensions
	var chartWidth = config['width'] - margins['left'] - margins['right'];

	var localMax = d3.max(config['data'][0]['values'], function(d) {
		return d.amt;
	});

	var chartHeight =
		Math.ceil((config['width'] * aspectHeight) / aspectWidth) -
		margins['top'] -
		margins['bottom'];

	// Clear existing graphic (for redraw)
	var containerElement = d3.select(config['container']);
	containerElement.html('');

	var lookupName = {
		DSS: 'Dept. of Streets and Sanitation',
		LRS: 'Lakeshore Recycling',
		WM: 'Waste Management'
	};

	containerElement
		.append('div')
		.attr('class', 'graphic-label')
		.append('span')
		.text(lookupName[config['data'][0]['name']]);

	/*
   * Create D3 scale objects.
   */
	var xScale = d3
		.scaleTime()
		.domain(
			d3.extent(config['data'][0]['values'], function(d) {
				return d['date'];
			})
		)
		.range([0, chartWidth]);

	var min = d3.min(config['data'], function(d) {
		return d3.min(d['values'], function(v) {
			return Math.floor(v[valueColumn] / roundTicksFactor) * roundTicksFactor;
		});
	});

	if (min > 0) {
		min = 0;
	}

	var max = d3.max(config['data'], function(d) {
		return d3.max(d['values'], function(v) {
			return Math.ceil(v[valueColumn] / roundTicksFactor) * roundTicksFactor;
		});
	});

	min = config['yMin'];
	max = config['yMax'];

	var yScale = d3
		.scaleLinear()
		.domain([min, max])
		.range([chartHeight, 0]);

	var colorScale = d3
		.scaleOrdinal()
		.domain(_.pluck(config['data'], 'name'))
		.range([
			COLORS['red3'],
			COLORS['yellow3'],
			COLORS['blue3'],
			COLORS['orange3'],
			COLORS['teal3']
		]);

	/*
   * Create the root SVG element.
   */
	var chartWrapper = containerElement
		.append('div')
		.attr('class', 'graphic-wrapper');

	var chartElement = chartWrapper
		.append('svg')
		.attr('width', chartWidth + margins['left'] + margins['right'])
		.attr('height', chartHeight + margins['top'] + margins['bottom'])
		.append('g')
		.attr(
			'transform',
			'translate(' + margins['left'] + ',' + margins['top'] + ')'
		);

	/*
   * Create D3 axes.
   */
	var xAxis = d3
		.axisBottom(xScale)
		.ticks(ticksX)
		.tickFormat(function(d, i) {
			if (isMobile) {
				return '\u2019' + fmtYearAbbrev(d);
			} else {
				return fmtYearFull(d);
			}
		});

	var yAxis = d3.axisLeft(yScale).ticks(ticksY);

	/*
   * Render axes to chart.
   */
	chartElement
		.append('g')
		.attr('class', 'x axis')
		.attr('transform', makeTranslate(0, chartHeight))
		.call(xAxis);

	// chartElement
	//   .append('g')
	//   .attr('class', 'y axis')
	//   .call(yAxis);

	/*
   * Render lines to chart.
   */
	var line = d3
		.line()
		// .curve(d3.curveBasis)
		.x(function(d) {
			return xScale(d[dateColumn]);
		})
		.y(function(d) {
			return yScale(d[valueColumn]);
		});

	var area = d3
		.area()
		.curve(d3.curveStepAfter)
		.x(function(d) {
			return xScale(d[dateColumn]);
		})
		.y1(function(d) {
			return yScale(d[valueColumn]);
		})
		.y0(function(d) {
			return yScale(0);
		});

	chartElement
		.append('g')
		.selectAll('path')
		.data(config['data'])
		.enter()
		.append('path')
		.attr('class', 'area')
		.attr('stroke-width', 0)
		.attr('fill', 'steelblue')
		.attr('d', function(d) {
			return area(d['values']);
		});

	chartElement
		.append('g')
		.attr('class', 'value')
		.selectAll('text')
		.data(config['data'])
		.enter()
		.append('text')
		.attr('x', function(d, i) {
			var last = d['values'][d['values'].length - 1];

			return xScale(last[dateColumn]) + 5;
		})
		.attr('y', function(d) {
			var last = d['values'][d['values'].length - 1];

			return yScale(last[valueColumn]) + 3;
		})
		.text(function(d) {
			var last = d['values'][d['values'].length - 1];
			var value = last[valueColumn] / 1000;

			var label = value.toFixed(0) + 'k';

			if (!isMobile) {
				label = d['name'] + ': ' + label;
			}

			return label;
		});

	/*
 * Render grid to chart.
 */
	// var xAxisGrid = function () {
	//   return xAxis;
	// };

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
	//   );

	chartElement
		.append('g')
		.attr('class', 'y grid')
		.call(
			yAxisGrid()
				.tickSize(-chartWidth, 0, 0)
				.tickFormat('')
		);

	/*
   * Render 0 value line.
   */
	if (min < 0) {
		chartElement
			.append('line')
			.attr('class', 'zero-line')
			.attr('x1', 0)
			.attr('x2', chartWidth)
			.attr('y1', yScale(0))
			.attr('y2', yScale(0));
	}
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
