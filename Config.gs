/**
 * ============================================================================
 * CONFIGURATION MANAGEMENT MODULE
 * ============================================================================
 * 
 * Handles loading and parsing configuration from Google Sheets.
 * This enables clients to self-manage products without touching code.
 * 
 * BENEFITS:
 * - Non-technical users can add/remove products
 * - No code deployments needed for configuration changes
 * - Centralized product catalog
 * - Audit trail (sheet edit history)
 * 
 * PORTFOLIO NOTE:
 * Demonstrates separation of code and configuration—a key principle in
 * building maintainable, client-friendly systems.
 * 
 * ============================================================================
 */


/**
 * Loads configuration from Google Sheets or falls back to default settings.
 * 
 * CACHING:
 * Uses CacheService to avoid repeated sheet reads (5-minute cache).
 * This improves performance and reduces API quota usage.
 * 
 * CONFIGURATION PRIORITY:
 * 1. Script Properties (set via admin panel/setup wizard)
 * 2. CONFIG.configSheetId (hardcoded in Code.gs)
 * 3. CONFIG.fallbackFolderId (for single-folder deployments)
 * 
 * @returns {Object} - Configuration object with products array
 */
function loadConfiguration() {
  // Check cache first
  const cache = CacheService.getScriptCache();
  const cachedConfig = cache.get('product_config');
  
  if (cachedConfig) {
    try {
      return JSON.parse(cachedConfig);
    } catch (err) {
      Logger.log('Warning: Failed to parse cached config, reloading from sheet');
    }
  }
  
  // Load from sheet
  let config;
  const configSheetId = getConfigSheetId();
  
  if (configSheetId && configSheetId !== 'YOUR_CONFIG_SHEET_ID_HERE') {
    config = loadConfigFromSheet(configSheetId);
  } else if (CONFIG.fallbackFolderId) {
    config = createFallbackConfig();
  } else {
    throw new Error('No configuration source defined. Set configSheetId or fallbackFolderId in CONFIG.');
  }
  
  // Cache for 5 minutes
  try {
    cache.put('product_config', JSON.stringify(config), 300);
  } catch (err) {
    Logger.log('Warning: Failed to cache config: ' + err.message);
  }
  
  return config;
}


/**
 * Loads product configuration from Google Sheets.
 * 
 * EXPECTED SHEET STRUCTURE:
 * Sheet name: "Products"
 * Columns: name | folderId | displayName | enabled | description
 * 
 * Example:
 * | name          | folderId      | displayName         | enabled | description                    |
 * |---------------|---------------|---------------------|---------|--------------------------------|
 * | EventPlanning | abc123...     | Event Planning Tool | TRUE    | Organize events effortlessly   |
 * | MailMerge     | def456...     | Mail Merge Pro      | TRUE    | Send personalized emails       |
 * 
 * @param {string} sheetId - Configuration sheet ID (optional, uses getConfigSheetId if not provided)
 * @returns {Object} - Configuration object
 */
function loadConfigFromSheet(sheetId) {
  try {
    const configId = sheetId || getConfigSheetId();
    const spreadsheet = SpreadsheetApp.openById(configId);
    const sheet = spreadsheet.getSheetByName('Products');
    
    if (!sheet) {
      throw new Error('Sheet "Products" not found in configuration spreadsheet');
    }
    
    const data = sheet.getDataRange().getValues();
    
    if (data.length < 2) {
      throw new Error('Configuration sheet is empty or missing data rows');
    }
    
    // Parse header row
    const headers = data[0].map(h => h.toString().toLowerCase().trim());
    const nameCol = headers.indexOf('name');
    const folderCol = headers.indexOf('folderid');
    const displayCol = headers.indexOf('displayname');
    const enabledCol = headers.indexOf('enabled');
    const descCol = headers.indexOf('description');
    
    // Validate required columns
    if (nameCol === -1 || folderCol === -1) {
      throw new Error('Configuration sheet must have "name" and "folderId" columns');
    }
    
    // Parse product rows (skip header)
    const products = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      // Skip empty rows
      if (!row[nameCol] || !row[folderCol]) continue;
      
      products.push({
        name: row[nameCol].toString().trim(),
        folderId: row[folderCol].toString().trim(),
        displayName: displayCol !== -1 ? row[displayCol].toString().trim() : row[nameCol].toString().trim(),
        enabled: enabledCol !== -1 ? (row[enabledCol] === true || row[enabledCol].toString().toUpperCase() === 'TRUE') : true,
        description: descCol !== -1 ? row[descCol].toString().trim() : ''
      });
    }
    
    Logger.log(`Loaded ${products.length} products from configuration sheet`);
    
    return { products };
    
  } catch (err) {
    Logger.log('ERROR loading config from sheet: ' + err.message);
    throw new Error('Failed to load configuration: ' + err.message);
  }
}


