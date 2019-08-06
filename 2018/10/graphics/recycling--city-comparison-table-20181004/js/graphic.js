// Global vars
var pymChild = null;
var isMobile = false;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
	if (Modernizr.svg) {
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
	renderGraphic({
		container: '#graphic',
		width: containerWidth,
		data: DATA
	});

	// Update iframe
	if (pymChild) {
		pymChild.sendHeight();
	}
};

/*
 * Render a graphic.
 */
var renderGraphic = function(config) {
	var aspectWidth = 4;
	var aspectHeight = 3;

	var margins = {
		top: 0,
		right: 15,
		bottom: 20,
		left: 15
	};

	// Calculate actual chart dimensions
	var chartWidth = config['width'] - margins['left'] - margins['right'];
	var chartHeight =
		Math.ceil((config['width'] * aspectHeight) / aspectWidth) -
		margins['top'] -
		margins['bottom'];

	// Clear existing graphic (for redraw)
	var containerElement = d3.select(config['container']);
	containerElement.html('');

	// Create container
	// var chartElement = containerElement
	//   .append('svg')
	//   .attr('width', chartWidth + margins['left'] + margins['right'])
	//   .attr('height', chartHeight + margins['top'] + margins['bottom'])
	//   .append('g')
	//   .attr(
	//     'transform',
	//     'translate(' + margins['left'] + ',' + margins['top'] + ')'
	//   );

	function tabulate(data, columns) {
		var table = containerElement.append('table');
		var thead = table.append('thead');
		var tbody = table.append('tbody');

		// append the header row
		thead
			.append('tr')
			.selectAll('th')
			.data(columns)
			.enter()
			.append('th')
			.text(function(column) {
				return column;
			})
			.classed('amt', function(column) {
				return column == 'Recycling rate';
			});

		// create a row for each object in the data
		var rows = tbody
			.selectAll('tr')
			.data(data)
			.enter()
			.append('tr')
			.attr('id', function(d) {
				return 'row--' + classify(d.City);
			});

		// create a cell in each row for each column
		var cells = rows
			.selectAll('td')
			.data(function(row) {
				return columns.map(function(column) {
					return { column: column, value: row[column] };
				});
			})
			.enter()
			.append('td')
			.text(function(d) {
				if (d.column == 'Recycling rate') {
					return;
				}
				return d.value;
			})
			.filter(function(d) {
				return d.column == 'Recycling rate';
			})
			.append('div')
			.attr('class', 'bar')
			.text(function(d) {
				return Math.round(d.value);
			})
			.attr('style', function(d) {
				var css = '';
				css += 'width: ' + d.value + '%;';
				css += 'background-color: ' + d3.interpolateBlues(d.value / 100) + ';';

				if (d.value > 60) {
					css += 'color: #ddd;';
				}

				return css;
			});

		return table;
	}

	// Draw here!
	tabulate(config['data'], ['City', 'Recycling rate']);
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
