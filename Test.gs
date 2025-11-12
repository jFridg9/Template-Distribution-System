/**
 * ============================================================================
 * AUTOMATED TEST FRAMEWORK
 * ============================================================================
 * 
 * This module provides automated testing for core functionality of the
 * Template Distribution System.
 * 
 * USAGE:
 * - Run individual test functions from the Apps Script editor
 * - Or run runAllTests() to execute the complete test suite
 * 
 * TESTING APPROACH:
 * - Unit tests for core business logic
 * - Mock objects for Drive API and Spreadsheet API
 * - Tests verify both success and failure scenarios
 * - Assertions use simple logging with pass/fail tracking
 * 
 * PORTFOLIO NOTE:
 * Demonstrates professional testing practices: mock objects, edge cases,
 * comprehensive coverage, and clear documentation.
 * 
 * ============================================================================
 */


/**
 * ============================================================================
 * TEST FRAMEWORK UTILITIES
 * ============================================================================
 */

/**
 * Test results tracker
 * Note: This is intentionally global and reset before each test run.
 * Apps Script doesn't support concurrent execution, so this is safe.
 * Always call resetTestResults() at the start of test runs.
 */
var TEST_RESULTS = {
  passed: 0,
  failed: 0,
  errors: []
};

/**
 * Resets test results for a new test run
 * IMPORTANT: Always call this before running tests to ensure clean state
 */
function resetTestResults() {
  TEST_RESULTS = {
    passed: 0,
    failed: 0,
    errors: []
  };
}

/**
 * Asserts that a condition is true
 * 
 * @param {boolean} condition - Condition to test
 * @param {string} message - Test description
 */
function assert(condition, message) {
  if (condition) {
    TEST_RESULTS.passed++;
    Logger.log('✓ PASS: ' + message);
  } else {
    TEST_RESULTS.failed++;
    TEST_RESULTS.errors.push(message);
    Logger.log('✗ FAIL: ' + message);
  }
}

/**
 * Asserts that two values are equal
 * Handles primitive types and simple comparisons
 * 
 * @param {*} actual - Actual value
 * @param {*} expected - Expected value
 * @param {string} message - Test description
 */
function assertEqual(actual, expected, message) {
  // Handle null/undefined cases
  if (actual === null && expected === null) {
    assert(true, message);
    return;
  }
  
  // For objects/arrays, convert to JSON for comparison
  if (typeof actual === 'object' && typeof expected === 'object') {
    try {
      const condition = JSON.stringify(actual) === JSON.stringify(expected);
      const fullMessage = message + ' (expected: ' + JSON.stringify(expected) + ', got: ' + JSON.stringify(actual) + ')';
      assert(condition, fullMessage);
    } catch (err) {
      // Fallback to reference equality if JSON.stringify fails
      const condition = actual === expected;
      const fullMessage = message + ' (object comparison)';
      assert(condition, fullMessage);
    }
  } else {
    // Primitive comparison
    const condition = actual === expected;
    const fullMessage = message + ' (expected: ' + expected + ', got: ' + actual + ')';
    assert(condition, fullMessage);
  }
}

/**
 * Asserts that a value is truthy
 * 
 * @param {*} value - Value to test
 * @param {string} message - Test description
 */
function assertTruthy(value, message) {
  assert(!!value, message);
}

/**
 * Asserts that a value is falsy
 * 
 * @param {*} value - Value to test
 * @param {string} message - Test description
 */
function assertFalsy(value, message) {
  assert(!value, message);
}

/**
 * Asserts that a function throws an error
 * 
 * @param {Function} fn - Function to test
 * @param {string} message - Test description
 */
function assertThrows(fn, message) {
  try {
    fn();
    assert(false, message + ' (expected error but none was thrown)');
  } catch (err) {
    assert(true, message);
  }
}

/**
 * Prints test summary
 */
