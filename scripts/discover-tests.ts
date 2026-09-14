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

function main() {
  const suiteTag = process.argv[2] || 'smoke';
  const listFile = path.join(process.cwd(), 'temp-list.json');

  try {
    // Run playwright list and output to temp-list.json
    execSync(`npx playwright test --grep "@${suiteTag}" --list --reporter=json > temp-list.json`, { 
      cwd: process.cwd(), 
      stdio: 'pipe' 
    });
  } catch (error) {
    // It's normal for Playwright to throw an error if no tests match
  }

  if (!fs.existsSync(listFile)) {
    console.log(JSON.stringify([]));
    return;
  }

  let raw = fs.readFileSync(listFile, 'utf8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    // Playwright sometimes outputs debugging info or warnings before the actual JSON
    const startIndex = raw.indexOf('{');
    const endIndex = raw.lastIndexOf('}');
    if (startIndex !== -1 && endIndex !== -1) {
      try {
        data = JSON.parse(raw.substring(startIndex, endIndex + 1));
      } catch (e2) {
        console.log(JSON.stringify([]));
        return;
      }
    } else {
      console.log(JSON.stringify([]));
      return;
    }
  }

  const testsToRun: string[] = [];

  if (data && data.suites) {
    for (const rootSuite of data.suites) {
      const file = rootSuite.file;
      extractSpecs(rootSuite, file, testsToRun);
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
