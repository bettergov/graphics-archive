var pym = require("./lib/pym");
require("./lib/webfonts");

var d3 = {
  ...require("d3-dsv"),
  ...require("d3-selection"),
  ...require("d3-jetpack")
};

var parsedCSV = d3.csvParseRows(
  d3.csvFormat(
    // follow-up inspection should be in the first row to preserve order
    DATA.filter(d => "Follow-up Inspection" in d).concat(
      DATA.filter(d => !("Follow-up Inspection" in d))
    )
  )
);

var table = d3
  .select("#chart")
  .html("")
  .append("table.stripe");

th = parsedCSV.shift();

table
  .append("thead")
  .appendMany("tr", [th])
  .appendMany("th", d => d)
  .text(d => d);

table
  .append("tbody")
  .appendMany("tr", parsedCSV)
  .appendMany("td", d => d)
  .text(d => d);

var pymChild;

var onWindowLoaded = function() {
  render();

  window.addEventListener("resize", render);

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
};

var render = function() {
  // Update iframe
  if (pymChild) {
    setTimeout(pymChild.sendHeight(), 10);
  }
};

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;
