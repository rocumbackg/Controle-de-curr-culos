const { test, expect } = require('@playwright/test');
const { execSync } = require('child_process');

test.describe('Resume Submission Tracker', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    // Clear the database before running tests
    try {
      execSync('node verification/clear_db.js', { stdio: 'inherit' });
    } catch (error) {
      console.error('Failed to clear database:', error);
      // Decide if the tests should proceed. For this example, we'll throw.
      throw new Error('Database clearing failed, aborting tests.');
    }

    page = await browser.newPage();
    // Use the local web server to avoid CORS issues
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle' });
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('should allow a user to add a new submission and see it in the history', async () => {
    const newEmail = `test.user.${Date.now()}@example.com`;

    // Fill and submit the form
    await page.fill('#email', newEmail);
    await page.click('button[type="submit"]');

    // Wait for the submission to appear in the history
    // This requires waiting for the database insert and the subsequent fetch and render
    await page.waitForTimeout(2000); // Wait for optimistic update and DB refresh

    // Verify the new submission is in the list
    const historyList = page.locator('#submission-history');
    await expect(historyList).toContainText(newEmail);

    // Take a screenshot for verification
    await page.screenshot({ path: 'verification/verification.png' });
  });

  test('should allow updating the status of a submission', async () => {
    const firstSubmissionSelector = '#submission-history li:first-child';

    // Wait for the first submission to be rendered
    await page.waitForSelector(firstSubmissionSelector);

    const statusSelect = page.locator(`${firstSubmissionSelector} select`);

    // Change status to "Positive"
    await statusSelect.selectOption('Retorno positivo');

    // Wait for DB update, could be improved with a visual indicator
    await page.waitForTimeout(1000);

    // To verify, we'd ideally reload the page and check the persisted state
    await page.reload({ waitUntil: 'networkidle' });

    // Check if the status is correctly set after reload
    const reloadedStatusSelect = page.locator(`${firstSubmissionSelector} select`);
    await expect(reloadedStatusSelect).toHaveValue('Retorno positivo');

    await page.screenshot({ path: 'verification/verification-status-update.png' });
  });
});
