var pym = require('./lib/pym');
var ANALYTICS = require('./lib/analytics');

var pymChild;

var onWindowLoaded = function() {
  render();

  window.addEventListener('resize', render);

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
};

var render = function() {
  // document.querySelectorAll('.column').forEach(col => {
  //   col.style.height = 15 * col.dataset.total + 'px';
  // });

  // document.querySelectorAll('.highlight').forEach(square => {
  //   square.style.top = 15 * (square.dataset.rank - 1) + 'px';
  // });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;
