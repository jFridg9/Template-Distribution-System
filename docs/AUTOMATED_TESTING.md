# Automated Testing Framework

## Overview

The Template Distribution System includes a comprehensive automated testing framework in `Test.gs` that validates core functionality without requiring manual intervention.

## Test Coverage

### File Selection Utilities (3 test functions)
- **testGetMostRecentFile()** - Validates version detection by date
  - Tests finding most recent file from multiple versions
  - Tests single file scenarios
  - Tests edge cases (empty lists)

- **testFindFileByVersion()** - Validates version matching
  - Tests exact version matching (v2.0, 2.0)
  - Tests different naming conventions
  - Tests case-insensitive matching
  - Tests non-existent versions

- **testListAvailableVersions()** - Validates version extraction
  - Tests version string extraction from filenames
  - Tests handling of files without versions

### Configuration Management (3 test functions)
- **testCaching()** - Validates configuration caching
  - Tests cache clearing
  - Tests configuration loading and caching
  - Tests cached data validity

- **testLoadConfigFromSheet()** - Validates config loading
  - Tests sheet parsing
  - Tests required field validation
  - Tests data structure integrity

- **testFallbackConfig()** - Validates fallback configuration
  - Tests single-folder deployment mode
  - Tests default configuration structure

### Product Redirect Logic (1 test function)
- **testHandleProductRedirect()** - Validates redirect logic
  - Tests product lookup
  - Tests error handling for non-existent products
  - Tests redirect URL generation

### Admin CRUD Operations (1 test function)
- **testAdminCRUD()** - Validates CRUD validation logic
  - Tests required field validation
  - Tests data structure validation
  - Note: Full CRUD requires real sheet (integration test)

### Folder Validation (1 test function)
- **testFolderValidation()** - Validates folder ID handling
  - Tests folder ID normalization
  - Tests URL parsing (multiple formats)
  - Tests folder detail retrieval
  - Tests error handling for invalid IDs

### Error Handling (1 test function)
- **testErrorHandling()** - Validates error scenarios
  - Tests invalid configuration handling
  - Tests empty data handling
  - Tests graceful error recovery

### Mode Switching (1 test function)
- **testModeSwitching()** - Validates deployment modes
  - Tests CONFIG.mode validation
  - Tests mode-specific features
  - Tests branding configuration (full mode)

### HTML Rendering (1 test function)
- **testHTMLRendering()** - Validates HTML generation
  - Tests redirect HTML creation
  - Tests iframe-breaking code
  - Tests URL embedding

### Script Properties (1 test function)
- **testScriptProperties()** - Validates property management
  - Tests configuration retrieval
  - Tests runtime config access

### Integration Tests (1 test function)
- **testConfigurationIntegration()** - End-to-end validation
  - Tests complete configuration loading
  - Tests product validation
  - Tests enabled/disabled product counting

## Running Tests

### Complete Test Suite

```javascript
// In Apps Script editor:
// 1. Open Test.gs
// 2. Select function: runAllTests
// 3. Click Run

// Expected output:
// ==========================================================
// TEMPLATE DISTRIBUTION SYSTEM - TEST SUITE
// ==========================================================
// 
// --- Testing getMostRecentFile ---
// ✓ PASS: Returns most recent file
// ✓ PASS: Handles single file list
// ✓ PASS: Returns null for empty list
// 
// [... all tests ...]
// 
// ==========================================================
// TEST SUMMARY
// ==========================================================
// Total Tests: 45
// Passed: 43
// Failed: 2
// ==========================================================
```

### Quick Test Suite (Smoke Tests)

```javascript
// In Apps Script editor:
// Select function: runQuickTests
// Click Run

// Runs essential tests only (faster):
// - getMostRecentFile
// - findFileByVersion
// - Caching
// - Mode switching
// - Folder validation
```

### Individual Tests

Run specific test functions for targeted validation.

## Test Framework Architecture

### Assertion Functions

```javascript
assert(condition, "Test description");
assertEqual(actual, expected, "Test description");
assertTruthy(value, "Test description");
assertFalsy(value, "Test description");
assertThrows(fn, "Test description");
```

### Mock Objects

```javascript
// Mock Drive File
var mockFile = MockFile('Template-v1.0', new Date('2024-01-01'));

// Mock Drive Folder  
var mockFolder = MockFolder('folder123', [file1, file2]);

// Mock Configuration
var mockConfig = getMockConfig();
```

## Best Practices

### Writing Good Tests

✅ **DO:**
- Test one thing per assertion
- Use descriptive test names
- Test both success and failure paths
- Clean up after tests (if needed)
- Use mock objects for external dependencies

❌ **DON'T:**
- Make tests dependent on each other
- Test implementation details
- Skip error handling tests
- Ignore edge cases

## See Also

- **TESTING_GUIDE.md** - Manual testing procedures
- **Test.gs** - Complete test implementation
- **README.md** - Project overview
