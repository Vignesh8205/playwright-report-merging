import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

function findFailedSpecs(suite: any, file: string, testsToRun: string[]) {
  if (suite.specs) {
    for (const spec of suite.specs) {
      if (!spec.ok) {
        testsToRun.push(`${file}:${spec.line}`);
      }
    }
  }
  if (suite.suites) {
    for (const subSuite of suite.suites) {
      findFailedSpecs(subSuite, file, testsToRun);
    }
  }
}

function main() {
  const blobDir = process.argv[2] || 'previous-blob-reports';
  const listFile = path.join(process.cwd(), 'failed-tests.json');

  if (!fs.existsSync(blobDir)) {
    fs.writeFileSync('matrix.json', JSON.stringify([]), 'utf8');
    return;
  }

  try {
    // Merge previous blobs into a single JSON report
    execSync(`npx cross-env PLAYWRIGHT_JSON_OUTPUT_NAME=${listFile} npx playwright merge-reports ${blobDir} --reporter=json`, { 
      cwd: process.cwd(), 
      stdio: 'pipe' 
    });
  } catch (error) {
    // Playwright exits with 1 if there were test failures in the report, which is expected here!
  }

  if (!fs.existsSync(listFile)) {
    fs.writeFileSync('matrix.json', JSON.stringify([]), 'utf8');
    return;
  }

  const raw = fs.readFileSync(listFile, 'utf8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    fs.writeFileSync('matrix.json', JSON.stringify([]), 'utf8');
    return;
  }

  const testsToRun: string[] = [];

  if (data && data.suites) {
    for (const rootSuite of data.suites) {
      const file = rootSuite.file;
      findFailedSpecs(rootSuite, file, testsToRun);
    }
  }

  // Cleanup
  if (fs.existsSync(listFile)) {
    fs.unlinkSync(listFile);
  }

  // Output purely the JSON array to matrix.json so GitHub Actions can parse it reliably
  fs.writeFileSync('matrix.json', JSON.stringify(testsToRun), 'utf8');
}

main();
