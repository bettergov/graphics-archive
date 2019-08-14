# graphics-archive

An archive of all of our graphics.

Many of these graphics were created using [bettergov/workspace-dailygraphics-next](https://github.com/bettergov/workspace-dailygraphics-next).

## Updating this repo

1. Copy new graphics into the root level.

2. If they are timestamped, run \`node scripts/organizeByMonth.js\` to auomatically sort them.

3. Manually add the new graphics to contents.csv.

4. Run \`node scripts/csv2md.js\` to automatically update the listing in this README.

## Fixing broken old graphics

The structure of each graphic is a bit scattered; some are raw outputs; some are source files using [nprapps/dailygraphics-next](https://github.com/nprapps/dailygraphics-next) for build and deployment; some are source and build files using [nprapps/dailygraphics](https://github.com/nprapps/dailygraphics).

This can make redeveloping or repurposing a haphazard process.

You may also hit some bumps with the code of the old graphics themselves.

### Working on old dailygraphics projects

Take a look at ["Migrating from the original dailygraphics rig"](https://github.com/nprapps/dailygraphics-next#migrating-from-the-original-dailygraphics-rig) for tips on how to migrate old projects to use the new rig.

### Errors with dailygraphics-next projects (2019 on)

For a while, I was using a forked version of the dailygraphics rig that made certain assumptions and added certain functionality. This means that projects might raise errors now that they wouldn't have at creation. Here's a couple examples and how to fix them.

**Error in undefined: t.markdown is not a function**

At the top of `_content.html`, paste this line to define t.markdown in the template:

```html
<% t.markdown = require('markdown-it'); %>
```

**Unexpected value NaN parsing width attribute.**

Replace a code block that looks like this:

```js
var props = flow(
  mapValues(parseValue),
  omitBy(d => d == null)
)(PROPS);
```

With this:

```js
var props = PROPS;
```

## Contents