/**
 * Creates a simple fallback configuration for single-folder deployments.
 * Only used when configSheetId is not set but fallbackFolderId is.
 * 
 * @returns {Object} - Minimal configuration object
 */
function createFallbackConfig() {
  Logger.log('Using fallback configuration (single folder mode)');
  
  return {
    products: [
      {
        name: 'default',
        folderId: CONFIG.fallbackFolderId,
        displayName: 'Template',
        enabled: true,
        description: 'Latest template version'
      }
    ]
  };
}


/**
 * ============================================================================
 * CONFIGURATION VALIDATION (Optional utility)
 * ============================================================================
 * 
 * Use this function to test your configuration sheet setup.
 * Run it manually from the Apps Script editor to validate your sheet.
 */
function validateConfiguration() {
  try {
    const config = loadConfiguration();
    
    Logger.log('=== Configuration Validation ===');
    Logger.log(`Total products: ${config.products.length}`);
    Logger.log(`Enabled products: ${config.products.filter(p => p.enabled).length}`);
    
    config.products.forEach((product, index) => {
      Logger.log(`\n--- Product ${index + 1}: ${product.displayName} ---`);
      Logger.log(`  Name: ${product.name}`);
      Logger.log(`  Folder ID: ${product.folderId}`);
      Logger.log(`  Enabled: ${product.enabled}`);
      Logger.log(`  Description: ${product.description || '(none)'}`);
      
      // Try to access the folder
      try {
        const folder = DriveApp.getFolderById(product.folderId);
        const files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);
        let fileCount = 0;
        while (files.hasNext()) {
          files.next();
          fileCount++;
        }
        Logger.log(`  ✓ Folder accessible (${fileCount} sheets found)`);
      } catch (err) {
        Logger.log(`  ✗ ERROR accessing folder: ${err.message}`);
      }
    });
    
    Logger.log('\n=== Validation Complete ===');
    return 'Validation complete. Check logs for details.';
    
  } catch (err) {
    Logger.log('VALIDATION FAILED: ' + err.message);
    return 'Validation failed: ' + err.message;
  }
}


/**
 * ============================================================================
 * CACHE MANAGEMENT UTILITIES
 * ============================================================================
 */

/**
 * Clears the configuration cache.
 * Use this after updating the configuration sheet to force a reload.
 * 
 * Can be triggered manually or via a time-based trigger.
 */
function clearConfigCache() {
  const cache = CacheService.getScriptCache();
  cache.remove('product_config');
  Logger.log('Configuration cache cleared');
  return 'Cache cleared successfully';
}


/**
 * ============================================================================
 * RUNTIME CONFIGURATION (Script Properties)
 * ============================================================================
 * 
 * These functions allow the admin panel and setup wizard to dynamically
 * update the configuration sheet ID without modifying code.
 * 
 * Script Properties take precedence over hardcoded CONFIG values.
 */

/**
 * Gets the configuration sheet ID from Script Properties or CONFIG
 * 
 * Priority:
 * 1. Script Properties (set by admin panel/setup wizard)
 * 2. CONFIG.configSheetId (hardcoded in Code.gs)
 * 
 * @returns {string} Configuration sheet ID
 */
function getConfigSheetId() {
  const scriptProps = PropertiesService.getScriptProperties();
  const runtimeSheetId = scriptProps.getProperty('CONFIG_SHEET_ID');
  
  if (runtimeSheetId) {
    Logger.log('Using runtime config sheet ID from Script Properties');
    return runtimeSheetId;
  }
  
  Logger.log('Using hardcoded config sheet ID from CONFIG');
  return CONFIG.configSheetId;
}

/**
 * Sets the configuration sheet ID in Script Properties
 * Called by setup wizard and admin panel
 * 
 * @param {string} sheetId - Configuration sheet ID
 * @returns {Object} Result object
 */
