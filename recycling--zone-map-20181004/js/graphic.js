// Global vars
var pymChild = null;
var isMobile = false;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function () {
  if (Modernizr.svg) {
    pymChild = new pym.Child({
      renderCallback: render
    });
  } else {
    pymChild = new pym.Child({});
  }

  pymChild.onMessage('on-screen', function (bucket) {
    ANALYTICS.trackEvent('on-screen', bucket);
  });
  pymChild.onMessage('scroll-depth', function (data) {
    data = JSON.parse(data);
    ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
  });
};

/*
 * Render the graphic.
 */
var render = function (containerWidth) {
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
    data: []
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

/*
 * Render a graphic.
 */
var renderGraphic = function (config) {
  var aspectWidth = 4;
  var aspectHeight = 6;

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
  var centered;

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
  var color = d3.scaleLinear()
    .domain([1, 20])
    .clamp(true)
    .range(['#fff', '#409A99']);

  var projection = d3.geoMercator()
    .scale(4000)
    // Customize the projection to make the center of Thailand become the center of the map
    // .rotate([-100.6331, -13.2])
    .rotate([41.8339042,-88.0121538])
    .translate([chartWidth / 2, chartHeight / 2]);

  var path = d3.geoPath()
    .projection(projection);

  var mapLayer = chartElement.append('g')
    .classed('map-layer', true);

  var mapData = recyclingJson;

  var features = mapData.features;

  // Update color scale domain based on data
  // color.domain([0, d3.max(features, nameLength)]);

  // Draw each province as a path
  mapLayer.selectAll('path')
    .data(features)
    .enter().append('path')
    .attr('d', path)
    .attr('vector-effect', 'non-scaling-stroke');
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