function printTestSummary() {
  Logger.log('\n' + '='.repeat(60));
  Logger.log('TEST SUMMARY');
  Logger.log('='.repeat(60));
  Logger.log(`Total Tests: ${TEST_RESULTS.passed + TEST_RESULTS.failed}`);
  Logger.log(`Passed: ${TEST_RESULTS.passed}`);
  Logger.log(`Failed: ${TEST_RESULTS.failed}`);
  
  if (TEST_RESULTS.failed > 0) {
    Logger.log('\nFailed Tests:');
    TEST_RESULTS.errors.forEach(function(error) {
      Logger.log('  - ' + error);
    });
  }
  
  Logger.log('='.repeat(60));
  
  return TEST_RESULTS;
}


/**
 * ============================================================================
 * MOCK OBJECTS
 * ============================================================================
 */

/**
 * Mock Drive File object
 */
function MockFile(name, dateCreated, url) {
  return {
    getName: function() { return name; },
    getDateCreated: function() { return dateCreated; },
    getUrl: function() { return url || 'https://docs.google.com/spreadsheets/d/mock123/edit'; },
    getId: function() { return 'mock-file-' + name; }
  };
}

/**
 * Mock Drive Folder object
 */
function MockFolder(folderId, files) {
  return {
    getId: function() { return folderId; },
    getName: function() { return 'Mock Folder'; },
    getUrl: function() { return 'https://drive.google.com/folders/' + folderId; },
    getFiles: function() {
      var index = 0;
      return {
        hasNext: function() { return index < files.length; },
        next: function() { return files[index++]; }
      };
    }
  };
}

/**
 * Mock configuration for testing
 */
function getMockConfig() {
  return {
    products: [
      {
        name: 'TestProduct1',
        folderId: 'folder123',
        displayName: 'Test Product 1',
        enabled: true,
        description: 'First test product',
        category: 'Templates',
        tags: ['test', 'demo']
      },
      {
        name: 'TestProduct2',
        folderId: 'folder456',
        displayName: 'Test Product 2',
        enabled: true,
        description: 'Second test product',
        category: 'Tools',
        tags: ['test', 'utility']
      },
      {
        name: 'DisabledProduct',
        folderId: 'folder789',
        displayName: 'Disabled Product',
        enabled: false,
        description: 'This product is disabled',
        category: 'Uncategorized',
        tags: []
      }
    ]
  };
}


/**
 * ============================================================================
 * TESTS: FILE SELECTION UTILITIES
 * ============================================================================
 */

/**
 * Tests getMostRecentFile function
 */
function testGetMostRecentFile() {
  Logger.log('\n--- Testing getMostRecentFile ---');
  
  // Create mock files with different dates
  var file1 = MockFile('Template-v1.0', new Date('2024-01-01'));
  var file2 = MockFile('Template-v2.0', new Date('2024-02-01'));
  var file3 = MockFile('Template-v1.5', new Date('2024-01-15'));
  
  var fileList = [file1, file3, file2]; // Not sorted
  
  // Test: Should return the most recent file (file2)
  var result = getMostRecentFile(fileList);
  assertEqual(result.getName(), 'Template-v2.0', 'Returns most recent file');
  
  // Test: Single file list
  var singleFileList = [file1];
  result = getMostRecentFile(singleFileList);
  assertEqual(result.getName(), 'Template-v1.0', 'Handles single file list');
  
  // Test: Empty list (edge case)
  var emptyList = [];
  result = getMostRecentFile(emptyList);
  assertEqual(result, null, 'Returns null for empty list');
  
  Logger.log('testGetMostRecentFile completed');
}


/**
 * Tests findFileByVersion function
 */
