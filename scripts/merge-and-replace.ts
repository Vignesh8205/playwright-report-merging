import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { execSync } from 'child_process';

const BLOB_DIR_INITIAL = path.join(__dirname, '../blob-report/initial');
const BLOB_DIR_RERUN = path.join(__dirname, '../blob-report/rerun');
const BLOB_DIR_MERGED = path.join(__dirname, '../blob-report/merged');

function getZipFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(file => file.endsWith('.zip'))
    .map(file => path.join(dir, file));
}

function extractTestIds(jsonlData: string): Set<string> {
  const testIds = new Set<string>();
  const lines = jsonlData.split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line);
      let testId = event.params?.testId;
      if (!testId && event.params?.test?.testId) {
        testId = event.params.test.testId;
      }
      if (testId) {
        testIds.add(testId);
      }
    } catch (e) {
      // ignore parse errors
    }
  }
  return testIds;
}

function filterProjectSuites(suites: any[], excludeTestIds: Set<string>): any[] {
  const result: any[] = [];
  for (const suite of suites) {
    if (suite.testId) {
      if (!excludeTestIds.has(suite.testId)) {
        result.push(suite);
      }
    } else if (suite.entries) {
      const filteredEntries = filterProjectSuites(suite.entries, excludeTestIds);
      if (filteredEntries.length > 0) {
        suite.entries = filteredEntries;
        result.push(suite);
      }
    } else {
      result.push(suite);
    }
  }
  return result;
}

function filterEventsByTestId(jsonlData: string, excludeTestIds: Set<string>): string {
  const lines = jsonlData.split('\n');
  const filteredLines: string[] = [];
  
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line);
      let testId = event.params?.testId;
      if (!testId && event.params?.test?.testId) {
        testId = event.params.test.testId;
      }
      
      if (!testId) {
        if (event.method === 'onProject' && event.params?.project?.suites) {
          event.params.project.suites = filterProjectSuites(event.params.project.suites, excludeTestIds);
          filteredLines.push(JSON.stringify(event));
        } else {
          filteredLines.push(line);
        }
        continue;
      }
      
      if (!excludeTestIds.has(testId)) {
        filteredLines.push(line);
      }
    } catch (e) {
      filteredLines.push(line);
    }
  }
  return filteredLines.join('\n') + '\n';
}

function main() {
  console.log('--- Starting Merge and Replace Workflow ---');

  // 1. Clear merged directory
  if (fs.existsSync(BLOB_DIR_MERGED)) {
    fs.rmSync(BLOB_DIR_MERGED, { recursive: true, force: true });
  }
  fs.mkdirSync(BLOB_DIR_MERGED, { recursive: true });

  // 2. Read rerun blobs and collect all testIds that were rerun
  const rerunZips = getZipFiles(BLOB_DIR_RERUN);
  if (rerunZips.length === 0) {
    console.log('No rerun blobs found. Generating report from initial run only.');
    execSync('npx playwright merge-reports ./blob-report/initial --reporter=html,allure-playwright', { stdio: 'inherit' });
    return;
  }

  const rerunTestIds = new Set<string>();
  for (const [index, zipFile] of rerunZips.entries()) {
    const zip = new AdmZip(zipFile);
    const reportEntry = zip.getEntry('report.jsonl');
    if (reportEntry) {
      const content = reportEntry.getData().toString('utf8');
      const ids = extractTestIds(content);
      ids.forEach(id => rerunTestIds.add(id));
    }
    // Copy rerun zip to merged folder
    const targetPath = path.join(BLOB_DIR_MERGED, `rerun-${index}.zip`);
    fs.copyFileSync(zipFile, targetPath);
  }

  console.log(`Found ${rerunTestIds.size} test(s) in rerun. These will replace initial results.`);

  // 3. Process initial blobs, filtering out the rerun testIds
  const initialZips = getZipFiles(BLOB_DIR_INITIAL);
  for (const [index, zipFile] of initialZips.entries()) {
    const zip = new AdmZip(zipFile);
    const reportEntry = zip.getEntry('report.jsonl');
    
    if (reportEntry) {
      const originalContent = reportEntry.getData().toString('utf8');
      const newContent = filterEventsByTestId(originalContent, rerunTestIds);
      
      // Update the file in the zip
      zip.updateFile('report.jsonl', Buffer.from(newContent, 'utf8'));
    }
    
    // Save modified zip to merged folder
    const targetPath = path.join(BLOB_DIR_MERGED, `initial-${index}.zip`);
    zip.writeZip(targetPath);
  }

  console.log('Successfully filtered initial blob reports.');

  // 4. Generate final HTML report from the merged folder
  console.log('Generating final HTML report...');
  execSync('npx playwright merge-reports ./blob-report/merged --reporter=html', { stdio: 'inherit' });
  console.log('Done! View the report in ./playwright-report');
}

main();
