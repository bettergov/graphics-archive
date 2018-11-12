// Global vars
var pymChild = null;
var isMobile = false;
var mymap = null;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
  if (Modernizr.svg) {
    mymap = initializeMap(mymap, 'graphic');

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
    container: 'graphic',
    width: containerWidth,
    data: []
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

var renderGraphic = function(config) {
  // Clear existing graphic (for redraw)
  // document.getElementById('graphic').innerHTML = "<div id='map' style='width: 100%; height: 100%;'></div>";
  // var mymap = console.log(L.DomUtil.get('graphic'));
  // console.log(mymap);
  // if (mymap == null) {
  //   intializeMap(mymap, config['container']);
  // }
  // console.log(mymap.getZoom());
};

var initializeMap = function(map, selector) {
  map = L.map(selector, {
    scrollWheelZoom: false
  }).setView([41.6893, -88.6707], 6);

  var corner1 = L.latLng(36.8928, -91.7523),
    corner2 = L.latLng(42.9652, -87),
    bounds = L.latLngBounds(corner1, corner2);

  map.setMaxBounds(bounds);
  map.setMinZoom(6);
  map.setMaxZoom(10);

  // var layer = new L.StamenTileLayer("toner");
  // map.addLayer(layer);
  L.tileLayer('http://tile.stamen.com/toner-lite/{z}/{x}/{y}.png', {
    attribution:
      'Map tiles by <a href="http://stamen.com">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="http://openstreetmap.org">OpenStreetMap</a>, under <a href="http://www.openstreetmap.org/copyright">ODbL</a>.',
    maxZoom: 18
  }).addTo(map);

  function onEachFeature(feature, layer) {
    // does this feature have a property named popupContent?
    if (feature.properties && feature.properties.SiteName) {
      var popupContent = '<p>' + feature.properties.SiteName + '</p>';
      popupContent += '<p>' + feature.properties.SiteAddress + '</p>';
      popupContent +=
        '<p>' +
        feature.properties.SiteCity +
        ', IL ' +
        feature.properties.SiteZip +
        '</p>';
      layer.bindPopup(popupContent);
    }

    if (feature.properties && feature.properties['Facility Name']) {
      var popupContent = '<p>' + feature.properties['Facility Name'] + '</p>';
      popupContent += '<p>' + feature.properties.Address + '</p>';
      // popupContent += '<p>' + feature.properties.SiteCity + ', IL ' + feature.properties.SiteZip + '</p>';
    }

    // if (feature.properties && feature.properties["Violation in 2017"] == "Y") {
    //   popupContent += "<p class=\"status status-violated\">Violated in 2017</p>"
    // } else {
    //   popupContent += "<p class=\"status\">Did not violate in 2017</p>"
    // }

    layer.bindPopup(popupContent, {
      maxWidth: 200
    });
    layer.on('mouseover', function(e) {
      this.openPopup();
    });
    // layer.on('mouseout', function (e) {
    //   this.closePopup();
    // });

    // if (feature.properties && feature.properties["NAME"]) {
    //   var popupContent = "<p>" + feature.properties["NAME"] + " County" + "</p>";
    //   layer.bindPopup(popupContent);
    // }
  }

  // L.geoJSON(ilCounties, {
  //   onEachFeature: onEachFeature,
  //   style: {
  //     "color": "#ccc",
  //     "fillColor": "#ccc"
  //   }
  // }).addTo(map);

  L.geoJSON(usfoSites, {
    onEachFeature: onEachFeature,
    pointToLayer: function(feature, latlng) {
      var has_violated = feature.properties['Violation in 2017'] == 'Y';
      return L.circleMarker(latlng, {
        // stroke: false,
        radius: 8,
        // color: "#ff7800",
        // weight: 10,
        // fillColor: "#ff7800",
        // color: "#000",
        // weight: 1,
        // opacity: 0.5,
        // fillOpacity: 0.8,
        className: has_violated ? 'site site-violated' : 'site'
      });
    }
  }).addTo(map);

  return map;
};

/*
 * Render a graphic.
 */
// var renderGraphic = function (config) {
//   var aspectWidth = 4;
//   var aspectHeight = 3;

//   var margins = {
//     top: 0,
//     right: 15,
//     bottom: 20,
//     left: 15
//   };

//   // Calculate actual chart dimensions
//   var chartWidth = config['width'] - margins['left'] - margins['right'];
//   var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

//   // Clear existing graphic (for redraw)
//   var containerElement = d3.select(config['container']);
//   containerElement.html('');

//   // Create container
//   var chartElement = containerElement.append('svg')
//     .attr('width', chartWidth + margins['left'] + margins['right'])
//     .attr('height', chartHeight + margins['top'] + margins['bottom'])
//     .append('g')
//     .attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');

//   // Draw here!
// }

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
