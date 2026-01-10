# Testing Documentation

**Last Updated**: January 2026
**Testing Framework**: Vitest 4.0 + React Testing Library

---

## Overview

This project uses **Vitest** as its testing framework, integrated seamlessly with our existing Vite build setup. The testing infrastructure provides fast, reliable test execution with minimal configuration overhead.

### Why Vitest?

We chose Vitest over Jest and other alternatives for several compelling reasons:

#### 1. **Native Vite Integration**
- **Same configuration file**: Test setup lives in `vite.config.js` alongside dev server config
- **Same transformation pipeline**: Vite transforms JSX→JavaScript for both development and tests
- **No duplication**: No need for separate Babel configs or Jest transforms
- **Guaranteed consistency**: Tests use the exact same code transformations as your running app

#### 2. **Speed**
- **Fast startup**: 0.5-2 seconds vs Jest's 3-8 seconds
- **Instant watch mode**: File changes rerun tests in 100-500ms
- **Parallel execution**: Tests run concurrently by default
- **Smart caching**: Only reruns affected tests

#### 3. **Modern ES Module Support**
- **Native ESM**: Works perfectly with `"type": "module"` in package.json
- **No hacks required**: Jest requires experimental flags for ESM
- **Import syntax**: Use `import/export` naturally without transpilation

#### 4. **Developer Experience**
- **Jest-compatible API**: Same `describe`, `it`, `expect` syntax
- **Visual UI**: Run `npm run test:ui` for browser-based test dashboard
- **Built-in coverage**: V8 coverage provider included (no extra setup)
- **Better error messages**: Clear, actionable test failures

#### 5. **Perfect Match for Our Stack**
```
Our Stack:          Testing Stack:
- Vite              → Vitest (built for Vite)
- React 19          → React Testing Library
- ES Modules        → Native ESM support
- JSX files         → Same JSX transform
```

---

## Testing Philosophy

### What We Test

1. **Business Logic (Unit Tests)** - Priority 1
   - Validation rules (Pitch Smart compliance)
   - Utility functions (date parsing, pitch calculations)
   - Data transformations

2. **Component Behavior (Integration Tests)** - Priority 2
   - User interactions (form submissions, clicks)
   - Data fetching and state updates
   - Conditional rendering based on props/state

3. **Critical Workflows (E2E Tests)** - Priority 3 (Future)
   - Authentication flows
   - Multi-step forms
   - Data entry workflows

### What We Don't Test

- Implementation details (internal state, private functions)
- Third-party libraries (Supabase, React)
- Styling/CSS (unless it affects functionality)
- Static content that never changes

---

## Setup & Configuration

### Installation

The following dependencies are installed:

```json
{
  "devDependencies": {
    "vitest": "^4.0.16",
    "@testing-library/react": "^16.3.1",
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/user-event": "^14.6.1",
    "jsdom": "^27.4.0",
    "@vitest/ui": "^4.0.16"
  }
}
```

### Configuration Files

#### vite.config.js
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },

  // Test configuration
  test: {
    globals: true,           // Use global test functions (no imports needed)
    environment: 'jsdom',    // Simulate browser environment
    setupFiles: './src/__tests__/setup.js',  // Global mocks and utilities
    coverage: {
      provider: 'v8',        // Built-in V8 coverage
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        'database/',
        'dist/'
      ]
    }
  }
})
```

#### src/__tests__/setup.js

Global test setup file that runs before all tests:

```javascript
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Supabase client globally
vi.mock('../lib/supabase.js', () => ({
  supabase: {
    auth: { /* mocked auth methods */ },
    from: vi.fn(() => ({ /* mocked query methods */ }))
  }
}))

// Mock browser APIs
global.matchMedia = vi.fn(...)
global.alert = vi.fn()
global.confirm = vi.fn(() => true)

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
})
```

**Why this matters:**
- Supabase client is mocked globally so tests don't hit real database
- Browser APIs that don't exist in Node.js are mocked
- All mocks reset before each test (clean slate)

---

## Running Tests

### Available Commands

```bash
# Watch mode (recommended during development)
npm run test

# Run once (for CI/CD)
npm run test:run

# Visual UI dashboard
npm run test:ui

# Coverage report
npm run test:coverage
```

### Watch Mode Workflow

```bash
$ npm run test

 DEV  v4.0.16

 ✓ src/__tests__/lib/violationRules.test.js (30 tests) 9ms

 Test Files  1 passed (1)
      Tests  30 passed (30)
   Start at  10:45:23
   Duration  156ms

 PASS  Waiting for file changes...
