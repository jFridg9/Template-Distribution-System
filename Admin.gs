/**
 * ============================================================================
 * ADMIN PANEL MODULE
 * ============================================================================
 * 
 * Provides a user-friendly admin interface for managing products without
 * needing to edit the configuration sheet directly.
 * 
 * FEATURES:
 * - Setup wizard for first-time configuration
 * - Visual Drive folder picker (no copy/paste IDs)
 * - Add/edit/delete products through UI
 * - Enable/disable products with toggle
 * - Configuration validation
 * - Authentication check (deployer only)
 * 
 * PORTFOLIO NOTE:
 * This demonstrates UX thinking—building tools that empower non-technical
 * users to manage systems independently.
 * 
 * ============================================================================
 */


/**
 * ============================================================================
 * ADMIN PANEL ROUTING
 * ============================================================================
 */

/**
 * Serves the admin panel interface
 * Accessible via: ?admin=true
 * 
 * @returns {HtmlOutput} Admin panel HTML
 */
function renderAdminPanel() {
  // Check authentication (only deployer can access admin)
  const userEmail = Session.getActiveUser().getEmail();
  const deployerEmail = Session.getEffectiveUser().getEmail();
  
  // In development, allow any logged-in user
  // In production, restrict to deployer only
  if (CONFIG.mode === 'full' && userEmail !== deployerEmail) {
    return ContentService.createTextOutput(
      'Access denied. Only the system administrator can access the admin panel.'
    ).setMimeType(ContentService.MimeType.TEXT);
  }
  
  // Check if this is first-time setup
  const needsSetup = checkIfNeedsSetup();
  
  if (needsSetup) {
    return renderSetupWizard();
  }
  
  // Load admin panel
  const template = HtmlService.createTemplateFromFile('AdminPanel');
  template.config = CONFIG;
  template.products = loadConfiguration().products;
  
  return template.evaluate()
    .setTitle('Admin Panel - Template Distribution System')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}


/**
 * Checks if system needs initial setup
 * 
 * @returns {boolean} True if setup is needed
 */
function checkIfNeedsSetup() {
  // Check if config sheet ID is set (either in Script Properties or CONFIG)
  const configSheetId = getConfigSheetId();
  if (!configSheetId || configSheetId === 'YOUR_CONFIG_SHEET_ID_HERE') {
    return true;
  }
  
  // Check if config sheet is accessible and has products
  try {
    const config = loadConfiguration();
    return config.products.length === 0;
  } catch (err) {
    return true;
  }
}


/**
 * ============================================================================
 * SETUP WIZARD
 * ============================================================================
 */

/**
 * Renders the first-time setup wizard
 * 
 * @returns {HtmlOutput} Setup wizard HTML
 */
function renderSetupWizard() {
  const template = HtmlService.createTemplateFromFile('SetupWizard');
  template.hasConfigSheet = CONFIG.configSheetId && CONFIG.configSheetId !== 'YOUR_CONFIG_SHEET_ID_HERE';
  
  return template.evaluate()
    .setTitle('Setup Wizard - Template Distribution System')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}


/**
 * Creates configuration sheet during setup wizard
 * Called from setup wizard UI
 * 
 * Automatically saves the sheet ID to Script Properties so the system
 * uses it immediately without code changes.
 * 
 * @returns {Object} Result with sheet ID and URL
 */
function setupCreateConfigSheet() {
  try {
    // Create the config sheet
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
    
    // Auto-resize columns
    for (let i = 1; i <= headers.length; i++) {
      sheet.autoResizeColumn(i);
    }
    
    const sheetId = ss.getId();
    const sheetUrl = ss.getUrl();
    
    // CRITICAL: Save the sheet ID to Script Properties
    // This makes it available immediately without code changes
    const saveResult = setConfigSheetId(sheetId);
    if (!saveResult.success) {
      Logger.log(`Warning: Failed to save config sheet ID: ${saveResult.error}`);
      // Continue anyway - sheet was created successfully
    }
    
    Logger.log(`Setup: Created config sheet ${sheetId} and saved to Script Properties`);
    
    return {
      success: true,
      sheetId: sheetId,
      sheetUrl: sheetUrl
    };
  } catch (err) {
    Logger.log('ERROR in setupCreateConfigSheet: ' + err.message);
    return {
      success: false,
      error: err.message
    };
  }
}


/**
 * ============================================================================
 * PRODUCT MANAGEMENT
 * ============================================================================
 */

/**
 * Adds a new product to the configuration
 * Called from admin panel UI
 * 
 * @param {Object} productData - Product details
 * @returns {Object} Result of operation
 */
