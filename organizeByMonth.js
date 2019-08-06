var fs = require('fs');
var path = require('path');
var mv = require('mv');

// get top-level graphics dirs
const targets = fs
  .readdirSync(__dirname, { withFileTypes: true })
  .filter(Dirent => Dirent.isDirectory())
  .filter(Dirent => {
    var dir = path.join(__dirname, Dirent.name);
    var files = fs.readdirSync(dir);
    return (
      files.includes('graphic_config.py') || files.includes('manifest.json')
    );
  });

targets.forEach(Dirent => {
  var { name } = Dirent;
  var dateString = name.match(/[0-9]{8}$/);

  if (dateString) {
    var year = dateString[0].slice(0, 4),
      month = dateString[0].slice(4, 6);

    var oldPath = path.join(__dirname, name);
    var newPath = path.join(__dirname, year, month, name);

    mv(oldPath, newPath, { mkdirp: true }, err => {
      console.error(err);
    });
  }
});
