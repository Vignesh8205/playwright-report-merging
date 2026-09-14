import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const BLOB_DIR_RERUN = path.join(__dirname, '../blob-report/rerun');

function main() {
  const timestamp = Date.now();
  const tempDir = path.join(__dirname, `../blob-report/.temp-${timestamp}`);

  console.log(`Running Playwright tests and saving blob to ${tempDir}...`);
  
  try {
    // Run Playwright
    execSync(`npx cross-env PLAYWRIGHT_BLOB_OUTPUT_DIR=${BLOB_DIR_RERUN} playwright test --reporter=blob`, { stdio: 'inherit' });
  } catch (error) {
    console.log('Tests completed (some may have failed).');
  }

  // Immediately merge the results so the baseline is updated
  console.log('\n--- Automatically merging results into baseline ---');
  execSync('npx tsx scripts/merge-and-replace.ts', { stdio: 'inherit' });
}

main();
