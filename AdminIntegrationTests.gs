/**
 * Integration tests for the Admin panel CRUD operations.
 *
 * These tests are intended to run in the Apps Script editor as manual test
 * functions. They will interact with the real configuration sheet and should
 * therefore be run in a test/staging environment only.
 *
 * Each function will aim to clean up after itself, but exercise caution when
 * running against production data.
 */

/**
 * Runs the full CRUD integration flow:
 *  - addProduct (create)
 *  - updateProduct (update)
 *  - toggleProductEnabled (toggle)
 *  - deleteProduct (delete)
 */
function runAdminCrudIntegrationTests() {
  Logger.log('=== ADMIN CRUD INTEGRATION TESTS ===');

  const results = [];

  try {
    const res = test_AddUpdateToggleDeleteProduct();
    results.push(res);
  } catch (err) {
    Logger.log('TEST SUITE ERROR: ' + err.message);
    results.push('ERROR: ' + err.message);
  }

  Logger.log('=== TEST SUITE COMPLETE ===');
  results.forEach((r, i) => Logger.log(`Test ${i + 1}: ${r}`));

  return results;
}

function test_AddUpdateToggleDeleteProduct() {
  Logger.log('--- Test: Add -> Update -> Toggle -> Delete product ---');

  // Check configuration
  const configSheetId = getConfigSheetId();
  if (!configSheetId || configSheetId === 'YOUR_CONFIG_SHEET_ID_HERE') {
    Logger.log('⚠️  SKIP: No valid CONFIG sheet ID configured; set CONFIG.configSheetId or Script Properties and re-run');
    return 'SKIPPED - No valid config sheet ID';
  }

  // Determine a folder to use for the test. Prefer fallbackFolderId from CONFIG, else use the first product's folder.
  let testFolderId = CONFIG.fallbackFolderId || null;

  try {
    if (!testFolderId) {
      const currentConfig = loadConfiguration();
      if (currentConfig.products && currentConfig.products.length > 0) {
        testFolderId = currentConfig.products[0].folderId;
        Logger.log('Using folderId from first product as test folder: ' + testFolderId);
      }
    }
  } catch (err) {
    Logger.log('⚠️  Warning: could not load configuration to obtain test folder - ' + err.message);
  }

  if (!testFolderId) {
    Logger.log('⚠️  SKIP: No folder available to use for tests; please set CONFIG.fallbackFolderId or add at least one product in configuration');
    return 'SKIPPED - No folder available';
  }

  // Create a unique product name (match /^[A-Za-z0-9_-]+$/)
  const timestamp = Math.floor(new Date().getTime() / 1000);
  const productName = 'TEST_PRODUCT_' + timestamp;

  // Ensure clean state: delete if existed (very unlikely)
  try {
    const existingConfig = loadConfiguration();
    if (existingConfig.products.some(p => p.name === productName)) {
      Logger.log('Cleaning pre-existing test product');
      deleteProduct(productName);
      clearConfigCache();
    }
  } catch (err) {
    // Continue; test will create product
  }

  // 1) Add product
  Logger.log('1) Add product: ' + productName);
  const addResult = addProduct({
    name: productName,
    folderId: testFolderId,
    displayName: 'Integration Test Product ' + timestamp,
    enabled: true,
    description: 'Integration test description',
    category: 'IntegrationTests',
    tags: ['integration', 'test']
  });

  if (!addResult || addResult.success !== true) {
    Logger.log('✗ FAIL: addProduct returned error - ' + (addResult && addResult.error ? addResult.error : 'Unknown error'));
    // Nothing to clean up here
    throw new Error('addProduct failed: ' + (addResult && addResult.error ? addResult.error : 'Unknown')); 
  }

  Logger.log('✓ addProduct succeeded: ' + addResult.message);
  clearConfigCache();

  // 2) Verify product exists
  let config = loadConfiguration();
  let created = config.products.find(p => p.name === productName);
  if (!created) {
    // Attempt to refresh the sheet/cache and re-check
    clearConfigCache();
    Utilities.sleep(500);
    config = loadConfiguration();
    created = config.products.find(p => p.name === productName);
  }

  if (!created) {
    // Attempt to delete if somehow made partial entry
    try { deleteProduct(productName); } catch (e) {}
    throw new Error('✗ FAIL: Product not found after creation');
  }

  Logger.log('✓ Product created and verified: ' + created.displayName);

  // 3) Update product
  Logger.log('2) Update product');
  const updateResult = updateProduct(productName, {
    folderId: testFolderId,
    displayName: 'Updated ' + created.displayName,
    enabled: false,
    description: 'Updated description (integration test)',
    category: 'TestsUpdated',
    tags: ['updated']
  });

  if (!updateResult || updateResult.success !== true) {
    // Clean up product
    try { deleteProduct(productName); } catch (e) {}
    throw new Error('✗ FAIL: updateProduct failed - ' + (updateResult && updateResult.error ? updateResult.error : 'Unknown'));
  }

  Logger.log('✓ updateProduct succeeded: ' + updateResult.message);
  clearConfigCache();

  // Validate update
  config = loadConfiguration();
  const updated = config.products.find(p => p.name === productName);
  if (!updated) {
    throw new Error('✗ FAIL: Product not found after update');
  }

  if (updated.displayName.indexOf('Updated') === -1 || updated.enabled !== false) {
    // Clean up
    deleteProduct(productName);
    throw new Error('✗ FAIL: updateProduct did not apply expected changes');
  }

  Logger.log('✓ update validated: ' + updated.displayName + ' (enabled=' + updated.enabled + ')');

  // 4) Toggle enable/disable
  Logger.log('3) Toggle status');
  const toggleResult = toggleProductEnabled(productName);
  if (!toggleResult || toggleResult.success !== true) {
    deleteProduct(productName);
    throw new Error('✗ FAIL: toggleProductEnabled failed - ' + (toggleResult && toggleResult.error ? toggleResult.error : 'Unknown'));
  }

  Logger.log('✓ toggleProductEnabled returned enabled=' + toggleResult.enabled);
  clearConfigCache();

  // Validate toggle
  config = loadConfiguration();
  const toggled = config.products.find(p => p.name === productName);
  if (!toggled) {
    throw new Error('✗ FAIL: Product not found after toggle');
  }

  if (toggled.enabled !== toggleResult.enabled) {
    deleteProduct(productName);
    throw new Error('✗ FAIL: toggleProductEnabled did not persist ' + toggleResult.enabled);
  }

  Logger.log('✓ Toggle persisted: enabled=' + toggled.enabled);

  // 5) Delete product
  Logger.log('4) Delete product');
  const delResult = deleteProduct(productName);
  if (!delResult || delResult.success !== true) {
    throw new Error('✗ FAIL: deleteProduct failed - ' + (delResult && delResult.error ? delResult.error : 'Unknown'));
  }

  Logger.log('✓ deleteProduct succeeded');
  clearConfigCache();

  // Validate deletion
  config = loadConfiguration();
  const deleted = config.products.find(p => p.name === productName);
  if (deleted) {
    throw new Error('✗ FAIL: Product still exists after deletion');
  }

  Logger.log('✓ Product deleted and verified');

  Logger.log('--- Test: Add -> Update -> Toggle -> Delete product COMPLETE ---');
  return 'PASS: add/update/toggle/delete flow succeeded';
}