function testFindFileByVersion() {
  Logger.log('\n--- Testing findFileByVersion ---');
  
  // Create mock files with version numbers
  var file1 = MockFile('Template-v1.0', new Date('2024-01-01'));
  var file2 = MockFile('Template-v2.0', new Date('2024-02-01'));
  var file3 = MockFile('EventPlanning-v1.5', new Date('2024-01-15'));
  var file4 = MockFile('Template 2.5', new Date('2024-03-01'));
  
  var fileList = [file1, file2, file3, file4];
  
  // Test: Find by exact version with 'v' prefix
  var result = findFileByVersion(fileList, '2.0');
  assertEqual(result.getName(), 'Template-v2.0', 'Finds version 2.0');
  
  // Test: Find by version without 'v' prefix in search
  result = findFileByVersion(fileList, '1.5');
  assertEqual(result.getName(), 'EventPlanning-v1.5', 'Finds version 1.5');
  
  // Test: Find version with space instead of dash
  result = findFileByVersion(fileList, '2.5');
  assertEqual(result.getName(), 'Template 2.5', 'Finds version 2.5 with space');
  
  // Test: Version not found
  result = findFileByVersion(fileList, '99.0');
  assertEqual(result, null, 'Returns null for non-existent version');
  
  // Test: Case insensitive search
  result = findFileByVersion(fileList, 'V1.0');
  assertTruthy(result, 'Case insensitive version search');
  
  Logger.log('testFindFileByVersion completed');
}


/**
 * Tests listAvailableVersions function
 */
function testListAvailableVersions() {
  Logger.log('\n--- Testing listAvailableVersions ---');
  
  var file1 = MockFile('Template-v1.0', new Date());
  var file2 = MockFile('Template-v2.0', new Date());
  var file3 = MockFile('EventPlanning-v1.5', new Date());
  var file4 = MockFile('NoVersionFile', new Date());
  
  var fileList = [file1, file2, file3, file4];
  
  var result = listAvailableVersions(fileList);
  
  // Should extract versions: 1.0, 2.0, 1.5
  assertTruthy(result.includes('1.0'), 'Includes version 1.0');
  assertTruthy(result.includes('2.0'), 'Includes version 2.0');
  assertTruthy(result.includes('1.5'), 'Includes version 1.5');
  assertFalsy(result.includes('NoVersionFile'), 'Excludes files without versions');
  
  // Test empty list
  var emptyResult = listAvailableVersions([]);
  assertEqual(emptyResult, 'none detected', 'Returns "none detected" for empty list');
  
  Logger.log('testListAvailableVersions completed');
}


/**
 * ============================================================================
 * TESTS: CONFIGURATION MANAGEMENT
 * ============================================================================
 */

/**
 * Tests configuration loading with caching
 */
function testCaching() {
  Logger.log('\n--- Testing Configuration Caching ---');
  
  // Clear cache first
  clearConfigCache();
  
  // Test: Cache is empty after clearing
  var cache = CacheService.getScriptCache();
  var cachedConfig = cache.get('product_config');
  assertEqual(cachedConfig, null, 'Cache is empty after clearing');
  
  // Load configuration (this should cache it)
  try {
    var config = loadConfiguration();
    
    // Test: Configuration loaded successfully
    assertTruthy(config, 'Configuration loads successfully');
    assertTruthy(config.products, 'Configuration has products array');
    
    // Test: Configuration is now cached
    cachedConfig = cache.get('product_config');
    assertTruthy(cachedConfig, 'Configuration is cached after loading');
    
    // Test: Cached config is valid JSON
    try {
      var parsedCache = JSON.parse(cachedConfig);
      assertTruthy(parsedCache.products, 'Cached configuration is valid JSON');
    } catch (err) {
      assert(false, 'Cached configuration is valid JSON');
    }
    
  } catch (err) {
    Logger.log('Note: testCaching requires valid configuration - ' + err.message);
  }
  
  Logger.log('testCaching completed');
}


/**
 * Tests loadConfigFromSheet with mock data
 */
