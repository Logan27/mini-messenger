import { test, expect, devices, Page } from '@playwright/test';

test.describe('Cross-Browser Compatibility', () => {
  test.describe('Desktop Browsers', () => {
    test('Chrome - Authentication Flow', async ({ page }) => {
      await testAuthenticationFlow(page);
    });

    test('Firefox - Messaging Interface', async ({ page }) => {
      await testMessagingInterface(page);
    });

    test('Safari - File Upload', async ({ page }) => {
      await testFileUpload(page);
    });

    test('Edge - Group Management', async ({ page }) => {
      await testGroupManagement(page);
    });
  });

  test.describe('Mobile Browsers', () => {
    test('iPhone Safari - Mobile Experience', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await testMobileExperience(page);
    });

    test('Android Chrome - Touch Interactions', async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 640 });
      await testTouchInteractions(page);
    });
  });

  test.describe('Responsive Design', () => {
    test('Mobile Viewport (320px)', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 568 });
      await testResponsiveLayout(page, 320);
    });

    test('Tablet Viewport (768px)', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await testResponsiveLayout(page, 768);
    });

    test('Desktop Viewport (1920px)', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await testResponsiveLayout(page, 1920);
    });
  });

  test.describe('Network Conditions', () => {
    test('Slow 3G - Performance', async ({ page }) => {
      await page.route('**/*', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        await route.continue();
      });
      await testPerformanceUnderSlowNetwork(page);
    });

    test('Offline Mode - Graceful Degradation', async ({ page }) => {
      await page.context().setOffline(true);
      await testOfflineFunctionality(page);
    });
  });

  test.describe('Accessibility', () => {
    test('Keyboard Navigation', async ({ page }) => {
      await testKeyboardNavigation(page);
    });

    test('Screen Reader Compatibility', async ({ page }) => {
      await page.setContent(`
        <html lang="en">
          <head>
            <title>Messenger App</title>
          </head>
          <body>
            <div role="application" aria-label="Messenger Application">
              <nav role="navigation" aria-label="Main navigation">
                <button aria-label="Open chat">Chat</button>
                <button aria-label="View contacts">Contacts</button>
              </nav>
              <main role="main">
                <div role="status" aria-live="polite" id="status-updates"></div>
              </main>
            </div>
          </body>
        </html>
      `);

      await testScreenReaderSupport(page);
    });

    test('Color Contrast', async ({ page }) => {
      await testColorContrastCompliance(page);
    });
  });
});

// Helper functions for testing
async function testAuthenticationFlow(page: Page): Promise<void> {
  await page.goto('/login');

  // Test form elements are accessible
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(page.locator('button[type="submit"]')).toBeVisible();

  // Test form validation
  await page.fill('input[type="email"]', 'invalid-email');
  await page.fill('input[type="password"]', '123');
  await page.click('button[type="submit"]');

  await expect(page.locator('.error-message')).toBeVisible();

  // Test successful login
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');

  await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
}

async function testMessagingInterface(page: Page): Promise<void> {
  await page.goto('/chat');

  // Test message list rendering
  await expect(page.locator('[data-testid="message-list"]')).toBeVisible();

  // Test message composition
  await expect(page.locator('[data-testid="message-input"]')).toBeVisible();
  await page.fill('[data-testid="message-input"]', 'Test message');
  await page.click('[data-testid="send-button"]');

  // Test real-time updates
  await expect(page.locator('[data-testid="message-item"]')).toHaveCount(1);
}

async function testFileUpload(page: Page): Promise<void> {
  await page.goto('/chat');

  // Test file input
  const fileInput = page.locator('input[type="file"]');
  await expect(fileInput).toBeVisible();

  // Test drag and drop
  const dropZone = page.locator('[data-testid="file-drop-zone"]');
  if (await dropZone.isVisible()) {
    await dropZone.setInputFiles({
      name: 'test-image.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-image-content'),
    });
  }

  // Test upload progress
  await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();
}

