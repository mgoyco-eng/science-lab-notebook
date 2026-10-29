# Restore Science Lab Notebook to the original interface

This package removes the Halloween theme and the theme toggle completely.

It restores:
- the original regular Science Lab Notebook appearance
- the original header with the Lab Notebook image
- no Halloween toggle
- no Halloween CSS

It keeps the functional updates that existed before the Halloween theme was introduced, including:
- iPad-safe Focus Mode changes
- PDF table page-break improvements
- the existing monitoring/report workflow

## Upload to GitHub
Replace these four files in the repository root:
- `index.html`
- `styles.css`
- `app.js`
- `lab-notebook-heading.png`

## Suggested commit message
`Restore original Science Lab Notebook theme`

After GitHub Pages republishes, hard-refresh with Command + Shift + R.
