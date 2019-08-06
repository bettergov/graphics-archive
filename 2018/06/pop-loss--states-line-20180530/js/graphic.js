// Global vars
var pymChild = null;
var isMobile = false;
var dataSeries = [];
var min;
var max;

/*
 * Initialize graphic
 */
var onWindowLoaded = function() {
	if (Modernizr.svg) {
		formatData();

		pymChild = new pym.Child({
			renderCallback: render(135)
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
		d['date'] = d3.time.format('%m/%d/%y').parse(d['date']);

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
					amt: d[column] * 100
				};
				// filter out empty data. uncomment this if you have inconsistent data.
			}).filter(function(d) {
				return d['date'] >= new Date('2000');
			})
		});
	}

	dataSeries.sort(function(b, a) {
		return (
			a.values[a.values.length - 1].amt - b.values[b.values.length - 1].amt
		);
	});

	min = d3.min(dataSeries, function(d) {
		return d3.min(d.values, function(v) {
			return v.amt;
		});
	});
	max = d3.max(dataSeries, function(d) {
		return d3.max(d.values, function(v) {
			return v.amt;
		});
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

	// Render the chart!
	dataSeries.forEach(function(d) {
		renderLineChart({
			container: '#chart-' + d.name.toLowerCase(),
			width: containerWidth,
			data: [d]
		});
	});

	// renderLineChart({
	//   container: '#line-chart',
	//   width: containerWidth,
	//   data: dataSeries
	// });

	// Update iframe
	if (pymChild) {
		pymChild.sendHeight();
	}
};

// var min = d3.min(dataSeries => d3.min(d => d3.min(v.amt)));
// d3.min(dataSeries[0])
// console.log(d3.min(dataSeries, d => d3.min(d.values, v => v.amt)));
// console.log(dataSeries)
// dataSeries.forEach(d => console.log(d));
// var max = d3.max();
// console.log(dataSeries.length);

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
	var aspectHeight = isMobile ? 3 : 9;

	var margins = {
		top: 5,
		right: 43,
		bottom: 10,
		left: 35
	};

	var ticksX = 10;
	var ticksY = 5;
	var roundTicksFactor = 1;

	// Calculate actual chart dimensions
	var chartWidth = config['width'] - margins['left'] - margins['right'];
	var chartHeight =
		Math.ceil((config['width'] * aspectHeight) / aspectWidth) -
		margins['top'] -
		margins['bottom'];

	// Clear existing graphic (for redraw)
	// var containerElement = d3.select(config['container']);
	var containerElement = d3
		.select('#graphics-wrapper')
		.append('div')
		.attr('id', config['container'])
		.attr('class', 'chart');
	containerElement.html('');

	/*
	 * Create D3 scale objects.
	 */
	var xScale = d3.time
		.scale()
		.domain(
			d3.extent(config['data'][0]['values'], function(d) {
				return d['date'];
			})
		)
		.range([0, chartWidth]);

	// var min = d3.min(config['data'], function (d) {
	//   return d3.min(d['values'], function (v) {
	//     return Math.floor(v[valueColumn] / roundTicksFactor) * roundTicksFactor;
	//   })
	// });

	if (min > 0) {
		min = 0;
	}

	// var min = -.7;

	// var max = d3.max(config['data'], function (d) {
	//   return d3.max(d['values'], function (v) {
	//     return Math.ceil(v[valueColumn] / roundTicksFactor) * roundTicksFactor;
	//   })
	// });

	// var max = 3.2;

	var yScale = d3.scale
		.linear()
		.domain([min, max])
		.nice()
		.range([chartHeight, 0]);

	var colorScale = d3.scale
		.ordinal()
		.domain(_.pluck(config['data'], 'name'))
		.range([
			COLORS['red3'],
			COLORS['yellow3'],
			COLORS['blue3'],
			COLORS['orange3'],
			COLORS['teal3']
		]);

	/*
	 * Render the HTML legend.
	 */
	// var legend = containerElement.append('ul')
	//   .attr('class', 'key')
	//   .selectAll('g')
	//   .data(config['data'])
	//   .enter().append('li')
	//   .attr('class', function (d, i) {
	//     return 'key-item ' + classify(d['name']);
	//   });

	// legend.append('b')
	//   .style('background-color', function (d) {
	//     return colorScale(d['name']);
	//   });

	// legend.append('label')
	//   .text(function (d) {
	//     return d['name'];
	//   });

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
	var xAxis = d3.svg
		.axis()
		.scale(xScale)
		.orient('bottom')
		.ticks(3)
		.tickFormat(function(d) {
			return '';
		});

	var yAxis = d3.svg
		.axis()
		.scale(yScale)
		.orient('left')
		.ticks(ticksY)
		.tickFormat(function(d) {
			return '+' + d + '%';
		});

	/*
	 * Render axes to chart.
	 */
	chartElement
		.append('g')
		.attr('class', 'x axis')
		.attr('transform', makeTranslate(0, yScale(0)))
		.call(xAxis);

	chartElement
		.select('.x.axis')
		.append('text')
		.attr('y', 15)
		.text('2000');

	chartElement
		.select('.x.axis')
		.append('text')
		.attr('x', chartWidth)
		.attr('y', 15)
		.attr('text-anchor', 'end')
		.text('‘17');

	chartElement
		.append('g')
		.attr('class', 'y axis')
		.call(yAxis);

	/*
	 * Render grid to chart.
	 */
	var xAxisGrid = function() {
		return xAxis;
	};

	var yAxisGrid = function() {
		return yAxis;
	};

	// chartElement.append('g')
	//   .attr('class', 'x grid')
	//   .attr('transform', makeTranslate(0, chartHeight))
	//   .call(xAxisGrid()
	//     .tickSize(-chartHeight, 0, 0)
	//     .tickFormat('')
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
	 * Render lines to chart.
	 */
	var area = d3.svg
		.area()
		// .interpolate('monotone')
		.x(function(d) {
			return xScale(d[dateColumn]);
		})
		.y0(yScale(0))
		.y1(function(d) {
			return yScale(d[valueColumn]);
		});

	var line = d3.svg
		.line()
		// .interpolate('monotone')
		.x(function(d) {
			return xScale(d[dateColumn]);
		})
		.y(function(d) {
			return yScale(d[valueColumn]);
		});

	var negative = chartElement.append('g').attr('class', 'negative');

	negative
		.append('g')
		.attr('class', 'areas')
		.selectAll('path')
		.data(config['data'])
		.enter()
		.append('path')
		.attr('class', function(d, i) {
			return 'area ' + classify(d['name']);
		})
		.attr('stroke', function(d) {
			return colorScale(d['name']);
		})
		.attr('d', function(d) {
			return area(d['values']);
		});

	negative
		.append('g')
		.attr('class', 'lines')
		.selectAll('path')
		.data(config['data'])
		.enter()
		.append('path')
		.attr('class', function(d, i) {
			return 'line ' + classify(d['name']);
		})
		.attr('stroke', function(d) {
			return colorScale(d['name']);
		})
		.attr('d', function(d) {
			return line(d['values']);
		});

	var positive = chartElement.append('g').attr('class', 'positive');

	positive
		.append('clipPath')
		.attr('id', 'positive-clip')
		.append('rect')
		.attr('width', chartWidth + 10)
		.attr('height', yScale(0) - yScale(yScale.domain()[1]))
		.attr('x', -5)
		.attr('y', 0);

	// positive.append("clipPath")
	//   .attr("id", "area-clip")
	//   .selectAll('path')
	//   .data(config['data'])
	//   .enter()
	//   .append('path')
	//   .attr('d', d => area(d.values));

	positive
		.append('g')
		.attr('class', 'areas')
		.selectAll('path')
		.data(config['data'])
		.enter()
		.append('path')
		.attr('class', function(d, i) {
			return 'area ' + classify(d['name']);
		})
		.attr('stroke', function(d) {
			return colorScale(d['name']);
		})
		.attr('d', function(d) {
			return area(d['values']);
		});

	// positive.append('g')
	//   .attr('class', 'x grid')
	//   .attr('transform', makeTranslate(0, chartHeight))
	//   // .attr('clip-path', 'url(#area-clip)')
	//   .call(xAxisGrid()
	//     .tickSize(-chartHeight, 0, 0)
	//     .tickFormat('')
	//   );

	positive
		.append('g')
		.attr('class', 'lines')
		.selectAll('path')
		.data(config['data'])
		.enter()
		.append('path')
		.attr('class', function(d, i) {
			return 'line ' + classify(d['name']);
		})
		.attr('stroke', function(d) {
			return colorScale(d['name']);
		})
		.attr('d', function(d) {
			return line(d['values']);
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
			var value = last[valueColumn];

			var label = last[valueColumn].toFixed(1) + '%';

			if (last[valueColumn] > 0) {
				label = '+' + label;
			}

			// if (!isMobile) {
			//   label = d['name'] + ': ' + label;
			// }

			return label;
		});

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

	//
	chartElement
		.append('text')
		.attr('x', chartWidth / 2)
		.attr('y', 15)
		.attr('class', 'chart-label')
		.text(apState[config.data[0].name]);
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
