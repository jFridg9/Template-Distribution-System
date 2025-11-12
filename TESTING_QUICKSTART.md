# Quick Start: Running Tests

## For Developers

### Run All Tests
```javascript
// In Apps Script editor:
// 1. Open Test.gs file
// 2. Select function: runAllTests
// 3. Click Run ▶️
// 4. Check Execution log for results
```

### Run Quick Tests (Smoke Tests)
```javascript
// Faster validation - runs essential tests only
runQuickTests()
```

### Run Individual Test
```javascript
// Select specific test function and run
testGetMostRecentFile()
testFindFileByVersion()
testCaching()
// ... etc
```

## Test Results

**Output Format:**
```
==========================================================
TEMPLATE DISTRIBUTION SYSTEM - TEST SUITE
==========================================================

--- Testing getMostRecentFile ---
✓ PASS: Returns most recent file
✓ PASS: Handles single file list
✓ PASS: Returns null for empty list

[... more tests ...]

==========================================================
TEST SUMMARY
==========================================================
Total Tests: 45
Passed: 43
Failed: 2
==========================================================
```

## When to Run Tests

- ✅ **Before committing code** - Run `runAllTests()`
- ✅ **After making changes** - Run relevant test functions
- ✅ **Before deployment** - Run `runAllTests()` 
- ✅ **Quick validation** - Run `runQuickTests()`
- ✅ **During development** - Run individual tests as needed

## Test Coverage

The test suite covers:
- Configuration loading and caching
- Version detection (getMostRecentFile)
- File matching (findFileByVersion)
- Product redirect logic
- Admin CRUD validation
- Folder validation
- Error handling
- Mode switching (full vs simple)
- HTML rendering
- Script properties management

## Documentation

- **Test.gs** - Complete test implementation
- **docs/AUTOMATED_TESTING.md** - Comprehensive testing guide
- **TESTING_GUIDE.md** - Manual testing procedures

## Need Help?

1. Check execution logs for detailed error messages
2. Review docs/AUTOMATED_TESTING.md for troubleshooting
3. Try running tests individually to isolate issues
4. Use `validateConfiguration()` to check system setup
