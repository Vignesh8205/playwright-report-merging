import { test, expect } from '@playwright/test';

test.describe('Demo 10 Tests Workflow', () => {
  // Generate 9 tests that always pass
  for (let i = 1; i <= 9; i++) {
    test(`Test ${i} - should always pass`, async () => {
      expect(true).toBe(true);
    });
  }

  // The 10th test that we will intentionally fail first, and fix later
  test(`Test 10 - should fail initially and pass when fixed`, async () => {
    // FIX INSTRUCTION: Change `false` to `true` below to fix the test
    expect(true).toBe(true);
  });
});
