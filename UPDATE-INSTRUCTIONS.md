# Science Lab Notebook — v4 table update

Replace these three files in the existing GitHub repository:

- `index.html`
- `styles.css`
- `app.js`

## What changed

- Raw Data and Processed Data tables now start with completely blank title fields.
- The title label reads `Table 1 Title`, `Table 2 Title`, etc.; it is no longer described as optional.
- A blank table title stays blank in Preview Report and the final PDF. No automatic `Table 1` title is inserted.
- All column headings begin blank with `Heading` shown only as placeholder text.
- The first column is no longer pre-filled or presented as `Trial`.
- Students are reminded that they can click directly into heading cells to enter or change headings.
- Each table now has an `+ Grouped heading` button. By default, it spans the last three columns when possible.
- Students can change where the grouped heading begins and how many adjacent columns it spans.
- The grouped heading appears the same way in the editor, Preview Report, and final PDF.
- The same table system is used for Raw Data and Processed Data.
- Graphs & Figures remains optional and unchanged.

## Upload to GitHub

1. Open the existing `science-lab-notebook` repository.
2. Choose **Add file → Upload files**.
3. Upload the three replacement files listed above.
4. Commit the changes directly to `main`.
5. Wait briefly for GitHub Pages to redeploy.
6. Hard refresh the live page if needed (`Command + Shift + R` on Mac).

## Suggested test

Create one raw-data table with four columns. Click **+ Grouped heading**. It should automatically span the last three columns. Type a shared label in the grouped heading, then type separate headings in each of the four heading cells. Open **Preview Report** and confirm that the grouped heading spans the intended columns. Download a test PDF and check that the same structure is preserved.