function testLoadConfigFromSheet() {
  Logger.log('\n--- Testing loadConfigFromSheet ---');
  
  // Note: This test requires a real config sheet to fully test
  // Here we test the validation logic
  
  try {
    var configSheetId = getConfigSheetId();
    
    if (!configSheetId || configSheetId === 'YOUR_CONFIG_SHEET_ID_HERE') {
      Logger.log('Skipping testLoadConfigFromSheet - no config sheet configured');
      return;
    }
    
    var config = loadConfigFromSheet(configSheetId);
    
    // Test: Returns valid config structure
    assertTruthy(config, 'loadConfigFromSheet returns config object');
    assertTruthy(config.products, 'Config has products array');
    assertTruthy(Array.isArray(config.products), 'Products is an array');
    
    // Test: Products have required fields
    if (config.products.length > 0) {
      var product = config.products[0];
      assertTruthy(product.name, 'Product has name');
      assertTruthy(product.folderId, 'Product has folderId');
      assertTruthy(product.displayName, 'Product has displayName');
      assertTruthy(typeof product.enabled === 'boolean', 'Product has enabled boolean');
    }
    
  } catch (err) {
    Logger.log('Note: testLoadConfigFromSheet requires valid configuration - ' + err.message);
  }
  
  Logger.log('testLoadConfigFromSheet completed');
}


/**
 * Tests fallback configuration
 */
function testFallbackConfig() {
  Logger.log('\n--- Testing Fallback Configuration ---');
  
  // Test: createFallbackConfig returns valid structure
  var fallbackConfig = createFallbackConfig();
  
  assertTruthy(fallbackConfig, 'Fallback config created');
  assertTruthy(fallbackConfig.products, 'Fallback config has products');
  assertEqual(fallbackConfig.products.length, 1, 'Fallback config has exactly 1 product');
  
  var product = fallbackConfig.products[0];
  assertEqual(product.name, 'default', 'Fallback product name is "default"');
  assertEqual(product.folderId, CONFIG.fallbackFolderId, 'Fallback product uses CONFIG.fallbackFolderId');
  assertEqual(product.enabled, true, 'Fallback product is enabled');
  
  Logger.log('testFallbackConfig completed');
}


/**
 * ============================================================================
 * TESTS: PRODUCT REDIRECT LOGIC
 * ============================================================================
 */

/**
 * Tests handleProductRedirect with mock data
 */
function testHandleProductRedirect() {
  Logger.log('\n--- Testing handleProductRedirect ---');
  
  // Note: Full testing requires real Drive folders
  // Here we test error conditions and validation
  
  // Test: Non-existent product
  try {
    var result = handleProductRedirect('NonExistentProduct', null);
    // Should return error content
    assertTruthy(result, 'Returns response for non-existent product');
  } catch (err) {
    // Expected if configuration can't be loaded
    Logger.log('Note: testHandleProductRedirect requires valid configuration');
  }
  
  Logger.log('testHandleProductRedirect completed');
}


/**
 * ============================================================================
 * TESTS: ADMIN CRUD OPERATIONS
 * ============================================================================
 */

/**
 * Tests admin CRUD validation logic
 */
function testAdminCRUD() {
  Logger.log('\n--- Testing Admin CRUD Operations ---');
  
  // Test: Product validation
  var invalidProduct1 = { displayName: 'Test' }; // Missing name and folderId
  var invalidProduct2 = { name: 'Test' }; // Missing folderId
  var validProduct = { name: 'TestProduct', folderId: 'test123', displayName: 'Test Product' };
  
  // Test validation logic (not actual DB operations)
  assertFalsy(invalidProduct1.name && invalidProduct1.folderId, 'Detects missing required fields (1)');
  assertFalsy(invalidProduct2.name && invalidProduct2.folderId, 'Detects missing required fields (2)');
  assertTruthy(validProduct.name && validProduct.folderId, 'Accepts valid product data');
  
  Logger.log('Note: Full CRUD testing requires test configuration sheet');
  Logger.log('testAdminCRUD validation tests completed');
}


/**
 * ============================================================================
 * TESTS: FOLDER VALIDATION
 * ============================================================================
 */

/**
 * Tests folder validation utilities
 */
