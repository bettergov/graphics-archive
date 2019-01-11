// Global config
var GEO_DATA_URL = 'us-states.json';

// Global vars
var pymChild = null;
var isMobile = false;
var geoData = null;
var scaleKey = null;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
	if (Modernizr.svg) {
		loadJSON();
	} else {
		pymChild = new pym.Child({});

		pymChild.onMessage('on-screen', function(bucket) {
			ANALYTICS.trackEvent('on-screen', bucket);
		});
		pymChild.onMessage('scroll-depth', function(data) {
			data = JSON.parse(data);
			ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
		});
	}
};

/*
 * Load graphic data from a CSV.
 */
var loadJSON = function() {
	d3.json(GEO_DATA_URL, function(error, data) {
		geoData = data;

		// recast population figures as numbers
		DATA.forEach(function(d, i) {});

		pymChild = new pym.Child({
			renderCallback: render
		});

		pymChild.onMessage('on-screen', function(bucket) {
			ANALYTICS.trackEvent('on-screen', bucket);
		});
		pymChild.onMessage('scroll-depth', function(data) {
			data = JSON.parse(data);
			ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
		});
	});
};

/*
 * Render the graphic.
 */
var render = function(containerWidth) {
	if (!containerWidth) {
		containerWidth = DEFAULT_WIDTH;
	}

	var gutterWidth = 22;
	var headerWidth = null;
	var mapWidth = null;

	if (containerWidth <= MOBILE_THRESHOLD) {
		isMobile = true;
		scaleKey = [40, 120];
		mapWidth = containerWidth;
	} else {
		isMobile = false;
		scaleKey = [50, 120];
		mapWidth = Math.floor((containerWidth - gutterWidth) * 0.65);
		headerWidth = Math.floor((containerWidth - gutterWidth) * 0.35);
	}

	d3.select('.header').attr('style', function() {
		var s = '';
		if (!isMobile) {
			s += 'width: ' + headerWidth + 'px; ';
			s += 'float: left; ';
		}
		return s;
	});
	d3.select('#graphic').attr('style', function() {
		var s = '';
		if (!isMobile) {
			s += 'width: ' + mapWidth + 'px; ';
			s += 'float: right; ';
		}
		return s;
	});

	// Render the map!
	renderUSAMap({
		container: '#graphic',
		width: mapWidth,
		geoData: geoData,
		data: DATA
	});

	// Update iframe
	if (pymChild) {
		pymChild.sendHeight();
	}
};

var renderUSAMap = function(config) {
	/*
	 * Setup
	 */
	var aspectWidth = 3;
	var aspectHeight = 1.95;
	var defaultScale = 820;

	var mapProjection = null;
	var path = null;
	var chartWrapper = null;
	var chartElement = null;

	var dataColumn = 'amt_billions';

	// Calculate actual map dimensions
	var mapWidth = config['width'];
	var mapHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth);

	/*
	 * Extract topo data.
	 */
	var mapData = config['geoData']['features'];

	/*
	 * Create the map projection.
	 */
	var mapScale = (mapWidth / DEFAULT_WIDTH) * defaultScale;
	var scaleFactor = mapWidth / DEFAULT_WIDTH;

	projection = d3.geo
		.albersUsa()
		.scale(mapScale) // zoom level or size
		.translate([mapWidth / 2, mapHeight / 2]);

	path = d3.geo.path().projection(projection);

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
		.attr('width', mapWidth)
		.attr('height', mapHeight)
		.append('g')
		.attr('transform', 'translate(0,0)');

	/*
	 * Render states.
	 */
	// Land outlines
	chartElement
		.append('g')
		.attr('class', 'states')
		.selectAll('path')
		.data(mapData)
		.enter()
		.append('path')
		.attr('d', path)
		.attr('class', function(d) {
			var row = _.findWhere(config['data'], {
				state_full: d['properties']['name']
			});

			if (row) {
				return (
					'state-' +
					classify(d['properties']['name']) +
					' income-tax-' +
					classify(row['income_tax_type'])
				);
			}

			return 'state-' + classify(d['properties']['name']);
		});
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