function setConfigSheetId(sheetId) {
  try {
    if (!sheetId || typeof sheetId !== 'string') {
      throw new Error('Invalid sheet ID');
    }
    
    // Test that sheet is accessible
    try {
      SpreadsheetApp.openById(sheetId);
    } catch (err) {
      throw new Error('Cannot access sheet with ID: ' + sheetId);
    }
    
    const scriptProps = PropertiesService.getScriptProperties();
    scriptProps.setProperty('CONFIG_SHEET_ID', sheetId);
    
    // Clear cache so new config is loaded immediately
    clearConfigCache();
    
    Logger.log(`Configuration sheet ID updated to: ${sheetId}`);
    
    return {
      success: true,
      message: 'Configuration sheet ID updated successfully'
    };
  } catch (err) {
    Logger.log('ERROR in setConfigSheetId: ' + err.message);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Gets all runtime configuration from Script Properties
 * Useful for debugging
 * 
 * @returns {Object} All script properties
 */
function getRuntimeConfig() {
  const scriptProps = PropertiesService.getScriptProperties();
  return scriptProps.getProperties();
}

/**
 * Retrieves the Google Picker API key from Script Properties.
 * Set this in Apps Script: Project Settings → Script properties →
 *   key: PICKER_API_KEY, value: <your API key>
 *
 * @returns {string} API key or empty string if not set
 */
function getPickerApiKey() {
  const scriptProps = PropertiesService.getScriptProperties();
  return scriptProps.getProperty('PICKER_API_KEY') || '';
}

/**
 * Retrieves the optional Picker App ID (GCP numeric project number) from Script Properties.
 * Set this to the Google Cloud project number associated with the API key if you have one.
 * @returns {string} App ID or empty string
 */
function getPickerAppId() {
  const scriptProps = PropertiesService.getScriptProperties();
  return scriptProps.getProperty('PICKER_APP_ID') || '';
}


/**
 * ============================================================================
 * SETUP HELPER
 * ============================================================================
 * 
 * Creates a template configuration sheet in your Google Drive.
 * Run this once to generate the initial config spreadsheet.
 */
function createConfigurationSheet() {
  try {
    // Create new spreadsheet
    const ss = SpreadsheetApp.create('Template Distribution - Configuration');
    const sheet = ss.getSheetByName('Sheet1');
    sheet.setName('Products');
    
    // Set up headers
    const headers = ['name', 'folderId', 'displayName', 'enabled', 'description'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Format header row
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#4285f4')
      .setFontColor('#ffffff');
    
    // Add example rows
    const examples = [
      ['EventPlanning', 'YOUR_FOLDER_ID_HERE', 'Event Planning Tool', true, 'Organize events effortlessly'],
      ['MailMerge', 'YOUR_FOLDER_ID_HERE', 'Mail Merge Pro', true, 'Send personalized emails at scale'],
      ['InvoiceTracker', 'YOUR_FOLDER_ID_HERE', 'Invoice Tracker', false, 'Coming soon!']
    ];
    
    sheet.getRange(2, 1, examples.length, headers.length).setValues(examples);
    
    // Auto-resize columns
    for (let i = 1; i <= headers.length; i++) {
      sheet.autoResizeColumn(i);
    }
    
    // Add instructions sheet
    const instructionsSheet = ss.insertSheet('Instructions');
    const instructions = [
      ['Template Distribution System - Configuration Guide'],
      [''],
      ['HOW TO USE THIS SHEET:'],
      ['1. Replace "YOUR_FOLDER_ID_HERE" with your actual Google Drive folder IDs'],
      ['2. Each row represents one product/template you want to distribute'],
      ['3. Set "enabled" to TRUE to make a product available, FALSE to hide it'],
      ['4. Copy this sheet\'s ID and paste it into CONFIG.configSheetId in Code.gs'],
      [''],
      ['COLUMN DEFINITIONS:'],
      ['- name: Internal identifier (no spaces, use CamelCase)'],
      ['- folderId: Google Drive folder ID containing template versions'],
      ['- displayName: User-facing name shown on landing page'],
      ['- enabled: TRUE or FALSE - controls visibility'],
      ['- description: Brief description for landing page'],
      [''],
      ['FOLDER STRUCTURE:'],
      ['Each folderId should point to a folder containing versioned Google Sheets.'],
      ['Example: "EventPlanning-v1.0", "EventPlanning-v1.1", etc.'],
      ['The system automatically serves the most recent file.'],
      [''],
      ['TIPS:'],
      ['- Changes take effect within 5 minutes (configuration is cached)'],
      ['- To force immediate reload, run clearConfigCache() in Apps Script'],
      ['- Test your setup by running validateConfiguration() in Apps Script']
    ];
    
    instructionsSheet.getRange(1, 1, instructions.length, 1).setValues(instructions);
    instructionsSheet.getRange(1, 1).setFontWeight('bold').setFontSize(14);
    instructionsSheet.autoResizeColumn(1);
    
    const url = ss.getUrl();
    const id = ss.getId();
    
    Logger.log('Configuration sheet created successfully!');
    Logger.log('Spreadsheet URL: ' + url);
    Logger.log('Spreadsheet ID: ' + id);
    Logger.log('Copy this ID into CONFIG.configSheetId in Code.gs');
    
    return `Configuration sheet created!\n\nID: ${id}\n\nURL: ${url}\n\nNext: Copy the ID into CONFIG.configSheetId`;
    
  } catch (err) {
    Logger.log('ERROR creating config sheet: ' + err.message);
    throw err;
  }
}