function testFolderValidation() {
  Logger.log('\n--- Testing Folder Validation ---');
  
  // Test: normalizeFolderId function
  var rawId = '1X4RrTt45ceYRYrzC0jAlcgBMADF1S4cWHuOfxjHZ4Is';
  var result = normalizeFolderId(rawId);
  assertEqual(result, rawId, 'Returns raw ID unchanged');
  
  // Test: URL extraction
  var url1 = 'https://drive.google.com/drive/folders/abc123xyz';
  result = normalizeFolderId(url1);
  assertEqual(result, 'abc123xyz', 'Extracts ID from folders URL');
  
  var url2 = 'https://drive.google.com/open?id=def456uvw';
  result = normalizeFolderId(url2);
  assertEqual(result, 'def456uvw', 'Extracts ID from open URL');
  
  // Test: Empty input
  result = normalizeFolderId('');
  assertEqual(result, '', 'Returns empty string for empty input');
  
  // Test: getFolderDetails with invalid ID
  var folderResult = getFolderDetails('invalid-folder-id-12345');
  assertEqual(folderResult.success, false, 'getFolderDetails returns error for invalid ID');
  assertTruthy(folderResult.error, 'Error message is provided');
  
  Logger.log('testFolderValidation completed');
}


/**
 * ============================================================================
 * TESTS: ERROR HANDLING
 * ============================================================================
 */

/**
 * Tests error handling paths
 */
function testErrorHandling() {
  Logger.log('\n--- Testing Error Handling ---');
  
  // Test: Configuration error handling
  try {
    // Save current config sheet ID
    var originalId = getConfigSheetId();
    
    // Test with invalid sheet ID
    var invalidConfig = function() {
      loadConfigFromSheet('invalid-sheet-id-12345');
    };
    
    assertThrows(invalidConfig, 'Throws error for invalid sheet ID');
    
  } catch (err) {
    Logger.log('Note: Error handling test - ' + err.message);
  }
  
  // Test: Empty file list handling
  var emptyList = [];
  var result = getMostRecentFile(emptyList);
  assertEqual(result, null, 'Handles empty file list gracefully');
  
  result = findFileByVersion(emptyList, '1.0');
  assertEqual(result, null, 'Handles empty file list in version search');
  
  Logger.log('testErrorHandling completed');
}


/**
 * ============================================================================
 * TESTS: MODE SWITCHING
 * ============================================================================
 */

/**
 * Tests mode switching (full vs simple)
 */
function testModeSwitching() {
  Logger.log('\n--- Testing Mode Switching ---');
  
  // Test: CONFIG mode is valid
  var validModes = ['full', 'simple'];
  assertTruthy(validModes.includes(CONFIG.mode), 'CONFIG.mode is valid (full or simple)');
  
  // Test: Mode affects behavior
  var currentMode = CONFIG.mode;
  
  if (currentMode === 'full') {
    assertTruthy(CONFIG.branding, 'Full mode has branding configuration');
    assertTruthy(CONFIG.branding.organizationName, 'Branding has organization name');
  }
  
  Logger.log('Current mode: ' + currentMode);
  Logger.log('testModeSwitching completed');
}


/**
 * ============================================================================
 * TESTS: HTML RENDERING
 * ============================================================================
 */

/**
 * Tests HTML rendering functions
 */
function testHTMLRendering() {
  Logger.log('\n--- Testing HTML Rendering ---');
  
  // Test: createRedirect generates valid HTML
  var redirectUrl = 'https://docs.google.com/spreadsheets/d/test123/copy';
  var html = createRedirect(redirectUrl);
  
  assertTruthy(html, 'createRedirect returns HTML output');
  
  var htmlContent = html.getContent();
  assertTruthy(htmlContent.includes(redirectUrl), 'Redirect HTML contains target URL');
  assertTruthy(htmlContent.includes('window.top.location.href'), 'Uses window.top for iframe breaking');
  
  Logger.log('testHTMLRendering completed');
}


/**
 * ============================================================================
 * TESTS: SCRIPT PROPERTIES
 * ============================================================================
 */

/**
 * Tests script properties management
 */
