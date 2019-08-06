var fs = require('fs');
var path = require('path');
var csv = require('fast-csv');
var json2csv = require('json2csv');
var csvToMarkdown = require('csv-to-markdown-table');

const rootDir = path.dirname(__dirname);
const csvPath = path.join(rootDir, 'contents.csv');
const stream = fs.createReadStream(csvPath);

const rows = [];

const parser = csv.parse({ headers: true }).transform(row => ({
  localPath: `[${row.localPath}](${row.localPath})`,
  remotePath: `[${row.remotePath}](https://graphics.bettergov.org/${
    row.remotePath
  })`,
  embeddedOn: `[${row.embeddedOn}](${row.embeddedOn})`
}));

stream
  .pipe(parser)
  .on('data', row => {
    rows.push(row);
  })
  .on('end', () => {
    const fields = ['localPath', 'remotePath', 'embeddedOn'];
    const parsed = json2csv.parse(rows, { fields, quote: '' });
    const md = csvToMarkdown(parsed, ',', true);
    const mdPath = path.join(rootDir, 'contents.md');

    fs.writeFile(mdPath, md, err => {
      if (err) return console.error(err);
      console.log(`Saved ${mdPath}`);
    });
  });
