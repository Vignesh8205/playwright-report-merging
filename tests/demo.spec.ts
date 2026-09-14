import { test, expect } from '@playwright/test';

test.describe('Demo 10 Tests Workflow', () => {
  test('Test 1 - should always pass', async () => {
    expect(true).toBe(true);
  });

  test('Test 2 - should always pass', async () => {
    expect(true).toBe(true);
  });

  test('Test 3 - currently failing', async () => {
    expect(true).toBe(true);
  });

  test('Test 4 - currently failing', async () => {
    expect(true).toBe(true);
  });

  test('Test 5 - currently failing', async () => {
    expect(true).toBe(true);
  });

  test('Test 6 - should always pass', async () => {
    expect(true).toBe(true);
  });

  test('Test 7 - should always pass', async () => {
    expect(true).toBe(true);
  });

  test('Test 8 - should always pass', async () => {
    expect(true).toBe(true);
  });

  test.only('Test 9 - should always pass', async () => {
    expect(true).toBe(true);
  });

  test.only('Test 10 - should fail initially and pass when fixed', async () => {
    // FIX INSTRUCTION: Change `false` to `true` below to fix the test
    expect(true).toBe(true);
  });
});
