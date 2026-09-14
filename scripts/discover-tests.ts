import { execSync } from 'child_process';
import fs from 'fs';

function writeMatrix(tests: string[]) {
  fs.writeFileSync('matrix.json', JSON.stringify(tests), 'utf8');
  console.log(`matrix.json written with ${tests.length} test(s): ${JSON.stringify(tests)}`);
}

function main() {
  const suiteTag = process.argv[2] || 'smoke';

  let raw = '';
  try {
    // Use plain --list (text output) - much more reliable than --reporter=json
    raw = execSync(
      `npx playwright test --grep "@${suiteTag}" --list`,
      { cwd: process.cwd(), encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
  } catch (err: any) {
    // Playwright may exit non-zero even for --list; stdout still has the list
    raw = err.stdout || '';
  }

  if (!raw.trim()) {
    console.log('No output from playwright --list');
    writeMatrix([]);
    return;
  }

  // Parse text list output lines like:
  //   [chromium] › smoke.spec.ts:4:7 › Smoke Test Suite › Smoke Test 1 @smoke
  const seen = new Set<string>();
  const testsToRun: string[] = [];
  const regex = /›\s+([^\s›]+\.(?:spec|test)\.[jt]sx?):(\d+):\d+/g;
  let match;
  while ((match = regex.exec(raw)) !== null) {
    const key = `${match[1]}:${match[2]}`;
    if (!seen.has(key)) {
      seen.add(key);
      testsToRun.push(key);
    }
  }

  writeMatrix(testsToRun);
}

main();
