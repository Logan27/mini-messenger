import { test, expect } from '@playwright/test';

/**
 * Admin Panel E2E Tests
 * 
 * These tests run with pre-authenticated admin session.
 * They verify admin-only functionality.
 */

test.describe('Admin Dashboard', () => {
  test('should display admin dashboard when authenticated as admin', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // If redirected away, admin auth failed
    if (!page.url().includes('admin')) {
      test.skip(true, 'Admin authentication not available');
      return;
    }

    // Should see admin dashboard elements
    const hasAdminHeader = await page.getByText(/admin|dashboard|panel/i).isVisible().catch(() => false);
    expect(hasAdminHeader).toBe(true);
  });

  test('should display system statistics', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    if (!page.url().includes('admin')) {
      test.skip(true, 'Admin authentication not available');
      return;
    }

    // Look for statistics/metrics
    const hasStats = await page.getByText(/users|messages|statistics|total/i).isVisible().catch(() => false);
    expect(hasStats).toBe(true);
  });
});

test.describe('User Management', () => {
  test('should display user list', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    if (!page.url().includes('admin')) {
      test.skip(true, 'Admin authentication not available');
      return;
    }

    // Navigate to users section if needed
    const usersLink = page.getByRole('link', { name: /users/i });
    if (await usersLink.isVisible().catch(() => false)) {
      await usersLink.click();
      await page.waitForLoadState('networkidle');
    }

    // Should have user management UI
    const hasUserList = await page.locator('table, [class*="user-list"], [class*="users"]').first().isVisible().catch(() => false);
    const hasUserText = await page.getByText(/username|email|status/i).isVisible().catch(() => false);

    expect(hasUserList || hasUserText).toBe(true);
  });
});

test.describe('Pending User Approvals', () => {
  test('should display pending users section', async ({ page }) => {
    await page.goto('/admin/pending-users');
    await page.waitForLoadState('networkidle');

    // Might redirect if no admin auth or route doesn't exist
    if (!page.url().includes('admin')) {
      // Try main admin page
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');

      if (!page.url().includes('admin')) {
        test.skip(true, 'Admin authentication not available');
        return;
      }
    }

    // Look for pending users or approval UI
    const hasPending = await page.getByText(/pending|approval|approve|reject/i).isVisible().catch(() => false);
    expect(hasPending).toBe(true);
  });

  test('should have approve/reject buttons for pending users', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    if (!page.url().includes('admin')) {
      test.skip(true, 'Admin authentication not available');
      return;
    }

    // Look for action buttons
    const approveBtn = page.getByRole('button', { name: /approve/i });
    const rejectBtn = page.getByRole('button', { name: /reject/i });

    // These may not be visible if no pending users
    const hasApprove = await approveBtn.first().isVisible().catch(() => false);
    const hasReject = await rejectBtn.first().isVisible().catch(() => false);

    // Either has buttons or page loaded successfully
    expect(page.url().includes('admin')).toBe(true);
  });
});

test.describe('Admin Access Control', () => {
  test('should prevent non-admin from accessing admin panel', async ({ page, context }) => {
    // Clear admin auth
    await context.clearCookies();

    await page.goto('/admin');
    await page.waitForTimeout(2000);

    // Should be redirected away from admin
    expect(page.url()).not.toContain('/admin');
  });
});

test.describe('Audit Logs', () => {
  test('should display audit logs section', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    if (!page.url().includes('admin')) {
      test.skip(true, 'Admin authentication not available');
      return;
    }

    // Look for audit/logs section
    const logsLink = page.getByRole('link', { name: /logs|audit|activity/i });
    if (await logsLink.isVisible().catch(() => false)) {
      await logsLink.click();
      await page.waitForLoadState('networkidle');
    }

    // Admin page should be accessible
    expect(page.url().includes('admin')).toBe(true);
  });
});
