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
  // Check if config sheet ID is set
  if (!CONFIG.configSheetId || CONFIG.configSheetId === 'YOUR_CONFIG_SHEET_ID_HERE') {
    return true;
  }
  
  // Check if config sheet is accessible
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
    
    Logger.log(`Setup: Created config sheet ${sheetId}`);
    
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
    const ss = SpreadsheetApp.openById(CONFIG.configSheetId);
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
    const ss = SpreadsheetApp.openById(CONFIG.configSheetId);
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
    const ss = SpreadsheetApp.openById(CONFIG.configSheetId);
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
    const ss = SpreadsheetApp.openById(CONFIG.configSheetId);
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
 * Gets folder details by ID
 * Used to validate and display folder info
 * 
 * @param {string} folderId - Drive folder ID
 * @returns {Object} Folder details
 */
function getFolderDetails(folderId) {
  try {
    const folder = DriveApp.getFolderById(folderId);
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
    return {
      success: false,
      error: 'Cannot access folder: ' + err.message
    };
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