function addProduct(productData) {
  try {
    const configSheetId = getConfigSheetId();
    const ss = SpreadsheetApp.openById(configSheetId);
    const sheet = ss.getSheetByName('Products');
    
    // Validate product data
    if (!productData.name || !productData.folderId) {
      throw new Error('Product name and folder ID are required');
    }
    
    // Check if product name already exists
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === productData.name) {
        throw new Error('A product with this name already exists');
      }
    }
    
    // Verify folder is accessible
    try {
      DriveApp.getFolderById(productData.folderId);
    } catch (err) {
      throw new Error('Cannot access the specified folder. Check permissions.');
    }
    
    // Add new row
    const newRow = [
      productData.name,
      productData.folderId,
      productData.displayName || productData.name,
      productData.enabled !== false,
      productData.description || ''
    ];
    
    sheet.appendRow(newRow);
    
    // Clear cache
    clearConfigCache();
    
    Logger.log(`Added product: ${productData.name}`);
    
    return {
      success: true,
      message: 'Product added successfully'
    };
  } catch (err) {
    Logger.log('ERROR in addProduct: ' + err.message);
    return {
      success: false,
      error: err.message
    };
  }
}


/**
 * Updates an existing product
 * 
 * @param {string} productName - Name of product to update
 * @param {Object} productData - Updated product data
 * @returns {Object} Result of operation
 */
function updateProduct(productName, productData) {
  try {
    const configSheetId = getConfigSheetId();
    const ss = SpreadsheetApp.openById(configSheetId);
    const sheet = ss.getSheetByName('Products');
    const data = sheet.getDataRange().getValues();
    
    // Find the product row
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === productName) {
        rowIndex = i + 1; // Sheet rows are 1-indexed
        break;
      }
    }
    
    if (rowIndex === -1) {
      throw new Error('Product not found');
    }
    
    // Verify folder is accessible if changed
    if (productData.folderId !== data[rowIndex - 1][1]) {
      try {
        DriveApp.getFolderById(productData.folderId);
      } catch (err) {
        throw new Error('Cannot access the specified folder. Check permissions.');
      }
    }
    
    // Update row
    const updatedRow = [
      productData.name || productName,
      productData.folderId,
      productData.displayName || productData.name,
      productData.enabled !== false,
      productData.description || ''
    ];
    
    sheet.getRange(rowIndex, 1, 1, 5).setValues([updatedRow]);
    
    // Clear cache
    clearConfigCache();
    
    Logger.log(`Updated product: ${productName}`);
    
    return {
      success: true,
      message: 'Product updated successfully'
    };
  } catch (err) {
    Logger.log('ERROR in updateProduct: ' + err.message);
    return {
      success: false,
      error: err.message
    };
  }
}


/**
 * Deletes a product from configuration
 * 
 * @param {string} productName - Name of product to delete
 * @returns {Object} Result of operation
 */
function deleteProduct(productName) {
  try {
    const configSheetId = getConfigSheetId();
    const ss = SpreadsheetApp.openById(configSheetId);
    const sheet = ss.getSheetByName('Products');
    const data = sheet.getDataRange().getValues();
    
    // Find the product row
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === productName) {
        rowIndex = i + 1; // Sheet rows are 1-indexed
        break;
      }
    }
    
    if (rowIndex === -1) {
      throw new Error('Product not found');
    }
    
    // Delete the row
    sheet.deleteRow(rowIndex);
    
    // Clear cache
    clearConfigCache();
    
    Logger.log(`Deleted product: ${productName}`);
    
    return {
      success: true,
      message: 'Product deleted successfully'
    };
  } catch (err) {
    Logger.log('ERROR in deleteProduct: ' + err.message);
    return {
      success: false,
      error: err.message
    };
  }
}


/**
 * Toggles product enabled status
 * 
 * @param {string} productName - Name of product to toggle
 * @returns {Object} Result of operation
 */
function toggleProductEnabled(productName) {
  try {
    const configSheetId = getConfigSheetId();
    const ss = SpreadsheetApp.openById(configSheetId);
    const sheet = ss.getSheetByName('Products');
    const data = sheet.getDataRange().getValues();
    
    // Find the product row
    let rowIndex = -1;
    let currentStatus = false;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === productName) {
        rowIndex = i + 1;
        currentStatus = data[i][3];
        break;
      }
    }
    
    if (rowIndex === -1) {
      throw new Error('Product not found');
    }
    
    // Toggle enabled status
    sheet.getRange(rowIndex, 4).setValue(!currentStatus);
    
    // Clear cache
    clearConfigCache();
    
    Logger.log(`Toggled product ${productName}: ${currentStatus} -> ${!currentStatus}`);
    
    return {
      success: true,
      enabled: !currentStatus,
      message: `Product ${!currentStatus ? 'enabled' : 'disabled'} successfully`
    };
  } catch (err) {
    Logger.log('ERROR in toggleProductEnabled: ' + err.message);
    return {
      success: false,
      error: err.message
    };
  }
}


/**
 * ============================================================================
 * GOOGLE DRIVE PICKER
 * ============================================================================
 */

/**
 * Gets OAuth token for Drive Picker
 * Required for Drive Picker API
 * 
 * @returns {string} OAuth token
 */
function getOAuthToken() {
  return ScriptApp.getOAuthToken();
}
/**
 * Normalizes various folder inputs (raw ID or full URL) into a Drive folder ID
 *
 * @param {string} input - Folder ID or Google Drive URL
 * @returns {string} Extracted folder ID
 */