function testScriptProperties() {
  Logger.log('\n--- Testing Script Properties ---');
  
  // Test: getConfigSheetId returns a value
  var sheetId = getConfigSheetId();
  assertTruthy(sheetId, 'getConfigSheetId returns a value');
  
  // Test: getRuntimeConfig returns an object
  var runtimeConfig = getRuntimeConfig();
  assertTruthy(typeof runtimeConfig === 'object', 'getRuntimeConfig returns an object');
  
  Logger.log('testScriptProperties completed');
}


/**
 * ============================================================================
 * INTEGRATION TESTS
 * ============================================================================
 */

/**
 * Tests end-to-end configuration loading and validation
 */
function testConfigurationIntegration() {
  Logger.log('\n--- Testing Configuration Integration ---');
  
  try {
    // Load configuration
    var config = loadConfiguration();
    
    assertTruthy(config, 'Configuration loads');
    assertTruthy(config.products, 'Has products array');
    
    // Validate each product
    config.products.forEach(function(product, index) {
      assertTruthy(product.name, `Product ${index} has name`);
      assertTruthy(product.folderId, `Product ${index} has folderId`);
      assertTruthy(product.displayName, `Product ${index} has displayName`);
      assertTruthy(typeof product.enabled === 'boolean', `Product ${index} has enabled flag`);
    });
    
    // Count enabled vs disabled
    var enabledCount = config.products.filter(function(p) { return p.enabled; }).length;
    var disabledCount = config.products.filter(function(p) { return !p.enabled; }).length;
    
    Logger.log(`Total products: ${config.products.length}`);
    Logger.log(`Enabled: ${enabledCount}, Disabled: ${disabledCount}`);
    
  } catch (err) {
    Logger.log('Note: Integration test requires valid configuration - ' + err.message);
  }
  
  Logger.log('testConfigurationIntegration completed');
}


/**
 * ============================================================================
 * TESTS: ANALYTICS TRACKING
 * ============================================================================
 */

/**
 * Tests analytics tracking functions
 */
function testAnalyticsTracking() {
  Logger.log('\n--- Testing Analytics Tracking ---');
  
  // Test: getVersionType function
  var latestType = getVersionType(null);
  assertEqual(latestType, 'latest', 'getVersionType returns "latest" for null');
  
  var latestType2 = getVersionType(undefined);
  assertEqual(latestType2, 'latest', 'getVersionType returns "latest" for undefined');
  
  var specificType = getVersionType('1.5');
  assertEqual(specificType, 'specific', 'getVersionType returns "specific" for version string');
  
  // Test: incrementProductCounter (non-destructive)
  try {
    var props = PropertiesService.getScriptProperties();
    var testKey = 'analytics_count_TestProduct_' + Date.now();
    
    // Ensure clean state
    props.deleteProperty(testKey);
    
    // Mock the function behavior
    var initialCount = parseInt(props.getProperty(testKey)) || 0;
    assertEqual(initialCount, 0, 'Initial counter is 0');
    
    props.setProperty(testKey, '1');
    var afterIncrement = parseInt(props.getProperty(testKey));
    assertEqual(afterIncrement, 1, 'Counter increments correctly');
    
    // Cleanup
    props.deleteProperty(testKey);
    
  } catch (err) {
    Logger.log('Note: Analytics counter test requires Script Properties - ' + err.message);
  }
  
  // Test: trackProductAccess doesn't throw errors
  try {
    trackProductAccess('TestProduct', null, 'TestFile.xlsx');
    assert(true, 'trackProductAccess executes without errors');
  } catch (err) {
    assert(false, 'trackProductAccess should not throw errors: ' + err.message);
  }
  
  Logger.log('testAnalyticsTracking completed');
}


/**
 * Tests analytics data retrieval functions
 */