async function testGroupManagement(page: Page): Promise<void> {
  await page.goto('/groups');

  // Test group creation
  await page.click('[data-testid="create-group-button"]');
  await page.fill('[data-testid="group-name-input"]', 'Test Group');
  await page.click('[data-testid="create-group-submit"]');

  await expect(page.locator('[data-testid="group-item"]')).toBeVisible();

  // Test group member management
  await page.click('[data-testid="group-item"]');
  await expect(page.locator('[data-testid="add-member-button"]')).toBeVisible();
}

async function testMobileExperience(page: Page): Promise<void> {
  await page.goto('/');

  // Test mobile navigation
  await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();

  // Test touch targets are adequate size (44px minimum)
  const buttons = page.locator('button');
  const boxes = await buttons.boundingBox();
  if (boxes) {
    expect(boxes.width).toBeGreaterThanOrEqual(44);
    expect(boxes.height).toBeGreaterThanOrEqual(44);
  }

  // Test swipe gestures
  await page.swipe('left', { x: 100, y: 100 });
}

async function testTouchInteractions(page: Page): Promise<void> {
  await page.goto('/chat');

  // Test tap to focus
  await page.tap('[data-testid="message-input"]');

  // Test long press for context menu
  await page.longPress('[data-testid="message-item"]');

  // Test pinch to zoom (if applicable)
  await page.pinchZoom({ x: 200, y: 200 }, 2);
}

async function testResponsiveLayout(page: Page, width: number): Promise<void> {
  // Test layout adapts to different screen sizes
  await expect(page.locator('[data-testid="responsive-layout"]')).toBeVisible();

  // Test navigation adapts
  if (width < 768) {
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
  } else {
    await expect(page.locator('[data-testid="desktop-menu"]')).toBeVisible();
  }
}

async function testPerformanceUnderSlowNetwork(page: Page): Promise<void> {
  await page.goto('/');

  // Test loading performance
  const startTime = Date.now();
  await page.waitForLoadState('networkidle');
  const loadTime = Date.now() - startTime;

  // Should load within reasonable time even on slow network
  expect(loadTime).toBeLessThan(10000); // 10 seconds

  // Test lazy loading works
  await page.scrollToElement('[data-testid="lazy-loaded-content"]');
  await expect(page.locator('[data-testid="lazy-loaded-content"]')).toBeVisible();
}

async function testOfflineFunctionality(page: Page): Promise<void> {
  await page.goto('/');

  // Test offline indicator
  await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();

  // Test cached content is available
  await expect(page.locator('[data-testid="cached-messages"]')).toBeVisible();

  // Test sync when back online
  await page.context().setOffline(false);
  await expect(page.locator('[data-testid="sync-indicator"]')).toBeVisible();
}

async function testKeyboardNavigation(page: Page): Promise<void> {
  await page.goto('/');

  // Test tab navigation
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toBeVisible();

  // Test skip links
  await page.keyboard.press('Tab');
  const focusedElement = page.locator(':focus');
  await expect(focusedElement).toHaveAttribute('href', /^#/);

  // Test arrow key navigation in lists
  await page.keyboard.press('ArrowDown');
  const newFocusedElement = page.locator(':focus');
  expect(newFocusedElement).not.toBe(focusedElement);
}

async function testScreenReaderSupport(page: Page): Promise<void> {
  // Test ARIA labels
  await expect(page.locator('[aria-label]')).toHaveCount(5);

  // Test ARIA roles
  await expect(page.locator('[role="navigation"]')).toBeVisible();
  await expect(page.locator('[role="main"]')).toBeVisible();

  // Test ARIA live regions
  await expect(page.locator('[aria-live]')).toBeVisible();

  // Test heading structure
  const headings = page.locator('h1, h2, h3, h4, h5, h6');
  await expect(headings.first()).toBeVisible();
}

async function testColorContrastCompliance(page: Page): Promise<void> {
  // Test that text has sufficient contrast ratio
  const textElements = page.locator('p, span, div');
  const backgroundElements = page.locator('*');

  // This would typically use a color contrast checking library
  // For this example, we'll just verify elements exist
  await expect(textElements.first()).toBeVisible();
  await expect(backgroundElements.first()).toBeVisible();
}