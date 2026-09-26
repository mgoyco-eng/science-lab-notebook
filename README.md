# Science Lab Notebook — GitHub Pages Build

This folder contains a static Science Lab Notebook designed for in-class student report writing.

## Files to upload

Upload these three files to the root of the GitHub repository:

- `index.html` — page structure and all student-facing text
- `styles.css` — I²-inspired visual design
- `app.js` — report behavior, monitoring, tables, preview, watermark, image uploads, and PDF generation

The page also loads **jsPDF** and **jsPDF-AutoTable** from jsDelivr when it opens so it can create the final PDF in the browser. No database or server is required.

## What this version does

- No Save Draft or Load Draft buttons.
- No browser storage (`localStorage` or `sessionStorage`) for student work.
- No complete physics example, example-loader button, or hidden example data.
- Automatically fills date and time and keeps them read-only.
- Requires Experiment Title, Teacher, Student Name, and a non-empty Class Code before the report unlocks.
- The Class Code is only used as an unlock field; the code is not checked against a stored password.
- Keeps the MYP / DP programme menu.
- Uses this report order:
  1. Research Question
  2. Background Information
  3. Variables
  4. Hypothesis
  5. Materials
  6. Procedure
  7. Raw Data
  8. Processed Data
  9. Conclusion (CER)
  10. Evaluation
  11. Improvements
  12. References (APA 7)
- Allows report parts to be removed with a confirmation warning and restored while the same page remains open.
- Controlled Variables can be added/removed and include the variable, how it is controlled, and the possible effect if it is not controlled.
- Materials and Procedure use one typed line at a time; the PDF does not add bullets or numbers.
- Raw Data and Processed Data have editable tables with add/remove row and column controls and multiple-table support.
- Processed Data includes Description of Calculation, one Sample Calculation, optional handwritten calculation image, editable processed-data tables, and optional graph/figure uploads.
- Students can preview the complete report before downloading it.
- Copy, cut, paste, drag/drop, right-click, browser Save, and browser Print shortcuts are blocked while the report is active and attempts are counted.
- A repeating student-specific watermark appears on screen after the report unlocks.
- Focus monitoring counts short tab/window departures and Focus Mode exits.
- Long interruptions that resemble device sleep are recorded separately to reduce false tab-switch counts.
- Focus Mode requests a screen wake lock when the browser supports it.
- Final PDF includes the report and an assessment-activity summary.
- Final download locks editing for the remainder of that open tab but allows the submitted PDF to be downloaded again.

## Important limitations

### The page intentionally does not save student work

Refreshing, closing the tab, navigating away, browser crashes, or device problems can destroy the current report. The browser may show a leave-page warning, but the wording and behavior are controlled by the browser.

### Focus monitoring is a deterrent, not a lockdown browser

Browsers do not provide perfect information about why a page became inactive. This version uses a heartbeat, visibility/focus events, Page Lifecycle signals when available, and screen wake lock in Focus Mode. Long interruptions that look like device sleep are separated from ordinary departures, but no browser-only solution can perfectly distinguish every sleep event from every long tab switch.

### Screenshots cannot be reliably blocked by a normal webpage

The on-screen watermark is the deterrent. The page does not claim to detect or prove screenshots.

### PDF libraries

The final PDF depends on jsPDF and jsPDF-AutoTable loading from `cdn.jsdelivr.net`. Test the page on the school network before using it with students. If that CDN is blocked by the school network, the two libraries can be downloaded and stored in the repository later so the page is fully self-contained.

## Publish as a new GitHub Pages site

1. Sign in to GitHub.
2. Click **New repository**.
3. Give the repository a name, for example `science-lab-notebook`.
4. Make it **Public** if you are using standard GitHub Pages.
5. Create the repository.
6. Click **Add file → Upload files**.
7. Upload `index.html`, `styles.css`, and `app.js` from this folder.
8. Commit the files to the `main` branch.
9. Open **Settings → Pages**.
10. Under **Build and deployment**, choose **Deploy from a branch**.
11. Select **main** and **/(root)**, then click **Save**.
12. Wait a minute or two for GitHub Pages to publish the site.
13. Open the URL GitHub provides and complete the testing checklist below before sharing it with students.

## Replace an existing GitHub Pages site

If you want to use an existing repository instead of creating a new one:

1. Download or otherwise back up the current repository first.
2. In the repository root, replace the existing `index.html`, `styles.css`, and `app.js` with the three files in this folder.
3. Commit the changes to `main`.
4. If GitHub Pages is already enabled for that repository, the public page will rebuild automatically.
5. Hard-refresh the published page and run the full testing checklist.

## Testing checklist before student use

1. Open the published page in the same browser students normally use.
2. Confirm the title has no image and uses the navy/teal I²-inspired design.
3. Confirm Date and Time fill automatically and cannot be edited.
4. Confirm the report stays locked until Experiment Title, Teacher, Student Name, and Class Code contain text.
5. Enter any non-empty Class Code and confirm the report unlocks.
6. Confirm the watermark includes the student name, class code, and date.
7. Try copy, cut, paste, right-click, drag/drop, Cmd/Ctrl+S, and Cmd/Ctrl+P. Confirm they are blocked and the counter increases.
8. Enter Focus Mode and confirm the page enters full screen. Leave Focus Mode and confirm the Focus Exit count increases.
9. Switch briefly to another tab/application and return. Confirm Left Notebook increases.
10. Test a laptop sleep/wake cycle. Confirm a long interruption is more likely to appear under Possible Sleep / Long Inactive instead of automatically increasing Left Notebook.
11. Remove a report section. Confirm the warning appears, the section disappears from the outline, and a Restore button appears.
12. Restore the section and confirm its previously typed content is still there.
13. Add/remove Controlled Variable rows.
14. Build a Raw Data table: edit headers/cells, add/remove rows and columns, and add a second table.
15. Do the same for Processed Data.
16. Upload a handwritten sample calculation image.
17. Optionally add a graph/figure and check its preview.
18. Click **Preview Report**. Check that tables wrap acceptably and removed sections are absent.
19. Click **Return to Editing** and make a correction.
20. Preview again and confirm the correction appears.
21. Click **Download Final Report** and confirm the warning appears before final download.
22. Confirm a PDF downloads and the report becomes read-only.
23. Confirm **Download Submitted Report** downloads another copy while the tab remains open.
24. Confirm **Start New Report** warns that the current work will be lost.
25. In a disposable test session, refresh before downloading and confirm the typed report is gone.

## Teacher-use recommendation

For the first live trial, have students enter Focus Mode only after the report unlocks, and tell them explicitly that the page does not save. Have them use Preview Report before the final download and verify that the PDF is visible in their Downloads folder before they close the tab.
