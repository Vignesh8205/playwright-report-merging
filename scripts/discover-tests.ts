import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

function extractSpecs(suite: any, file: string, testsToRun: string[]) {
  if (suite.specs) {
    for (const spec of suite.specs) {
      testsToRun.push(`${file}:${spec.line}`);
    }
  }
  if (suite.suites) {
    for (const subSuite of suite.suites) {
      extractSpecs(subSuite, file, testsToRun);
    }
  }
}

function writeMatrix(tests: string[]) {
  fs.writeFileSync('matrix.json', JSON.stringify(tests), 'utf8');
  console.log(`matrix.json written with ${tests.length} test(s): ${JSON.stringify(tests)}`);
}

function main() {
  const suiteTag = process.argv[2] || 'smoke';

  let raw = '';
  try {
    // Capture stdout directly - no shell redirect needed
    raw = execSync(
      `npx playwright test --grep "@${suiteTag}" --list --reporter=json`,
      { cwd: process.cwd(), encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
  } catch (err: any) {
    // Playwright exits non-zero when listing with no matches, stdout still has the JSON
    raw = err.stdout || '';
  }

  if (!raw.trim()) {
    console.log('No output from playwright --list');
    writeMatrix([]);
    return;
  }

  // Playwright sometimes outputs extra lines (env injections, deprecation warnings)
  // before the actual JSON — extract just the JSON object
  const startIndex = raw.indexOf('{');
  const endIndex = raw.lastIndexOf('}');

  if (startIndex === -1 || endIndex === -1) {
    console.log('Could not find JSON in playwright output');
    writeMatrix([]);
    return;
  }

  let data: any;
  try {
    data = JSON.parse(raw.substring(startIndex, endIndex + 1));
  } catch (e) {
    console.log('Failed to parse playwright JSON output:', e);
    writeMatrix([]);
    return;
  }

  const testsToRun: string[] = [];

  if (data && data.suites) {
    for (const rootSuite of data.suites) {
      const file = rootSuite.file;
      extractSpecs(rootSuite, file, testsToRun);
    }
  }

  writeMatrix(testsToRun);
}

main();
