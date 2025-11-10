import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login page', async ({ page }) => {
    await expect(page).toHaveTitle(/Mini Messenger|Messenger/);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /sign in/i }).click();

    // HTML5 validation should prevent submission
    const identifierInput = page.getByLabel(/email or username/i);
    await expect(identifierInput).toHaveAttribute('required');
  });

  test('should navigate to registration page', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: /sign up/i }).click();
    await expect(page).toHaveURL(/.*register/);
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();
  });

  test('should navigate to forgot password page', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: /forgot password/i }).click();
    await expect(page).toHaveURL(/.*forgot-password/);
  });

  test('should attempt login with credentials', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/email or username/i).fill('testuser');
    await page.getByLabel(/password/i).fill('password123');

    // Click sign in button
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for response (will likely show error since we don't have a real backend)
    // But we're testing the flow works
    await page.waitForTimeout(1000);
  });

  test('should display registration form', async ({ page }) => {
    await page.goto('/register');

    await expect(page.getByLabel(/username/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/^password/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /sign up/i })).toBeVisible();
  });

  test('should validate registration form fields', async ({ page }) => {
    await page.goto('/register');

    const usernameInput = page.getByLabel(/username/i);
    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/^password/i).first();

    await expect(usernameInput).toHaveAttribute('required');
    await expect(emailInput).toHaveAttribute('required');
    await expect(passwordInput).toHaveAttribute('required');
  });
});