function normalizeFolderId(input) {
  if (!input) return '';
  var str = String(input).trim();

  // If it's already a 25+ char ID-like string without URL parts
  if (str.indexOf('http') !== 0 && str.indexOf('/') === -1 && str.indexOf('?') === -1) {
    return str;
  }

  // Handle typical Drive URL formats
  // 1) https://drive.google.com/drive/folders/<ID>
  var m1 = str.match(/\/folders\/([a-zA-Z0-9_-]{10,})/);
  if (m1 && m1[1]) return m1[1];

  // 2) https://drive.google.com/open?id=<ID>
  var m2 = str.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (m2 && m2[1]) return m2[1];

  // 3) https://drive.google.com/drive/u/0/folders/<ID>
  var m3 = str.match(/\/folders\/([a-zA-Z0-9_-]{10,})/);
  if (m3 && m3[1]) return m3[1];

  // Fallback: return as-is
  return str;
}



/**
 * Gets folder details by ID
 * Used to validate and display folder info
 * 
 * @param {string} folderId - Drive folder ID
 * @returns {Object} Folder details
 */
function getFolderDetails(folderId) {
  try {
    const id = normalizeFolderId(folderId);
    Logger.log('getFolderDetails(): resolving folder ID: ' + id);
    const folder = DriveApp.getFolderById(id);
    const files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);
    
    let fileCount = 0;
    while (files.hasNext()) {
      files.next();
      fileCount++;
    }
    
    return {
      success: true,
      name: folder.getName(),
      url: folder.getUrl(),
      fileCount: fileCount
    };
  } catch (err) {
    Logger.log('ERROR getFolderDetails(): ' + err.message);
    return {
      success: false,
      error: 'Cannot access folder: ' + err.message
    };
  }
}

/**
 * Lists root-level folders in the deployer's Drive account.
 * Used as a fallback UI when the Picker cannot be used.
 * @returns {Object} { success: true, folders: [{id,name}, ...] }
 */
function listRootFolders() {
  try {
    const folders = DriveApp.getFolders();
    const out = [];
    while (folders.hasNext()) {
      const f = folders.next();
      out.push({ id: f.getId(), name: f.getName() });
    }
    return { success: true, folders: out };
  } catch (err) {
    Logger.log('ERROR listRootFolders: ' + err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Lists child folders for a given folder ID.
 * @param {string} folderId
 * @returns {Object} { success: true, folders: [...] }
 */
function listFolderChildren(folderId) {
  try {
    const id = normalizeFolderId(folderId);
    const folder = DriveApp.getFolderById(id);
    const children = folder.getFolders();
    const out = [];
    while (children.hasNext()) {
      const f = children.next();
      out.push({ id: f.getId(), name: f.getName() });
    }
    return { success: true, folders: out };
  } catch (err) {
    Logger.log('ERROR listFolderChildren: ' + err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Diagnostic: attempt to fetch the Picker page server-side using the configured
 * PICKER_API_KEY and PICKER_APP_ID. This helps confirm whether the key/project
 * pairing is rejected on Google's side independently of the browser.
 *
 * Run this from the Apps Script editor (select function `pickerKeyDiagnostics`)
 * or call from an admin UI helper if exposed.
 *
 * @returns {Object} diagnostic info
 */
function pickerKeyDiagnostics() {
  try {
    const props = PropertiesService.getScriptProperties();
    const key = props.getProperty('PICKER_API_KEY') || '';
    const appId = props.getProperty('PICKER_APP_ID') || '';

    if (!key) return { success: false, error: 'PICKER_API_KEY not set in Script Properties' };

    const origin = 'https://script.google.com';
    const hostId = ScriptApp.getService().getUrl ? ScriptApp.getService().getUrl() : '';

    const url = 'https://docs.google.com/picker?protocol=gadgets'
      + '&origin=' + encodeURIComponent(origin)
      + (key ? '&developerKey=' + encodeURIComponent(key) : '')
      + (appId ? '&appId=' + encodeURIComponent(appId) : '')
      + '&nav=((%22folders%22))&thirdParty=true';

    const options = {
      method: 'get',
      muteHttpExceptions: true,
      followRedirects: true,
      headers: {
        'Referer': origin,
        'Origin': origin,
        'User-Agent': 'AppsScript-Diagnostic/1.0'
      },
      validateHttpsCertificates: true
    };

    const resp = UrlFetchApp.fetch(url, options);
    const code = resp.getResponseCode();
    const text = resp.getContentText().slice(0, 2000);
    const hdrs = resp.getAllHeaders ? resp.getAllHeaders() : {};

    return {
      success: true,
      status: code,
      headers: hdrs,
      bodySnippet: text
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}


/**
 * ============================================================================
 * INCLUDE HTML HELPER
 * ============================================================================
 */

/**
 * Includes content from another HTML file
 * Used for modular HTML templates
 * 
 * @param {string} filename - Name of file to include
 * @returns {string} File contents
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
