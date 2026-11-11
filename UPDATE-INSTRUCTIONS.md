# Science Lab Notebook — Version 22

This update fixes long data-table titles in the downloaded PDF.

## What changed
For Raw Data and Processed Data tables:
- the title is centered above the table
- long titles automatically wrap to the usable table width
- the full title remains visible instead of being cut off
- the table begins lower so it never overlaps a multi-line title
- page-break calculations now account for the wrapped title height

This version also preserves the multiple handwritten calculation-image feature.

## Files to replace in GitHub
Replace:
- `index.html`
- `app.js`

## Suggested commit message
`Wrap and center PDF data table titles`

After GitHub Pages republishes, hard-refresh the page.
