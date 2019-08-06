// Global vars
var pymChild = null;
var isMobile = false;
var senateData, houseData;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
	if (Modernizr.svg) {
		formatData();
		formatBillsData();

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
 * Format data for D3.
 */
var formatData = function() {
	DATA.forEach(function(d) {
		d['amt'] = +d['amt'];
	});
};

var exportData = function(data) {
	function convertToCSV(objArray) {
		var array = typeof objArray != 'object' ? JSON.parse(objArray) : objArray;
		var str = '';

		for (var i = 0; i < array.length; i++) {
			var line = '';
			for (var index in array[i]) {
				if (line != '') line += ',';

				line += array[i][index];
			}

			str += line + '\r\n';
		}

		return str;
	}

	function exportCSVFile(headers, items, fileTitle) {
		if (headers) {
			items.unshift(headers);
		}

		// Convert Object to JSON
		var jsonObject = JSON.stringify(items);

		var csv = convertToCSV(jsonObject);

		var exportedFilenmae = fileTitle + '.csv' || 'export.csv';

		var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
		if (navigator.msSaveBlob) {
			// IE 10+
			navigator.msSaveBlob(blob, exportedFilenmae);
		} else {
			var link = document.createElement('a');
			if (link.download !== undefined) {
				// feature detection
				// Browsers that support HTML5 download attribute
				var url = URL.createObjectURL(blob);
				link.setAttribute('href', url);
				link.setAttribute('download', exportedFilenmae);
				link.style.visibility = 'hidden';
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);
			}
		}
	}

	var headers = {
		bill_id: 'Bill ID',
		title: 'Title',
		url: 'URL',
		chamber: 'Chamber',
		assignedTo: 'Assigned committee'
	};

	var fileTitle = 'export-bills';

	// exportCSVFile(headers, data, fileTitle);

	// console.log(data);
};

var formatBillsData = function() {
	// var regex = /'Assigned to '(.+)']/g;
	// var regex = /'Assigned to ([\w &]*)'/g;
	var regex = /'Assigned to ([^']+)'/gi;
	var DATA = billsData;
	var referralsStr;

	DATA.forEach(function(d) {
		referralsStr = d.referrals;

		regex.lastIndex = -1; // fix this quirk: https://stackoverflow.com/questions/12060685/js-regex-skips-every-other-match
		d['assignedTo'] = regex.exec(referralsStr);
		d['chamber'] = d['bill_id'].match('SB') ? 'Senate' : 'House';

		delete d['referrals'];
	});

	function getData(chamber) {
		var filtered = _.filter(DATA, function(d) {
			return d.chamber == chamber;
		});

		var counted = _.countBy(filtered, function(d) {
			return d.assignedTo
				? d.assignedTo[1].replace(' Committee', '')
				: 'Not assigned';
		});

		// aggregate "other" category
		var aggregateCommittees = function() {
			var aggregated = [];

			_.each(Object.entries(counted), function(d) {
				if (d[1] < 5) {
					aggregated.push(d);
					delete counted[d[0]];
				}
			});

			var aggregateLabel =
				aggregated.length + ' other committees (4 bills or fewer)';

			var aggregateSum = _.reduce(
				aggregated,
				function(memo, num) {
					return memo + num[1];
				},
				0
			);

			// counted[aggregateLabel] = aggregateSum;
		};

		aggregateCommittees();

		delete counted['Not assigned'];

		var mapped = _.map(Object.entries(counted), function(d) {
			return { label: d[0], amt: d[1] };
		});

		var sorted = _.sortBy(mapped, function(d) {
			if (d.label == 'Not assigned') {
				return 2;
			}

			if (d.label.indexOf('other committees') !== -1) {
				return 1;
			}

			return -d.amt;
		});

		console.log(sorted);

		return sorted;
	}

	senateData = getData('Senate');

	houseData = getData('House');

	// exportData(DATA);
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
	renderBarChart({
		container: '#bar-chart-senate',
		width: containerWidth,
		data: senateData
	});

	renderBarChart({
		container: '#bar-chart-house',
		width: containerWidth,
		data: houseData
	});

	// Update iframe
	if (pymChild) {
		pymChild.sendHeight();
	}
};

/*
 * Render a bar chart.
 */
