/**
 * ============================================================================
 * TEST SUITE - Script Properties & Configuration
 * ============================================================================
 * 
 * Manual test functions to verify Script Properties implementation.
 * Run these from the Apps Script editor to validate functionality.
 * 
 * USAGE:
 * 1. Open Apps Script editor
 * 2. Select a test function from the dropdown
 * 3. Click "Run"
 * 4. Check "Execution log" for results
 * 
 * ============================================================================
 */


/**
 * TEST 1: Verify Script Properties Priority
 * 
 * Tests that getConfigSheetId() returns Script Properties value
 * when both Script Properties and hardcoded CONFIG are set.
 */
function test_ScriptPropertiesPriority() {
  Logger.log('=== TEST: Script Properties Priority ===');
  
  try {
    // Get current values
    const scriptProps = PropertiesService.getScriptProperties();
    const runtimeId = scriptProps.getProperty('CONFIG_SHEET_ID');
    const hardcodedId = CONFIG.configSheetId;
    const resolvedId = getConfigSheetId();
    
    Logger.log(`Runtime ID (Script Properties): ${runtimeId || '(not set)'}`);
    Logger.log(`Hardcoded ID (CONFIG): ${hardcodedId}`);
    Logger.log(`Resolved ID (getConfigSheetId): ${resolvedId}`);
    
    // Test priority
    if (runtimeId) {
      if (resolvedId === runtimeId) {
        Logger.log('✅ PASS: Script Properties takes precedence');
      } else {
        Logger.log('❌ FAIL: Expected Script Properties to take precedence');
      }
    } else {
      if (resolvedId === hardcodedId) {
        Logger.log('✅ PASS: Falls back to hardcoded CONFIG when Script Properties not set');
      } else {
        Logger.log('❌ FAIL: Expected fallback to hardcoded CONFIG');
      }
    }
    
    Logger.log('=== TEST COMPLETE ===');
    return 'Test completed. Check execution log for results.';
    
  } catch (err) {
    Logger.log('❌ ERROR: ' + err.message);
    return 'Test failed: ' + err.message;
  }
}


/**
 * TEST 2: Verify setConfigSheetId() Functionality
 * 
 * Tests that setConfigSheetId() properly saves to Script Properties
 * and validates sheet accessibility before saving.
 */
function test_SetConfigSheetId() {
  Logger.log('=== TEST: setConfigSheetId() Functionality ===');
  
  try {
    const testSheetId = CONFIG.configSheetId;
    
    if (!testSheetId || testSheetId === 'YOUR_CONFIG_SHEET_ID_HERE') {
      Logger.log('⚠️  SKIP: No valid test sheet ID available in CONFIG');
      Logger.log('To run this test, set CONFIG.configSheetId to a valid sheet ID first');
      return 'Test skipped: No valid sheet ID in CONFIG';
    }
    
    Logger.log(`Testing with sheet ID: ${testSheetId}`);
    
    // Test setConfigSheetId
    const result = setConfigSheetId(testSheetId);
    
    if (result.success) {
      Logger.log('✅ PASS: setConfigSheetId() succeeded');
      Logger.log(`Message: ${result.message}`);
      
      // Verify it was saved
      const scriptProps = PropertiesService.getScriptProperties();
      const savedId = scriptProps.getProperty('CONFIG_SHEET_ID');
      
      if (savedId === testSheetId) {
        Logger.log('✅ PASS: Sheet ID correctly saved to Script Properties');
      } else {
        Logger.log('❌ FAIL: Sheet ID not saved correctly');
        Logger.log(`Expected: ${testSheetId}`);
        Logger.log(`Got: ${savedId}`);
      }
    } else {
      Logger.log('❌ FAIL: setConfigSheetId() failed');
      Logger.log(`Error: ${result.error}`);
    }
    
    Logger.log('=== TEST COMPLETE ===');
    return 'Test completed. Check execution log for results.';
    
  } catch (err) {
    Logger.log('❌ ERROR: ' + err.message);
    return 'Test failed: ' + err.message;
  }
}


/**
 * TEST 3: Verify Configuration Loading with Script Properties
 * 
 * Tests that loadConfiguration() successfully loads configuration
 * from the sheet ID resolved via Script Properties priority system.
 */
function test_LoadConfigurationWithScriptProperties() {
  Logger.log('=== TEST: Configuration Loading with Script Properties ===');
  
  try {
    const configSheetId = getConfigSheetId();
    Logger.log(`Config sheet ID resolved to: ${configSheetId}`);
    
    if (!configSheetId || configSheetId === 'YOUR_CONFIG_SHEET_ID_HERE') {
      Logger.log('⚠️  SKIP: No valid config sheet ID available');
      Logger.log('Run setup wizard or set CONFIG.configSheetId first');
      return 'Test skipped: No valid config sheet ID';
    }
    
    // Load configuration
    const config = loadConfiguration();
    
    if (config && config.products) {
      Logger.log('✅ PASS: Configuration loaded successfully');
      Logger.log(`Product count: ${config.products.length}`);
      
      // Display products
      config.products.forEach((product, index) => {
        Logger.log(`  ${index + 1}. ${product.displayName} (${product.name}) - ${product.enabled ? 'Enabled' : 'Disabled'}`);
      });
    } else {
      Logger.log('❌ FAIL: Configuration loaded but has no products');
    }
    
    Logger.log('=== TEST COMPLETE ===');
    return 'Test completed. Check execution log for results.';
    
  } catch (err) {
    Logger.log('❌ ERROR: ' + err.message);
    Logger.log('This may indicate a configuration problem. Run validateConfiguration() for details.');
    return 'Test failed: ' + err.message;
  }
}


