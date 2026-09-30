# Science Lab Notebook — Version 15 (iPad-safe mode)

## What changed
- iPad no longer requests true browser fullscreen.
- iPad no longer requests a screen wake lock.
- iPad Focus Mode now unlocks the report as a monitored in-page mode.
- Genuine tab/app hiding is still tracked through `visibilitychange`.
- Focus-loss events on iPad are recorded without opening another blocking modal.
- Desktop/laptop behavior remains unchanged.

## File to replace in GitHub
Only replace:
- `app.js`

## Suggested commit message
`Add iPad-safe Focus Mode`

After GitHub Pages redeploys, fully close the old Safari tab on the iPad, reopen the notebook in a fresh tab, and test again.
