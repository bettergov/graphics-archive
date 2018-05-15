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
}

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
        data: []
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render a graphic.
 */
var renderGraphic = function(config) {
    // var aspectWidth = 4;
    // var aspectHeight = 3;

    // var margins = {
    //     top: 0,
    //     right: 15,
    //     bottom: 20,
    //     left: 15
    // };

    // // Calculate actual chart dimensions
    // var chartWidth = config['width'] - margins['left'] - margins['right'];
    // var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // // Clear existing graphic (for redraw)
    // var containerElement = d3.select(config['container']);
    // containerElement.html('');

    // // Create container
    // var chartElement = containerElement.append('svg')
    //     .attr('width', chartWidth + margins['left'] + margins['right'])
    //     .attr('height', chartHeight + margins['top'] + margins['bottom'])
    //     .append('g')
    //     .attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');

    // Draw here!
    var myColor = ["#ffd600","#555"];

    function plotData(id) {
        var canvas;
        var ctx;
        var lastend = Math.PI * -.5;
        var cx, cy, r;
        var percentVal;
        // var myTotal = getTotal();

        canvas = document.getElementById(id);
        ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        cx = canvas.width/2;
        cy = canvas.height/2;
        r = Math.min(cx, cy);

        percentVal = canvas.attributes['data-percent'].value


        var myTotal = 100;
        var myData = [percentVal, myTotal - percentVal];

        for (var i = 0; i < myData.length; i++) {
            ctx.fillStyle = myColor[i];
            ctx.beginPath();
            ctx.moveTo(cx,cy);
            ctx.arc(cx,cy,r,lastend,lastend+
            (Math.PI*2*(myData[i]/myTotal)),false);
            ctx.lineTo(cx,cy);
            ctx.fill();
            lastend += Math.PI*2*(myData[i]/myTotal);
        }
    }

    var charts = document.getElementsByClassName("pie-chart")
    for (var i = 0; i < charts.length; i++) {
        plotData(charts[i].id)
    }

    console.log(document.getElementsByClassName("pie-chart"))
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