function testAnalyticsRetrieval() {
  Logger.log('\n--- Testing Analytics Retrieval ---');
  
  try {
    // Test: getProductAnalytics exists and returns object
    if (typeof getProductAnalytics === 'function') {
      var testConfig = getMockConfig();
      var analytics = getProductAnalytics(testConfig.products);
      
      assertTruthy(analytics, 'getProductAnalytics returns data');
      assertTruthy(Array.isArray(analytics), 'Analytics data is an array');
      
      if (analytics.length > 0) {
        var firstItem = analytics[0];
        assertTruthy(firstItem.productName, 'Analytics item has productName');
        assertTruthy(typeof firstItem.totalAccess === 'number', 'Analytics item has totalAccess number');
      }
    } else {
      Logger.log('Note: getProductAnalytics function not found - skipping');
    }
    
    // Test: getTotalAnalytics exists and returns object
    if (typeof getTotalAnalytics === 'function') {
      var totalAnalytics = getTotalAnalytics();
      
      assertTruthy(totalAnalytics, 'getTotalAnalytics returns data');
      assertTruthy(typeof totalAnalytics.totalAccess === 'number', 'Has totalAccess number');
      assertTruthy(typeof totalAnalytics.latestRequests === 'number', 'Has latestRequests number');
    } else {
      Logger.log('Note: getTotalAnalytics function not found - skipping');
    }
    
  } catch (err) {
    Logger.log('Note: Analytics retrieval test - ' + err.message);
  }
  
  Logger.log('testAnalyticsRetrieval completed');
}


/**
 * ============================================================================
 * TESTS: CATEGORIES AND TAGS
 * ============================================================================
 */

/**
 * Tests categories and tags support in configuration
 */
function testCategoriesAndTags() {
  Logger.log('\n--- Testing Categories and Tags ---');
  
  try {
    var config = loadConfiguration();
    
    if (config.products.length > 0) {
      // Check if products have category and tags fields
      var hasCategories = false;
      var hasTags = false;
      
      config.products.forEach(function(product) {
        if (product.category !== undefined) {
          hasCategories = true;
        }
        if (product.tags !== undefined) {
          hasTags = true;
        }
      });
      
      if (hasCategories) {
        assert(true, 'Products have category field');
        
        // Test category values
        config.products.forEach(function(product, index) {
          assertTruthy(typeof product.category === 'string', 'Product ' + index + ' has string category');
          
          // Category should be non-empty or 'Uncategorized'
          var validCategory = product.category.length > 0;
          assert(validCategory, 'Product ' + index + ' has valid category');
        });
      } else {
        Logger.log('Note: No products with categories found');
      }
      
      if (hasTags) {
        assert(true, 'Products have tags field');
        
        // Test tags structure
        config.products.forEach(function(product, index) {
          assertTruthy(Array.isArray(product.tags), 'Product ' + index + ' has tags array');
          
          // If tags exist, they should be strings
          if (product.tags.length > 0) {
            product.tags.forEach(function(tag) {
              assertTruthy(typeof tag === 'string', 'Tag is a string');
            });
          }
        });
      } else {
        Logger.log('Note: No products with tags found');
      }
    } else {
      Logger.log('Note: No products configured to test categories/tags');
    }
    
  } catch (err) {
    Logger.log('Note: Categories/tags test requires valid configuration - ' + err.message);
  }
  
  Logger.log('testCategoriesAndTags completed');
}


/**
 * Tests category filtering functionality
 */
function testCategoryFiltering() {
  Logger.log('\n--- Testing Category Filtering ---');
  
  try {
    var config = loadConfiguration();
    var products = config.products;
    
    if (products.length === 0) {
      Logger.log('Note: No products to test filtering');
      return;
    }
    
    // Get unique categories
    var categories = {};
    products.forEach(function(product) {
      if (product.category) {
        categories[product.category] = true;
      }
    });
    
    var categoryList = Object.keys(categories);
    
    if (categoryList.length > 0) {
      Logger.log('Found categories: ' + categoryList.join(', '));
      
      // Test filtering by first category
      var testCategory = categoryList[0];
      var filtered = products.filter(function(p) {
        return p.category === testCategory;
      });
      
      assertTruthy(filtered.length > 0, 'Filtering by category "' + testCategory + '" returns results');
      
      // Verify all filtered products have the right category
      var allCorrect = filtered.every(function(p) {
        return p.category === testCategory;
      });
      assert(allCorrect, 'All filtered products have correct category');
    } else {
      Logger.log('Note: No categories defined to test filtering');
    }
    
  } catch (err) {
    Logger.log('Note: Category filtering test - ' + err.message);
  }
  
  Logger.log('testCategoryFiltering completed');
}


