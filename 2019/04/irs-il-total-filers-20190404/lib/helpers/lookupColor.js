var COLORS = require('./colors');

module.exports = colorStr => (colorStr in COLORS ? COLORS[colorStr] : colorStr);
