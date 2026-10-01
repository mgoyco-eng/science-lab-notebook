# Science Lab Notebook — Version 16 (PDF table page-break improvement)

## What changed
PDF data tables now follow this rule:

- If a complete table can fit on one PDF page, it will be kept together.
- If it does not fit in the remaining space on the current page, it starts on the next page.
- If a table is genuinely taller than one page, it may continue onto the next page.
- A single data row will not be split between two pages.
- Column/group headings repeat automatically when a long table continues on another page.
- A table title stays with the table when the table can fit on one page.

## File to replace in GitHub
Only replace:
- `app.js`

## Suggested commit message
`Improve PDF table page breaks`

After GitHub Pages republishes, create a test report with:
1. a short table placed near the bottom of a page, and
2. a long table with enough rows to require two pages.