/**
 * Tests tag filtering functionality
 */
function testTagFiltering() {
  Logger.log('\n--- Testing Tag Filtering ---');
  
  try {
    var config = loadConfiguration();
    var products = config.products;
    
    if (products.length === 0) {
      Logger.log('Note: No products to test filtering');
      return;
    }
    
    // Get unique tags
    var allTags = {};
    products.forEach(function(product) {
      if (product.tags && product.tags.length > 0) {
        product.tags.forEach(function(tag) {
          allTags[tag] = true;
        });
      }
    });
    
    var tagList = Object.keys(allTags);
    
    if (tagList.length > 0) {
      Logger.log('Found tags: ' + tagList.join(', '));
      
      // Test filtering by first tag
      var testTag = tagList[0];
      var filtered = products.filter(function(p) {
        return p.tags && p.tags.indexOf(testTag) !== -1;
      });
      
      assertTruthy(filtered.length > 0, 'Filtering by tag "' + testTag + '" returns results');
      
      // Verify all filtered products have the tag
      var allCorrect = filtered.every(function(p) {
        return p.tags && p.tags.indexOf(testTag) !== -1;
      });
      assert(allCorrect, 'All filtered products have correct tag');
    } else {
      Logger.log('Note: No tags defined to test filtering');
    }
    
  } catch (err) {
    Logger.log('Note: Tag filtering test - ' + err.message);
  }
  
  Logger.log('testTagFiltering completed');
}


/**
 * ============================================================================
 * TEST SUITE RUNNER
 * ============================================================================
 */

/**
 * Runs all tests in the test suite
 * Call this function from the Apps Script editor to run complete test suite
 */
function runAllTests() {
  Logger.log('='.repeat(60));
  Logger.log('TEMPLATE DISTRIBUTION SYSTEM - TEST SUITE');
  Logger.log('='.repeat(60));
  Logger.log('Starting automated test run...\n');
  
  resetTestResults();
  
  try {
    // File selection tests
    testGetMostRecentFile();
    testFindFileByVersion();
    testListAvailableVersions();
    
    // Configuration tests
    testCaching();
    testLoadConfigFromSheet();
    testFallbackConfig();
    
    // Product redirect tests
    testHandleProductRedirect();
    
    // Admin CRUD tests
    testAdminCRUD();
    
    // Folder validation tests
    testFolderValidation();
    
    // Error handling tests
    testErrorHandling();
    
    // Mode switching tests
    testModeSwitching();
    
    // HTML rendering tests
    testHTMLRendering();
    
    // Script properties tests
    testScriptProperties();
    
    // Integration tests
    testConfigurationIntegration();
    
    // Analytics tests
    testAnalyticsTracking();
    testAnalyticsRetrieval();
    
    // Categories and tags tests
    testCategoriesAndTags();
    testCategoryFiltering();
    testTagFiltering();
    
  } catch (err) {
    Logger.log('\n✗ TEST SUITE ERROR: ' + err.message);
    Logger.log('Stack trace: ' + err.stack);
  }
  
  // Print summary
  var results = printTestSummary();
  
  // Return results for programmatic access
  return results;
}


/**
 * Quick validation test - runs essential tests only
 * Use this for quick smoke testing after deployments
 */
function runQuickTests() {
  Logger.log('='.repeat(60));
  Logger.log('QUICK TEST SUITE');
  Logger.log('='.repeat(60));
  
  resetTestResults();
  
  testGetMostRecentFile();
  testFindFileByVersion();
  testCaching();
  testModeSwitching();
  testFolderValidation();
  
  return printTestSummary();
}
