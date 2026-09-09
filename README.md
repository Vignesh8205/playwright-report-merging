# Playwright Report Merging Workflow

This repository demonstrates a workflow for Playwright where we run tests, rerun failed tests, and then merge the blob reports together to form a final HTML report that correctly replaces failed attempts with their corresponding retries.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Install Playwright browsers:
   ```bash
   npx playwright install
   ```

## Workflow Overview

1. **Initial Run:** Run the test suite and output blob reports to `blob-report/initial`.
2. **Rerun Failed:** Rerun the failed tests and output blob reports to `blob-report/rerun`.
3. **Merge:** A custom script merges these reports by updating timestamps and replacing the initial failed test records with their retry records, producing a single merged blob report.
4. **Final Report:** Playwright's `merge-reports` CLI turns the merged blob into a final HTML report.

## Running the Workflow

Run all tests initially:
```bash
npm run test
```

If any tests failed, run the failing tests again:
```bash
npm run test:failed
```

Finally, run the custom merge script which will merge `initial` and `rerun` blob reports, and launch the final merged HTML report:
```bash
npm run test:final-report
```

## How It Works

The `scripts/merge-and-replace.ts` script uses `adm-zip` to extract the blob reports (which are zip files), combine their `report.jsonl` files (removing older failed attempts of the same test if a retry exists), and package them into a new zipped blob report in `blob-report/merged`. Then, it runs the standard `npx playwright merge-reports` to generate a comprehensive HTML report.