```

**What happens:**
1. Vitest starts and runs all tests
2. Watches for file changes
3. When you edit a file, it reruns affected tests automatically
4. Results appear in ~100-200ms

**Tip**: Run this in a separate terminal alongside `npm run dev`

---

## Test Structure & Organization

### Directory Structure

```
src/
├── __tests__/
│   ├── setup.js                          # Global test setup
│   ├── lib/
│   │   ├── violationRules.test.js        # Utility function tests
│   │   ├── pitchSmartRules.test.js       # (future)
│   │   └── pitchCountUtils.test.js       # (future)
│   └── components/
│       ├── auth/
│       │   ├── Login.test.jsx            # (future)
│       │   └── ChangePassword.test.jsx   # (future)
│       ├── seasons/
│       │   └── SeasonManagement.test.jsx # (future)
│       └── ...
├── lib/
│   ├── violationRules.js                 # Source code
│   └── ...
└── components/
    └── ...
```

### Naming Conventions

- **Test files**: `*.test.js` or `*.test.jsx`
- **Location**: Mirror source structure in `__tests__/` directory
- **Test suites**: Use `describe()` blocks to group related tests

---

## Current Test Coverage

### Implemented Tests

#### violationRules.js (30 tests) ✅

**Coverage**: All 7 exported functions tested with edge cases

| Function | Test Cases | Coverage |
|----------|-----------|----------|
| `getEffectivePitchCount` | 2 | 100% |
| `getMaxPitchesForAge` | 2 | 100% |
| `hasInningsGap` (Rule 1) | 5 | 100% |
| `cannotCatchDueToHighPitchCount` (Rule 2) | 5 | 100% |
| `cannotPitchDueToFourInningsCatching` (Rule 3) | 4 | 100% |
| `cannotCatchAgainDueToCombined` (Rule 4) | 7 | 100% |
| `exceedsMaxPitchesForAge` (Rule 5) | 5 | 100% |

**Example test:**
```javascript
describe('Rule 2: cannotCatchDueToHighPitchCount', () => {
  it('should return false if catching occurred before pitching', () => {
    expect(cannotCatchDueToHighPitchCount([3, 4, 5], [1, 2], 41)).toBe(false)
  })

  it('should return true if catching after pitching with 41+ pitches', () => {
    expect(cannotCatchDueToHighPitchCount([1, 2, 3], [4, 5], 41)).toBe(true)
  })
})
```

---

## Writing Tests

### Basic Test Template

```javascript
import { describe, it, expect } from 'vitest'
import { myFunction } from '../../lib/myUtil'

describe('myFunction', () => {
  it('should handle normal case', () => {
    const result = myFunction(input)
    expect(result).toBe(expectedOutput)
  })

  it('should handle edge case', () => {
    const result = myFunction(edgeInput)
    expect(result).toBe(expectedEdgeOutput)
  })
})
```

### React Component Test Template

```javascript
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MyComponent from '../../components/MyComponent'

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('should handle button click', async () => {
    const mockFn = vi.fn()
    render(<MyComponent onClick={mockFn} />)

    fireEvent.click(screen.getByRole('button'))

    expect(mockFn).toHaveBeenCalledTimes(1)
  })
})
```

### Mocking Supabase in Tests

**Option 1: Use global mock (already set up)**
```javascript
// Supabase is already mocked in setup.js
// Tests just work without extra setup
```

**Option 2: Override for specific test**
```javascript
import { vi } from 'vitest'
import { supabase } from '../../lib/supabase'

it('should fetch data', async () => {
  // Override mock for this test
  supabase.from.mockReturnValue({
    select: vi.fn().mockResolvedValue({
      data: [{ id: 1, name: 'Test' }],
      error: null
    })
  })

  // Your test code...
})
```

---

## Testing Best Practices

### 1. Test Behavior, Not Implementation

```javascript
// ❌ Bad - tests internal implementation
it('should set state to true', () => {
  const { result } = renderHook(() => useState(false))
  act(() => result.current[1](true))
  expect(result.current[0]).toBe(true)
})

// ✅ Good - tests user-visible behavior
it('should show error message when form is invalid', () => {
  render(<LoginForm />)
  fireEvent.click(screen.getByRole('button', { name: /login/i }))
  expect(screen.getByText(/email is required/i)).toBeInTheDocument()
})
```

### 2. Use Descriptive Test Names

```javascript
// ❌ Bad
it('works', () => { ... })
it('test 1', () => { ... })

// ✅ Good
it('should return false when pitch count is below 41', () => { ... })
it('should display error when duplicate jersey number', () => { ... })
```

### 3. Arrange-Act-Assert Pattern

```javascript
it('should calculate rest days correctly', () => {
  // Arrange - set up test data
  const age = 10
  const pitchCount = 55

  // Act - execute the function
  const restDays = calculateRestDays(age, pitchCount)

  // Assert - verify the result
  expect(restDays).toBe(3)
})
```

### 4. Test Edge Cases

```javascript
describe('hasInningsGap', () => {
  it('should handle empty array', () => {
    expect(hasInningsGap([])).toBe(false)
  })

  it('should handle single inning', () => {
    expect(hasInningsGap([1])).toBe(false)
  })

  it('should handle unsorted innings', () => {
    expect(hasInningsGap([3, 1, 2])).toBe(false)
  })
})
```

---

## Coverage Reports

### Generating Coverage

```bash
npm run test:coverage
```

**Output:**
```
 % Coverage report from v8
