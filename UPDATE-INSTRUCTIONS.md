# Science Lab Notebook — Version 14 (iPad monitoring fix)

## What changed
This version fixes false “Left notebook” events on iPad/iPadOS Safari.

- iPad/iPadOS no longer uses `window.blur` as a leave-page signal.
- Genuine page hiding is still monitored through `visibilitychange`.
- A short internal-interaction grace period was added for clicks/touches inside the notebook.
- Buttons such as Remove Part, Preview Report, and Download Final Report should now work normally on iPad.
- Laptop/desktop monitoring remains in place.

## File to replace in GitHub
Only replace:
- `app.js`

The other included files are provided only so this ZIP is a complete snapshot.

## Suggested commit message
`Fix iPad focus monitoring`

After GitHub Pages redeploys, hard-refresh the site on the iPad and test:
1. Remove/restore a section
2. Preview Report
3. Download Final Report
4. Switch to another tab/app and return
