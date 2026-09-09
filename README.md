# AI Driven Consultancy QA Automation Framework

This repository contains an enterprise-grade QA Automation framework built using Playwright.

## Prerequisites
- Node.js (v18+)

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Install Playwright browsers:
   ```bash
   npx playwright install
   ```

## Running Tests
Run tests locally using the default environment (`qa`):
```bash
npm run test
```

Run tests with UI mode:
```bash
npm run test:ui
```

Run tests against a specific environment (dev, staging):
```bash
ENV=dev npm run test
```

## Reporting
Generate and open the Allure report:
```bash
npm run report
```

## CI/CD and Sharding
Playwright test sharding allows you to distribute tests across multiple CI machines.
To run a specific shard:
```bash
npx playwright test --shard=1/3
```
In your CI pipeline, upload the `blob` reports from each shard, download them in a merge job, and run:
```bash
npx playwright merge-reports --reporter html ./allure-results
```
Note: Ensure Allure results are merged or generated appropriately depending on your CI plugin.
