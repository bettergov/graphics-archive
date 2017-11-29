

ai2html + BGA
=============

> ai2html is an open-source script for Adobe Illustrator that converts your Illustrator documents into html and css.

It is a graphics editor's best friend, enabling easy visual editing in Illustrator, with sharp text rendering and placement managed with html and css. The script was built by The New York Times. Instructions for using ai2html are [here](http://ai2html.org/).

BGA-specific ai2html files:

 - `ai2html.js` includes config options customized with BGA defaults, fonts, etc.
 - `bga-template.html` is our template, into which ai2html can plug in items like headline, leadin, notes and the graphic itself.
 - `ai2html-resizer.js` is a resizing script that scales the graphic to the best-fitting artboard (e.g. an 800px-wide version for large screens, a 300px version for mobile).

Loading into stories
-------
For reasons I'm not smart enough to have figured out yet, ai2html's resizer script doesn't get along with [pym.js](http://blog.apps.npr.org/pym.js/), NPR's responsive iframe script. Specifically on iPhone, pym.js opts for the widest image possible regardless of screen size.

![Why do you hate ai2html + pym, Steve Jobs](https://lh3.googleusercontent.com/a0JFtk7-Tc_qIumzXezMk_il9Xev9zIo_BJ1FmeIz9Z6GGBGdqALaIz27CCcxl5xVjLk2dX0DJZpRXgmYNG5qaQi_s4byohhxdjuQ_5EevJ58XTY5eWwiVnxXrc_JXpvTWbWt5mL5swvBRui_W1xDCZyFD6G78DU8ebaxcY6Z08l7tu7ppUn7PDNBl0-EfysTQRgED1DbGZkDLvH8hNxC6bT9YZ779HNnvmZGa8F6M5kDszznYKnc85IEn9FEsdJ9BFANsezDSWTufgFEX-sSa4-RQR92yzuTHYfDT05gInGajkaDBt-CxmClfzUK_oLKiH9-5d-rS6Vhasu5iMtPSn9IzMJm_Ojft7Iyic7fufe3O2jcdru9CBta3YUciVZB1b9kh-sXMmxtCPCh5LVjWF_aHY7gXdgaaBykhJLV-vFAzc8L-C1v-JiNehhAlj3Jb3lP25zuRq_XTEbdzkIVYlYjJn8MWabw2x6P9D4ioWos4dQ3RcIeiwKoysV6-dYuS8XFAhUckqRBauSPmXDTAXS0HCihiOAi1DxM3FqwmF_uqESZsf8hxjLXttsFOTHdJjkcyFyDQgkCcILhmIjBBH3kmRHYEajtvv67ux_=w407-h740-no)

Therefore we inject the ai2html content directly into the page.

**Parent:**
We take advantage of [HTML Imports](https://onextrapixel.com/html5-imports-embedding-an-html-file-inside-another-html-file/) to load the graphic content and style onto the parent page.

Not every browser natively handles imports! For those that don't, we can still take advantage of workarounds like [polyfills](https://www.webcomponents.org/polyfills/).

In the head, we prep for import...

    <script>
      function supportsImports() {
        return 'import' in document.createElement('link');
      }
      
      if(supportsImports()) {
        console.log("Gucci");
      } else {
        console.log("Cry");
      }
    
      function handleLoad(e) {
        console.log('Loaded import: ' + e.target.href);
        // TODO: bind to target element
      }
      function handleError(e) {
        console.log('Error loading import: ' + e.target.href);
      }
    </script>
After which we do the import thing...

    <link rel="import" href="//graphics.bettergov.org/..." onload="handleLoad(event)" onerror="handleError(event)">

Then we inject the content into an element on the page, like `<figure class="media align-center graphic" data-import-src="graphics/national-nuke-age/">`

**Child:**
Just make sure you've href'd the resizer script and that your style declarations are all localized. If it applies beyond the graphic, consider pulling it out of the local context. Styles will be broadly applied to the parent page.