----------------------------|---------|----------|---------|---------|
File                        | % Stmts | % Branch | % Funcs | % Lines |
----------------------------|---------|----------|---------|---------|
All files                   |   95.23 |    91.66 |     100 |   95.23 |
 lib                        |   95.23 |    91.66 |     100 |   95.23 |
  violationRules.js         |   95.23 |    91.66 |     100 |   95.23 |
----------------------------|---------|----------|---------|---------|

HTML coverage report: coverage/index.html
```

### Viewing HTML Report

```bash
# After running coverage
open coverage/index.html  # macOS
xdg-open coverage/index.html  # Linux
start coverage/index.html  # Windows
```

**What you see:**
- Green highlights: Code covered by tests
- Red highlights: Code not covered by tests
- Interactive file browser

---

## CI/CD Integration (Future)

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npm run test:run
      - run: npm run test:coverage
```

---

## Comparison: Vitest vs Jest

| Feature | Vitest | Jest |
|---------|--------|------|
| **Configuration** | Add to vite.config.js | Separate jest.config.js + Babel |
| **Startup Time** | 0.5-2s | 3-8s |
| **Watch Mode** | 100-500ms | 1-3s |
| **ES Modules** | Native support | Experimental (unstable) |
| **Vite Integration** | Built-in | Requires adapters |
| **Coverage** | Built-in V8 | Needs istanbul |
| **API** | Jest-compatible | Jest |
| **UI Dashboard** | Built-in (`--ui`) | Third-party only |

---

## Roadmap

### Phase 1: Foundation ✅ (Complete)
- [x] Install Vitest + dependencies
- [x] Configure vite.config.js
- [x] Create test setup with mocks
- [x] Add test scripts to package.json
- [x] Write example tests for violationRules.js

### Phase 2: Core Utilities (Next)
- [ ] Test pitchSmartRules.js
- [ ] Test pitchCountUtils.js
- [ ] Test exportUtils.js
- [ ] Test useCoachAssignments hook

### Phase 3: Component Tests (Future)
- [ ] Auth components (Login, ChangePassword)
- [ ] Management components (Seasons, Teams, Players)
- [ ] Game entry forms
- [ ] Reports

### Phase 4: Integration Tests (Future)
- [ ] Multi-step workflows
- [ ] Role-based access control
- [ ] Data validation flows

### Phase 5: E2E Tests (Future)
- [ ] Playwright or Cypress setup
- [ ] Critical user journeys
- [ ] Cross-browser testing

---

## Troubleshooting

### Common Issues

#### Tests fail with "Cannot find module"
**Solution**: Check import paths are relative and correct
```javascript
// ❌ Wrong
import { myFunc } from 'lib/myUtil'

// ✅ Correct
import { myFunc } from '../../lib/myUtil'
```

#### "ReferenceError: describe is not defined"
**Solution**: Ensure `globals: true` in vite.config.js test section

#### Supabase errors in tests
**Solution**: Verify setup.js is mocking Supabase correctly
```javascript
// Check that setup.js has:
vi.mock('../lib/supabase.js', () => ({ ... }))
```

#### Tests pass locally but fail in CI
**Solution**: Ensure consistent Node.js version
```json
// package.json
"engines": {
  "node": ">=18.0.0"
}
```

---

## Resources

### Vitest Documentation
- Official Docs: https://vitest.dev/
- API Reference: https://vitest.dev/api/
- Config Reference: https://vitest.dev/config/

### React Testing Library
- Documentation: https://testing-library.com/react
- Cheatsheet: https://testing-library.com/docs/react-testing-library/cheatsheet
- Common Mistakes: https://kentcdodds.com/blog/common-mistakes-with-react-testing-library

### Learning Resources
- Vitest Guide: https://vitest.dev/guide/
- Testing Best Practices: https://testingjavascript.com/
- Component Testing: https://www.epicreact.dev/

---

## Contributing

When adding new code:

1. **Write tests first** (TDD approach) or **immediately after** implementation
2. **Maintain coverage** - aim for 80%+ on critical business logic
3. **Test edge cases** - null, empty arrays, invalid inputs
4. **Use descriptive names** - test names should read like documentation
5. **Keep tests simple** - one assertion per test when possible

---

**Testing Framework Version**: Vitest 4.0.16
**Last Test Run**: All 30 tests passing
**Coverage**: 95.23% (violationRules.js)
