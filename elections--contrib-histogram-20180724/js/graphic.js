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
    data: [
      {
        amt: 2931359.35,
        label: 'Less than $1,000'
      },
      {
        amt: 4253476.8,
        label: '$1,000 to $10,000'
      },
      {
        amt: 4366351,
        label: '$10,000 to $100,000'
      },
      {
        amt: 9280603,
        label: 'Greater than $100,000'
      }
    ]
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
  // var chartWidth = config['width'] - margins['left'] - margins['right'];
  // var chartHeight =
  //   Math.ceil((config['width'] * aspectHeight) / aspectWidth) -
  //   margins['top'] -
  //   margins['bottom'];

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
  var chartElement = containerElement.append('div').classed('list', true);

  var chartItem = chartElement
    .selectAll('div')
    .data(config['data'])
    .enter()
    .append('div')
    .classed('item', true);

  chartItem.selectAll('.item').append('span');
  // .classed('label')
  // .text(function(d) {
  //   console.log(d);
  //   return d.label;
  // });

  // Draw here!
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
