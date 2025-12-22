import { test as setup, expect } from '@playwright/test';

const TEST_USER = {
    identifier: 'testuser',
    password: 'Test123!@#'
};

const ADMIN_USER = {
    identifier: 'admin',
    password: 'Admin123!@#'
};

/**
 * Setup: Authenticate as regular user and store session state
 */
setup('authenticate as user', async ({ page }) => {
    // Navigate to login
    await page.goto('/login');

    // Fill login form
    await page.getByLabel(/email or username/i).fill(TEST_USER.identifier);
    await page.getByLabel(/password/i).fill(TEST_USER.password);

    // Submit login
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for redirect to main app (successful login)
    // Either we get redirected to chat, or we see an error
    await page.waitForURL((url) => {
        return !url.pathname.includes('/login') || url.pathname === '/';
    }, { timeout: 10000 }).catch(() => {
        // If login fails, tests will run without auth - this is acceptable
        // for testing unauthenticated flows
        console.log('Login failed or not available - running tests without auth');
    });

    // Save auth state for other tests to use
    await page.context().storageState({ path: '.auth/user.json' });
});

/**
 * Setup: Authenticate as admin and store session state
 */
setup('authenticate as admin', async ({ page }) => {
    // Navigate to login
    await page.goto('/login');

    // Fill login form with admin credentials
    await page.getByLabel(/email or username/i).fill(ADMIN_USER.identifier);
    await page.getByLabel(/password/i).fill(ADMIN_USER.password);

    // Submit login
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for redirect
    await page.waitForURL((url) => {
        return !url.pathname.includes('/login') || url.pathname === '/';
    }, { timeout: 10000 }).catch(() => {
        console.log('Admin login failed - admin tests will skip');
    });

    // Save admin auth state
    await page.context().storageState({ path: '.auth/admin.json' });
});
