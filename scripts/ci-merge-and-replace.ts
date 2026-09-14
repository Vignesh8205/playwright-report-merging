import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

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
    } catch (e) {}
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
  const initialDir = path.resolve(process.argv[2]);
  const rerunDir = path.resolve(process.argv[3]);
  const outputDir = path.resolve(process.argv[4]);

  console.log(`--- CI Merge and Replace Workflow ---`);
  console.log(`Initial Dir: ${initialDir}`);
  console.log(`Rerun Dir: ${rerunDir}`);
  console.log(`Output Dir: ${outputDir}`);

  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
  fs.mkdirSync(outputDir, { recursive: true });

  const rerunZips = getZipFiles(rerunDir);
  const rerunTestIds = new Set<string>();

  for (const [index, zipFile] of rerunZips.entries()) {
    const zip = new AdmZip(zipFile);
    const reportEntry = zip.getEntry('report.jsonl');
    if (reportEntry) {
      const content = reportEntry.getData().toString('utf8');
      const ids = extractTestIds(content);
      ids.forEach(id => rerunTestIds.add(id));
    }
    // Copy rerun zip to output folder
    const targetPath = path.join(outputDir, `rerun-${index}.zip`);
    fs.copyFileSync(zipFile, targetPath);
  }

  console.log(`Found ${rerunTestIds.size} test(s) in rerun. Filtering from initial...`);

  const initialZips = getZipFiles(initialDir);
  for (const [index, zipFile] of initialZips.entries()) {
    const zip = new AdmZip(zipFile);
    const reportEntry = zip.getEntry('report.jsonl');

    if (reportEntry) {
      const originalContent = reportEntry.getData().toString('utf8');
      const newContent = filterEventsByTestId(originalContent, rerunTestIds);
      zip.updateFile('report.jsonl', Buffer.from(newContent, 'utf8'));
    }

    const targetPath = path.join(outputDir, `initial-${index}.zip`);
    zip.writeZip(targetPath);
  }

  console.log('Successfully merged and filtered blobs into:', outputDir);
}

main();
