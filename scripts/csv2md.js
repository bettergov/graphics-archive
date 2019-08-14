var fs = require('fs');
var path = require('path');
var csv = require('fast-csv');
var json2csv = require('json2csv');
var csvToMarkdown = require('csv-to-markdown-table');

const rootDir = path.dirname(__dirname);
const csvPath = path.join(rootDir, 'contents.csv');
const stream = fs.createReadStream(csvPath);
const rows = [];

const mdPath = path.join(rootDir, 'README.md');
const writeStream = fs.createWriteStream(mdPath);

writeStream.write(`# graphics-archive
An archive of all of our graphics.

Many of these graphics were created using [bettergov/workspace-dailygraphics-next](https://github.com/bettergov/workspace-dailygraphics-next).

## Updating this repo

1. Copy new graphics into the root level.

2. If they are timestamped, run \`node scripts/organizeByMonth.js\` to auomatically sort them.

3. Manually add the new graphics to contents.csv.

4. Run \`node scripts/csv2md.js\` to automatically update the listing in this README.

## Contents
`);

writeStream.on('finish', () => {
  console.log(`Wrote all data to ${mdPath}`);
});

// parse and transform original csv
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
    const parsed = json2csv.parse(
      rows.sort((a, b) => {
        if (a.localPath < b.localPath) {
          return -1;
        }
        if (a.localPath > b.localPath) {
          return 1;
        }
        return 0;
      }),
      { fields, quote: '' }
    );
    const md = csvToMarkdown(parsed, ',', true);

    writeStream.write(md);

    // fs.writeFile(mdPath, md, err => {
    //   if (err) return console.error(err);
    //   console.log(`Saved ${mdPath}`);
    // });
    writeStream.end();
  });
