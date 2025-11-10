# Testing Documentation

This document describes the testing setup and practices for the Mini Messenger frontend application.

## Testing Stack

- **Unit & Integration Tests**: Vitest + React Testing Library
- **E2E Tests**: Playwright
- **Coverage**: Vitest Coverage (v8 provider)

## Running Tests

### Unit and Integration Tests

```bash
# Run all unit and integration tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

### E2E Tests

```bash
# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run E2E tests in a specific browser
npx playwright test --project=chromium
```

## Test Structure

### Unit Tests

Located in `src/**/__tests__/` directories alongside the code they test.

Example structure:
```
src/
  services/
    auth.service.ts
    __tests__/
      auth.service.test.ts
  utils/
    imageOptimization.ts
    __tests__/
      imageOptimization.test.ts
  hooks/
    use-toast.ts
    __tests__/
      use-toast.test.ts
```

### Integration Tests

Located in `src/tests/integration/` directory.

Tests user flows and component integration:
- Login flow
- Registration flow
- Message sending
- File upload
- Group creation

### E2E Tests

Located in `e2e/` directory.

Tests complete user journeys:
- `auth.spec.ts` - Authentication flows
- `messaging.spec.ts` - Messaging and chat features
- `admin.spec.ts` - Admin panel functionality
- `video-call.spec.ts` - Video/voice calling features

## Coverage Requirements

The project enforces **80% minimum coverage** for:
- Lines
- Functions
- Branches
- Statements

Coverage reports are generated in:
- `coverage/` directory
- HTML report: `coverage/index.html`
- LCOV report: `coverage/lcov.info`

## Writing Tests

### Unit Test Example

```typescript
import { describe, it, expect, vi } from 'vitest';
import { myFunction } from '../myFunction';

describe('myFunction', () => {
  it('should do something', () => {
    const result = myFunction('input');
    expect(result).toBe('expected output');
  });
});
```

### Integration Test Example

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('should handle user interaction', async () => {
    const user = userEvent.setup();
    render(<MyComponent />);

    await user.click(screen.getByRole('button'));
    expect(screen.getByText('Result')).toBeInTheDocument();
  });
});
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test';

test('user can login', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'user@example.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL('/dashboard');
});
```

## Mocking

### API Mocking

We use MSW (Mock Service Worker) for API mocking in tests:

```typescript
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  http.get('/api/users', () => {
    return HttpResponse.json({ users: [] });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Module Mocking

Use Vitest's `vi.mock()` for module mocking:

```typescript
vi.mock('@/services/auth.service', () => ({
  authService: {
    login: vi.fn(),
    logout: vi.fn(),
  },
}));
```

## CI/CD Integration

Tests run automatically on:
- Push to `main`, `develop`, or `claude/**` branches
- Pull requests to `main` or `develop`

The CI pipeline:
1. Runs unit and integration tests
2. Generates coverage reports
3. Runs E2E tests in multiple browsers
4. Uploads test artifacts and reports

See `.github/workflows/frontend-tests.yml` for details.

## Test Configuration

### Vitest Configuration

See `vitest.config.ts` for:
- Test environment (jsdom)
- Coverage thresholds (80%)
- Setup files
- Test patterns

### Playwright Configuration

See `playwright.config.ts` for:
- Browser projects (Chromium, Firefox, WebKit, Mobile)
- Base URL and server settings
- Retry and parallel execution settings
- Screenshot and video capture settings

## Best Practices

1. **Write tests first** (TDD when possible)
2. **Test behavior, not implementation**
3. **Keep tests simple and focused**
4. **Use descriptive test names**
5. **Avoid testing third-party libraries**
6. **Mock external dependencies**
7. **Clean up after tests** (use cleanup functions)
8. **Maintain test independence** (tests should not depend on each other)

## Troubleshooting

### Tests failing locally but passing in CI

- Clear node_modules and reinstall: `rm -rf node_modules && npm ci`
- Check Node.js version matches CI (18.x)
- Ensure all dependencies are installed

### Coverage not meeting threshold

- Run coverage report: `npm run test:coverage`
- Open HTML report: `open coverage/index.html`
- Add tests for uncovered code

### E2E tests timing out

- Increase timeout in playwright.config.ts
- Check if development server is running
- Verify network conditions

### Flaky E2E tests

- Add proper wait conditions: `await expect(...).toBeVisible()`
- Use `waitForLoadState()` for page loads
- Avoid hard-coded `waitForTimeout()` when possible

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