/**
 * TEST 4: Verify Setup Wizard Flow
 * 
 * Tests that setupCreateConfigSheet() creates a sheet and
 * automatically saves it to Script Properties.
 * 
 * WARNING: This creates a new spreadsheet in your Drive.
 * Clean up after testing.
 */
function test_SetupWizardFlow() {
  Logger.log('=== TEST: Setup Wizard Flow ===');
  Logger.log('⚠️  WARNING: This will create a new test spreadsheet');
  
  try {
    // Clear Script Properties to simulate fresh setup
    const scriptProps = PropertiesService.getScriptProperties();
    const originalId = scriptProps.getProperty('CONFIG_SHEET_ID');
    Logger.log(`Original CONFIG_SHEET_ID: ${originalId || '(not set)'}`);
    
    // Temporarily clear the property to simulate fresh setup
    if (originalId) {
      Logger.log('Temporarily clearing CONFIG_SHEET_ID to simulate fresh setup...');
      scriptProps.deleteProperty('CONFIG_SHEET_ID');
    }
    
    // Run setup
    Logger.log('Running setupCreateConfigSheet()...');
    const result = setupCreateConfigSheet();
    
    if (result.success) {
      Logger.log('✅ PASS: Sheet created successfully');
      Logger.log(`Sheet ID: ${result.sheetId}`);
      Logger.log(`Sheet URL: ${result.sheetUrl}`);
      
      // Verify it was saved to Script Properties
      const savedId = scriptProps.getProperty('CONFIG_SHEET_ID');
      
      if (savedId === result.sheetId) {
        Logger.log('✅ PASS: Sheet ID automatically saved to Script Properties');
      } else {
        Logger.log('❌ FAIL: Sheet ID not saved to Script Properties');
      }
      
      // Restore original if it existed
      if (originalId) {
        Logger.log(`Restoring original CONFIG_SHEET_ID: ${originalId}`);
        scriptProps.setProperty('CONFIG_SHEET_ID', originalId);
      }
      
      Logger.log('⚠️  Remember to delete the test sheet: ' + result.sheetUrl);
      
    } else {
      Logger.log('❌ FAIL: setupCreateConfigSheet() failed');
      Logger.log(`Error: ${result.error}`);
    }
    
    Logger.log('=== TEST COMPLETE ===');
    return 'Test completed. Check execution log for results.';
    
  } catch (err) {
    Logger.log('❌ ERROR: ' + err.message);
    return 'Test failed: ' + err.message;
  }
}


/**
 * TEST 5: Verify getRuntimeConfig()
 * 
 * Tests that getRuntimeConfig() returns all Script Properties.
 */
function test_GetRuntimeConfig() {
  Logger.log('=== TEST: getRuntimeConfig() ===');
  
  try {
    const runtimeConfig = getRuntimeConfig();
    
    Logger.log('Current Script Properties:');
    
    if (Object.keys(runtimeConfig).length === 0) {
      Logger.log('  (no properties set)');
    } else {
      for (const key in runtimeConfig) {
        Logger.log(`  ${key}: ${runtimeConfig[key]}`);
      }
    }
    
    Logger.log('✅ PASS: getRuntimeConfig() executed successfully');
    Logger.log('=== TEST COMPLETE ===');
    return 'Test completed. Check execution log for results.';
    
  } catch (err) {
    Logger.log('❌ ERROR: ' + err.message);
    return 'Test failed: ' + err.message;
  }
}


/**
 * RUN ALL TESTS
 * 
 * Runs all test functions in sequence.
 * Note: Test 4 (Setup Wizard Flow) is skipped to avoid creating test sheets.
 */
function runAllTests() {
  Logger.log('=============================================================');
  Logger.log('     SCRIPT PROPERTIES TEST SUITE                          ');
  Logger.log('=============================================================');
  Logger.log('');
  
  // Run tests
  test_ScriptPropertiesPriority();
  Logger.log('');
  
  test_SetConfigSheetId();
  Logger.log('');
  
  test_LoadConfigurationWithScriptProperties();
  Logger.log('');
  
  test_GetRuntimeConfig();
  Logger.log('');
  
  // Skip test 4 (creates sheets)
  Logger.log('=== SKIPPING: test_SetupWizardFlow() ===');
  Logger.log('(Run manually if you want to test sheet creation)');
  Logger.log('');
  
  Logger.log('=============================================================');
  Logger.log('     ALL TESTS COMPLETE                                    ');
  Logger.log('=============================================================');
  
  return 'All tests completed. Check execution log for results.';
}