var renderBarChart = function(config) {
	/*
	 * Setup
	 */
	var labelColumn = 'label';
	var valueColumn = 'amt';

	var barHeight = 20;
	var barGap = 20;
	var labelWidth = 150;
	var labelMargin = 6;
	var valueGap = 6;

	if (isMobile) {
		labelWidth = 120;
	}

	var margins = {
		top: 0,
		right: 0,
		bottom: 20,
		left: labelWidth + labelMargin
	};

	var ticksX = 4;
	var roundTicksFactor = 5;

	// Calculate actual chart dimensions
	var chartWidth = config['width'] - margins['left'] - margins['right'];
	var chartHeight = (barHeight + barGap) * config['data'].length - barGap;

	// Clear existing graphic (for redraw)
	var containerElement = d3.select(config['container']);
	containerElement.html('');

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
	 * Create D3 scale objects.
	 */
	var min = d3.min(config['data'], function(d) {
		return Math.floor(d[valueColumn] / roundTicksFactor) * roundTicksFactor;
	});

	if (min > 0) {
		min = 0;
	}

	var max = d3.max(config['data'], function(d) {
		return Math.ceil(d[valueColumn] / roundTicksFactor) * roundTicksFactor;
	});

	max = 40;

	var xScale = d3
		.scaleLinear()
		.domain([min, max])
		.range([0, chartWidth]);

	/*
	 * Create D3 axes.
	 */
	var xAxis = d3
		.axisBottom(xScale)
		.ticks(ticksX)
		.tickFormat(function(d) {
			return d.toFixed(0);
		});

	/*
	 * Render axes to chart.
	 */
	// chartElement
	// 	.append('g')
	// 	.attr('class', 'x axis')
	// 	.attr('transform', makeTranslate(0, chartHeight))
	// 	.call(xAxis);

	/*
	 * Render grid to chart.
	 */
	var xAxisGrid = function() {
		return xAxis;
	};

	chartElement
		.append('g')
		.attr('class', 'x grid')
		.attr('transform', makeTranslate(0, chartHeight))
		.call(
			xAxisGrid()
				.tickSize(-chartHeight, 0, 0)
				.tickFormat('')
		);

	/*
	 * Render bars to chart.
	 */
	chartElement
		.append('g')
		.attr('class', 'bars')
		.selectAll('rect')
		.data(config['data'])
		.enter()
		.append('rect')
		.attr('x', function(d) {
			if (d[valueColumn] >= 0) {
				return xScale(0);
			}

			return xScale(d[valueColumn]);
		})
		.attr('width', function(d) {
			return Math.abs(xScale(0) - xScale(d[valueColumn]));
		})
		.attr('y', function(d, i) {
			return i * (barHeight + barGap);
		})
		.attr('height', barHeight)
		.attr('class', function(d, i) {
			return 'bar-' + i + ' ' + classify(d[labelColumn]);
		});

	/*
	 * Render 0-line.
	 */
	if (min < 0) {
		chartElement
			.append('line')
			.attr('class', 'zero-line')
			.attr('x1', xScale(0))
			.attr('x2', xScale(0))
			.attr('y1', 0)
			.attr('y2', chartHeight);
	}

	/*
	 * Render bar labels.
	 */
	chartWrapper
		.append('ul')
		.attr('class', 'labels')
		.attr(
			'style',
			formatStyle({
				width: labelWidth + 'px',
				top: margins['top'] + 'px',
				left: '0'
			})
		)
		.selectAll('li')
		.data(config['data'])
		.enter()
		.append('li')
		.attr('style', function(d, i) {
			return formatStyle({
				width: labelWidth + 'px',
				height: barHeight + 'px',
				left: '0px',
				top: i * (barHeight + barGap) + 'px'
			});
		})
		.attr('class', function(d) {
			return classify(d[labelColumn]);
		})
		.append('span')
		.text(function(d) {
			return d[labelColumn];
		});

	/*
	 * Render bar values.
	 */
	chartElement
		.append('g')
		.attr('class', 'value')
		.selectAll('text')
		.data(config['data'])
		.enter()
		.append('text')
		.text(function(d) {
			return d[valueColumn].toFixed(0);
		})
		.attr('x', function(d) {
			return xScale(d[valueColumn]);
		})
		.attr('y', function(d, i) {
			return i * (barHeight + barGap);
		})
		.attr('dx', function(d) {
			var xStart = xScale(d[valueColumn]);
			var textWidth = this.getComputedTextLength();

			// Negative case
			if (d[valueColumn] < 0) {
				var outsideOffset = -(valueGap + textWidth);

				if (xStart + outsideOffset < 0) {
					d3.select(this).classed('in', true);
					return valueGap;
				} else {
					d3.select(this).classed('out', true);
					return outsideOffset;
				}
				// Positive case
			} else {
				if (xStart + valueGap + textWidth > chartWidth) {
					d3.select(this).classed('in', true);
					return -(valueGap + textWidth);
				} else {
					d3.select(this).classed('out', true);
					return valueGap;
				}
			}
		})
		.attr('dy', barHeight / 2 + 3);
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
