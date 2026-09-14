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

function writeMatrix(tests: string[]) {
  fs.writeFileSync('matrix.json', JSON.stringify(tests), 'utf8');
  console.log(`matrix.json written with ${tests.length} test(s): ${JSON.stringify(tests)}`);
}

function main() {
  const blobDir = path.resolve(process.argv[2] || 'previous-blob-reports');
  const listFile = path.join(process.cwd(), 'failed-tests.json');

  if (!fs.existsSync(blobDir)) {
    console.log(`Blob dir not found: ${blobDir}`);
    writeMatrix([]);
    return;
  }

  let raw = '';
  try {
    // Merge blobs and capture JSON output
    raw = execSync(
      `npx playwright merge-reports ${blobDir} --reporter=json`,
      { cwd: process.cwd(), encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_NAME: listFile } }
    );
  } catch (err: any) {
    // playwright exits non-zero when there are failures — that's expected
    raw = err.stdout || '';
  }

  // Try reading from PLAYWRIGHT_JSON_OUTPUT_NAME file first
  if (fs.existsSync(listFile)) {
    raw = fs.readFileSync(listFile, 'utf8');
    fs.unlinkSync(listFile);
  }

  if (!raw.trim()) {
    console.log('No output from merge-reports');
    writeMatrix([]);
    return;
  }

  // Extract JSON from output (might have extra lines before it)
  const startIndex = raw.indexOf('{');
  const endIndex = raw.lastIndexOf('}');

  if (startIndex === -1 || endIndex === -1) {
    console.log('Could not find JSON in merge output');
    writeMatrix([]);
    return;
  }

  let data: any;
  try {
    data = JSON.parse(raw.substring(startIndex, endIndex + 1));
  } catch (e) {
    console.log('Failed to parse JSON:', e);
    writeMatrix([]);
    return;
  }

  const testsToRun: string[] = [];

  if (data && data.suites) {
    for (const rootSuite of data.suites) {
      const file = rootSuite.file;
      findFailedSpecs(rootSuite, file, testsToRun);
    }
  }

  writeMatrix(testsToRun);
}

main();
