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
  try {
    // Check if config sheet ID is set (either in Script Properties or CONFIG)
    const configSheetId = getConfigSheetId();
    if (!configSheetId || configSheetId === 'YOUR_CONFIG_SHEET_ID_HERE') {
      Logger.log('checkIfNeedsSetup: No config sheet ID configured');
      return true;
    }
    
    // Check if config sheet is accessible and has products
    try {
      const config = loadConfiguration();
      const needsSetup = config.products.length === 0;
      Logger.log(`checkIfNeedsSetup: ${needsSetup ? 'Setup needed' : 'System configured'} (${config.products.length} products)`);
      return needsSetup;
    } catch (err) {
      Logger.log(`checkIfNeedsSetup: Error loading config - ${err.message}`);
      return true;
    }
  } catch (err) {
    Logger.log(`ERROR in checkIfNeedsSetup: ${err.message}`);
    return true; // Assume setup needed on error
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
  Logger.log('setupCreateConfigSheet: Starting configuration sheet creation');

  try {
    // Create the config sheet
    Logger.log('setupCreateConfigSheet: Creating new spreadsheet');
    const ss = SpreadsheetApp.create('Template Distribution - Configuration');
    const sheet = ss.getSheetByName('Sheet1');

    if (!sheet) {
      throw new Error('Failed to access default sheet in new spreadsheet');
    }

    sheet.setName('Products');
    Logger.log('setupCreateConfigSheet: Sheet renamed to "Products"');

    // Set up headers (including category and tags)
    const headers = ['name', 'folderId', 'displayName', 'enabled', 'description', 'category', 'tags'];
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
    Logger.log(`setupCreateConfigSheet: Spreadsheet created successfully (ID: ${sheetId})`);
    
    // CRITICAL: Save the sheet ID to Script Properties
    // This makes it available immediately without code changes
    Logger.log('setupCreateConfigSheet: Saving sheet ID to Script Properties');
    const saveResult = setConfigSheetId(sheetId);
    if (!saveResult.success) {
      Logger.log(`WARNING in setupCreateConfigSheet: Failed to save config sheet ID - ${saveResult.error}`);
      // Return partial success - sheet was created but not saved to properties
      return {
        success: true,
        sheetId: sheetId,
        sheetUrl: sheetUrl,
        warning: 'Sheet created but could not be saved to Script Properties. You may need to configure it manually.'
      };
    }

    Logger.log(`SUCCESS: Configuration sheet created and saved (ID: ${sheetId})`);
    return {
      success: true,
      sheetId: sheetId,
      sheetUrl: sheetUrl
    };
  } catch (err) {
    Logger.log(`ERROR in setupCreateConfigSheet: ${err.message}`);
    Logger.log(`ERROR stack: ${err.stack || 'No stack trace available'}`);

    // Return user-friendly error message
    return {
      success: false,
      error: 'Unable to create configuration sheet. Please check your Google Drive permissions and try again.'
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
  Logger.log(`addProduct: Starting - Product name: ${productData ? productData.name : 'undefined'}`);
  try {
    // Validate productData
    if (!productData || typeof productData !== 'object') {
      throw new Error('Invalid product data provided');
    }

    if (!productData.name || !productData.folderId) {
      Logger.log('addProduct: Validation failed - missing required fields');
      throw new Error('Product name and folder are required. Please fill in all required fields.');
    }

    // Validate product name format
    const namePattern = /^[A-Za-z0-9_-]+$/;
    if (!namePattern.test(productData.name)) {
      Logger.log(`addProduct: Invalid product name format: ${productData.name}`);
      throw new Error('Product name can only contain letters, numbers, hyphens, and underscores');
    }

    Logger.log('addProduct: Opening configuration sheet');
    const configSheetId = getConfigSheetId();
    if (!configSheetId) {
      throw new Error('Configuration sheet not set up. Please complete the setup wizard first.');
    }

    let ss, sheet;
    try {
      ss = SpreadsheetApp.openById(configSheetId);
      sheet = ss.getSheetByName('Products');
    } catch (err) {
      Logger.log(`ERROR in addProduct: Cannot access config sheet - ${err.message}`);
      throw new Error('Cannot access configuration sheet. Please check permissions or contact your administrator.');
    }

    if (!sheet) {
      throw new Error('Products sheet not found in configuration. Please check your setup.');
    }
    
    // Check if product name already exists
    Logger.log('addProduct: Checking for duplicate product names');
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === productData.name) {
        Logger.log(`addProduct: Duplicate product name found: ${productData.name}`);
        throw new Error(`A product named "${productData.name}" already exists. Please choose a different name.`);
      }
    }
    
    // Verify folder is accessible with retry logic
    Logger.log(`addProduct: Verifying folder access (ID: ${productData.folderId})`);
    let folder;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        folder = DriveApp.getFolderById(productData.folderId);
        Logger.log(`addProduct: Folder accessed successfully: ${folder.getName()}`);
        break;
      } catch (err) {
        retryCount++;
        Logger.log(`addProduct: Folder access attempt ${retryCount} failed - ${err.message}`);
        
        if (retryCount >= maxRetries) {
          throw new Error('Cannot access the selected folder. Please verify the folder exists and you have permission to access it.');
        }
        
        // Wait briefly before retry
        Utilities.sleep(500);
      }
    }
    
    // Add new row (including category and tags from main branch)
    Logger.log('addProduct: Adding product to sheet');
    const newRow = [
      productData.name,
      productData.folderId,
      productData.displayName || productData.name,
      productData.enabled !== false,
      productData.description || '',
      productData.category || 'Uncategorized',
  (Array.isArray(productData.tags) ? productData.tags.join(', ') : (productData.tags || ''))
    ];

    try {
      sheet.appendRow(newRow);
    } catch (err) {
      Logger.log(`ERROR in addProduct: Failed to append row - ${err.message}`);
      throw new Error('Failed to save product to configuration sheet. Please try again.');
    }
    
    // Clear cache
    Logger.log('addProduct: Clearing configuration cache');
    try {
      clearConfigCache();
    } catch (err) {
      Logger.log(`WARNING in addProduct: Failed to clear cache - ${err.message}`);
      // Non-critical error, continue
    }
    
    Logger.log(`SUCCESS: Product "${productData.name}" added successfully`);

    return {
      success: true,
      message: `Product "${productData.displayName || productData.name}" added successfully`
    };
  } catch (err) {
    Logger.log(`ERROR in addProduct: ${err.message}`);
    Logger.log(`ERROR stack: ${err.stack || 'No stack trace available'}`);
    
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
  Logger.log(`updateProduct: Starting - Product: ${productName}`);
  
  try {
    // Validate inputs
    if (!productName || typeof productName !== 'string') {
      throw new Error('Invalid product name');
    }
    
    if (!productData || typeof productData !== 'object') {
      throw new Error('Invalid product data');
    }
    
    if (!productData.folderId) {
      throw new Error('Folder is required. Please select a folder.');
    }
    
    Logger.log('updateProduct: Opening configuration sheet');
    const configSheetId = getConfigSheetId();
    // (validation and sheet access handled above)
    
    if (!configSheetId) {
      throw new Error('Configuration sheet not set up. Please complete the setup wizard first.');
    }
    
    let ss, sheet;
    try {
      ss = SpreadsheetApp.openById(configSheetId);
      sheet = ss.getSheetByName('Products');
    } catch (err) {
      Logger.log(`ERROR in updateProduct: Cannot access config sheet - ${err.message}`);
      throw new Error('Cannot access configuration sheet. Please check permissions.');
    }
    
    if (!sheet) {
      throw new Error('Products sheet not found in configuration.');
    }
    
    const data = sheet.getDataRange().getValues();
    
    // Find the product row
    Logger.log('updateProduct: Finding product row');
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === productName) {
        rowIndex = i + 1; // Sheet rows are 1-indexed
        break;
      }
    }
    
    if (rowIndex === -1) {
      Logger.log(`updateProduct: Product not found: ${productName}`);
      throw new Error(`Product "${productName}" not found. It may have been deleted.`);
    }
    
    // Verify folder is accessible if changed with retry logic
    if (productData.folderId !== data[rowIndex - 1][1]) {
      // Folder verification loop handled above; no duplicate block
      Logger.log(`updateProduct: Verifying new folder (ID: ${productData.folderId})`);
      
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          const folder = DriveApp.getFolderById(productData.folderId);
          Logger.log(`updateProduct: Folder verified: ${folder.getName()}`);
          break;
        } catch (err) {
          retryCount++;
          Logger.log(`updateProduct: Folder verification attempt ${retryCount} failed - ${err.message}`);
          
          if (retryCount >= maxRetries) {
            throw new Error('Cannot access the selected folder. Please verify the folder exists and you have permission.');
          }
          
          Utilities.sleep(500);
        }
      }
    }
    
  // Update row (including category and tags)
  Logger.log('updateProduct: Updating product data');
    // Expected columns: name, folderId, displayName, enabled, description, category, tags (7 total)
    const EXPECTED_COLUMN_COUNT = 7;
    const updatedRow = [
      productData.name || productName,
      productData.folderId,
      productData.displayName || productData.name,
      productData.enabled !== false,
      productData.description || '',
      productData.category || 'Uncategorized',
      productData.tags ? (Array.isArray(productData.tags) ? productData.tags.join(', ') : productData.tags) : ''
    ];
    
    // Validate column count matches expected
    if (updatedRow.length !== EXPECTED_COLUMN_COUNT) {
      Logger.log(`WARNING: Expected ${EXPECTED_COLUMN_COUNT} columns but got ${updatedRow.length}`);
    }
    try {
      sheet.getRange(rowIndex, 1, 1, updatedRow.length).setValues([updatedRow]);
    } catch (err) {
      Logger.log(`ERROR in updateProduct: Failed to update row - ${err.message}`);
      throw new Error('Failed to save changes. Please try again.');
    }
    
    // Clear cache
    Logger.log('updateProduct: Clearing configuration cache');
    try {
      clearConfigCache();
    } catch (err) {
      Logger.log(`WARNING in updateProduct: Failed to clear cache - ${err.message}`);
    }
    
    Logger.log(`SUCCESS: Product "${productName}" updated successfully`);

    return {
      success: true,
      message: `Product "${productData.displayName || productName}" updated successfully`
    };
  } catch (err) {
    Logger.log(`ERROR in updateProduct: ${err.message}`);
    Logger.log(`ERROR stack: ${err.stack || 'No stack trace available'}`);
    
    return {
      success: false,
      error: err.message
    };
  }
}


/**
 * Deletes a product from configuration
 * DESTRUCTIVE OPERATION - includes validation
 * 
 * @param {string} productName - Name of product to delete
 * @returns {Object} Result of operation
 */
function deleteProduct(productName) {
  Logger.log(`deleteProduct: Starting - Product: ${productName}`);
  
  try {
    // Validate input
    if (!productName || typeof productName !== 'string') {
      throw new Error('Invalid product name');
    }
    
    Logger.log('deleteProduct: Opening configuration sheet');
    const configSheetId = getConfigSheetId();
    // (config sheet validation and access already handled above)
    
    if (!configSheetId) {
      throw new Error('Configuration sheet not set up.');
    }
    
    let ss, sheet;
    try {
      ss = SpreadsheetApp.openById(configSheetId);
      sheet = ss.getSheetByName('Products');
    } catch (err) {
      Logger.log(`ERROR in deleteProduct: Cannot access config sheet - ${err.message}`);
      throw new Error('Cannot access configuration sheet. Please check permissions.');
    }
    
    if (!sheet) {
      throw new Error('Products sheet not found in configuration.');
    }
    
    const data = sheet.getDataRange().getValues();
    
    // Find the product row
    Logger.log('deleteProduct: Finding product row');
    let rowIndex = -1;
    let productDisplayName = productName;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === productName) {
        rowIndex = i + 1; // Sheet rows are 1-indexed
        productDisplayName = data[i][2] || productName; // Get display name for response
        break;
      }
    }
    
    if (rowIndex === -1) {
      Logger.log(`deleteProduct: Product not found: ${productName}`);
      throw new Error(`Product "${productName}" not found. It may have already been deleted.`);
    }
    
    // Additional safety check - confirm product exists before deletion
    const productToDelete = data[rowIndex - 1];
    Logger.log(`deleteProduct: Confirmed product for deletion - Name: ${productToDelete[0]}, Display: ${productToDelete[2]}`);
    
    // Delete the row
    Logger.log(`deleteProduct: Deleting row ${rowIndex}`);
    try {
      sheet.deleteRow(rowIndex);
    } catch (err) {
      Logger.log(`ERROR in deleteProduct: Failed to delete row - ${err.message}`);
      throw new Error('Failed to delete product. Please try again.');
    }

    // Clear cache
    Logger.log('deleteProduct: Clearing configuration cache');
    try {
      clearConfigCache();
    } catch (err) {
      Logger.log(`WARNING in deleteProduct: Failed to clear cache - ${err.message}`);
    }

    Logger.log(`SUCCESS: Product "${productName}" deleted successfully`);

    return {
      success: true,
      message: `Product "${productDisplayName}" has been permanently deleted`
    };
  } catch (err) {
    Logger.log(`ERROR in deleteProduct: ${err.message}`);
    Logger.log(`ERROR stack: ${err.stack || 'No stack trace available'}`);
    
    Logger.log(`ERROR in deleteProduct: ${err.message}`);
    Logger.log(`ERROR stack: ${err.stack || 'No stack trace available'}`);
    
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
  Logger.log(`toggleProductEnabled: Starting - Product: ${productName}`);
  try {
    // Validate input
    if (!productName || typeof productName !== 'string') {
      throw new Error('Invalid product name');
    }

    Logger.log('toggleProductEnabled: Opening configuration sheet');
    const configSheetId = getConfigSheetId();
    if (!configSheetId) {
      throw new Error('Configuration sheet not set up.');
    }

    let ss, sheet;
    try {
      ss = SpreadsheetApp.openById(configSheetId);
      sheet = ss.getSheetByName('Products');
    } catch (err) {
      Logger.log(`ERROR in toggleProductEnabled: Cannot access config sheet - ${err.message}`);
      throw new Error('Cannot access configuration sheet. Please check permissions.');
    }

    if (!sheet) {
      throw new Error('Products sheet not found in configuration.');
    }

    const data = sheet.getDataRange().getValues();

    // Find the product row
    Logger.log('toggleProductEnabled: Finding product row');
    let rowIndex = -1;
    let currentStatus = false;
    let productDisplayName = productName;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === productName) {
        rowIndex = i + 1;
        currentStatus = data[i][3];
        productDisplayName = data[i][2] || productName;
        break;
      }
    }

    if (rowIndex === -1) {
      Logger.log(`toggleProductEnabled: Product not found: ${productName}`);
      throw new Error(`Product "${productName}" not found. It may have been deleted.`);
    }

    const newStatus = !currentStatus;
    Logger.log(`toggleProductEnabled: Toggling status from ${currentStatus} to ${newStatus}`);

    // Toggle enabled status
    try {
      sheet.getRange(rowIndex, 4).setValue(newStatus);
    } catch (err) {
      Logger.log(`ERROR in toggleProductEnabled: Failed to update status - ${err.message}`);
      throw new Error('Failed to update product status. Please try again.');
    }
    
    // Clear cache
    Logger.log('toggleProductEnabled: Clearing configuration cache');
    try {
      clearConfigCache();
    } catch (err) {
      Logger.log(`WARNING in toggleProductEnabled: Failed to clear cache - ${err.message}`);
    }
    
    Logger.log(`SUCCESS: Product "${productName}" toggled: ${currentStatus} -> ${newStatus}`);
    
    return {
      success: true,
      enabled: newStatus,
      message: `Product "${productDisplayName}" ${newStatus ? 'enabled' : 'disabled'} successfully`
    };
  } catch (err) {
    Logger.log(`ERROR in toggleProductEnabled: ${err.message}`);
    Logger.log(`ERROR stack: ${err.stack || 'No stack trace available'}`);
    
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
  Logger.log(`getFolderDetails: Starting - Folder ID: ${folderId ? folderId.substring(0, 10) + '...' : 'undefined'}`);
  
  Logger.log(`getFolderDetails: Starting - Folder ID: ${folderId ? folderId.substring(0, 10) + '...' : 'undefined'}`);
  
  try {
    if (!folderId || typeof folderId !== 'string') {
      throw new Error('Invalid folder ID provided');
    }
    
    if (!folderId || typeof folderId !== 'string') {
      throw new Error('Invalid folder ID provided');
    }
    
    const id = normalizeFolderId(folderId);
    Logger.log(`getFolderDetails: Normalized folder ID: ${id.substring(0, 10)}...`);
    
    // Retry logic for folder access
    let folder;
    let retryCount = 0;
    const maxRetries = 3;
    let lastError;
    
    while (retryCount < maxRetries) {
      try {
        folder = DriveApp.getFolderById(id);
        break;
      } catch (err) {
        lastError = err;
        retryCount++;
        Logger.log(`getFolderDetails: Access attempt ${retryCount} failed - ${err.message}`);
        
        if (retryCount < maxRetries) {
          Utilities.sleep(500);
        }
      }
    }
    
    if (!folder) {
      throw lastError || new Error('Unable to access folder');
    }
    
    Logger.log(`getFolderDetails: Folder accessed - Name: ${folder.getName()}`);
    
    // Count files with error handling
    let fileCount = 0;
    try {
      const files = folder.getFiles();
      while (files.hasNext()) {
        files.next();
        fileCount++;
      }
    } catch (err) {
      Logger.log(`WARNING in getFolderDetails: Failed to count files - ${err.message}`);
      // Continue with fileCount = 0
    }
    
    Logger.log(`getFolderDetails: Success - ${fileCount} files found`);
    
    return {
      success: true,
      name: folder.getName(),
      url: folder.getUrl(),
      fileCount: fileCount
    };
  } catch (err) {
    Logger.log(`ERROR in getFolderDetails: ${err.message}`);
    Logger.log(`ERROR stack: ${err.stack || 'No stack trace available'}`);
    
    return {
      success: false,
      error: 'Unable to access folder. Please verify the folder ID and your permissions.'
    };
  }
}

/**
 * Gets the parent folder ID from a file ID.
 * This allows users to select a file in the Picker, and we extract the folder.
 * More reliable than folder-only Picker views.
 * 
 * @param {string} fileId - Google Drive file ID
 * @returns {Object} Result with folderId, folderName, and fileCount
 */
function getParentFolderFromFile(fileId) {
  Logger.log(`getParentFolderFromFile: Starting - File ID: ${fileId ? fileId.substring(0, 10) + '...' : 'undefined'}`);
  
  try {
    if (!fileId || typeof fileId !== 'string') {
      throw new Error('Invalid file ID provided');
    }
    
    // Get the file with retry logic
    let file;
    let retryCount = 0;
    const maxRetries = 3;
    let lastError;
    
    while (retryCount < maxRetries) {
      try {
        file = DriveApp.getFileById(fileId);
        break;
      } catch (err) {
        lastError = err;
        retryCount++;
        Logger.log(`getParentFolderFromFile: File access attempt ${retryCount} failed - ${err.message}`);
        
        if (retryCount < maxRetries) {
          Utilities.sleep(500);
        }
      }
    }
    
    if (!file) {
      throw lastError || new Error('Unable to access file');
    }
    
      Logger.log(`getParentFolderFromFile: File accessed - Name: ${file.getName()}`);
    
    // Get parent folders (files can have multiple parents, but we'll use the first)
    const parents = file.getParents();
    
    if (!parents.hasNext()) {
      Logger.log('getParentFolderFromFile: File has no parent folder');
      return {
        success: false,
        error: 'The selected file has no parent folder. Please select a file that is stored in a folder.'
      };
    }
    
    const folder = parents.next();
    const folderId = folder.getId();
    const folderName = folder.getName();
    
    Logger.log(`getParentFolderFromFile: Parent folder found - ${folderName}`);
    
    // Count all files in the folder (templates can be any type)
    let fileCount = 0;
    try {
      const files = folder.getFiles();
      while (files.hasNext()) {
        files.next();
        fileCount++;
      }
    } catch (err) {
      Logger.log(`WARNING in getParentFolderFromFile: Failed to count files - ${err.message}`);
      // Continue with fileCount = 0
    }
    
    Logger.log(`getParentFolderFromFile: Success - Folder "${folderName}" with ${fileCount} files`);
    
    return {
      success: true,
      folderId: folderId,
      folderName: folderName,
      folderUrl: folder.getUrl(),
      fileCount: fileCount
    };
    
  } catch (err) {
    Logger.log(`ERROR in getParentFolderFromFile: ${err.message}`);
    Logger.log(`ERROR stack: ${err.stack || 'No stack trace available'}`);
    
    return {
      success: false,
      error: 'Unable to access the selected file or its parent folder. Please verify your permissions.'
    };
  }
}

/**
 * Lists root-level folders in the deployer's Drive account.
 * Used as a fallback UI when the Picker cannot be used.
 * @returns {Object} { success: true, folders: [{id,name}, ...] }
 */
function listRootFolders() {
  Logger.log('listRootFolders: Starting');
  
  Logger.log('listRootFolders: Starting');
  
  try {
    const folders = DriveApp.getFolders();
    const out = [];
    let count = 0;
    const maxFolders = 100; // Limit to prevent excessive processing
    
    while (folders.hasNext() && count < maxFolders) {
      try {
        const f = folders.next();
        out.push({ id: f.getId(), name: f.getName() });
        count++;
      } catch (err) {
        Logger.log(`WARNING in listRootFolders: Skipping folder due to error - ${err.message}`);
        // Skip this folder and continue
      }
    }
    
    Logger.log(`listRootFolders: Success - Found ${out.length} folders`);
    
    return { 
      success: true, 
      folders: out,
      truncated: count >= maxFolders
    };
    
    return { 
      success: true, 
      folders: out,
      truncated: count >= maxFolders
    };
  } catch (err) {
    Logger.log(`ERROR in listRootFolders: ${err.message}`);
    Logger.log(`ERROR stack: ${err.stack || 'No stack trace available'}`);
    
    return { 
      success: false, 
      error: 'Unable to list folders. Please check your Drive permissions.' 
    };
    Logger.log(`ERROR in listRootFolders: ${err.message}`);
    Logger.log(`ERROR stack: ${err.stack || 'No stack trace available'}`);
    
    return { 
      success: false, 
      error: 'Unable to list folders. Please check your Drive permissions.' 
    };
  }
}

/**
 * Lists child folders for a given folder ID.
 * @param {string} folderId
 * @returns {Object} { success: true, folders: [...] }
 */
function listFolderChildren(folderId) {
  Logger.log(`listFolderChildren: Starting - Folder ID: ${folderId ? folderId.substring(0, 10) + '...' : 'undefined'}`);
  
  Logger.log(`listFolderChildren: Starting - Folder ID: ${folderId ? folderId.substring(0, 10) + '...' : 'undefined'}`);
  
  try {
    if (!folderId || typeof folderId !== 'string') {
      throw new Error('Invalid folder ID provided');
    }
    
    if (!folderId || typeof folderId !== 'string') {
      throw new Error('Invalid folder ID provided');
    }
    
    const id = normalizeFolderId(folderId);
    
    // Retry logic for folder access
    
    
    // Retry logic for folder access
    let folder;
    let retryCount = 0;
    const maxRetries = 3;
    let lastError;
    
    while (retryCount < maxRetries) {
      try {
        folder = DriveApp.getFolderById(id);
        break;
      } catch (err) {
        lastError = err;
        retryCount++;
        Logger.log(`listFolderChildren: Access attempt ${retryCount} failed - ${err.message}`);
        
        if (retryCount < maxRetries) {
          Utilities.sleep(500);
        }
      }
    }
    
    if (!folder) {
      throw lastError || new Error('Unable to access folder');
    }
    
    const children = folder.getFolders();
    const out = [];
    let count = 0;
    const maxFolders = 100;
    
    while (children.hasNext() && count < maxFolders) {
      try {
        const f = children.next();
        out.push({ id: f.getId(), name: f.getName() });
        count++;
      } catch (err) {
        Logger.log(`WARNING in listFolderChildren: Skipping folder due to error - ${err.message}`);
      }
    }
    
    Logger.log(`listFolderChildren: Success - Found ${out.length} child folders`);
    
    return { 
      success: true, 
      folders: out,
      truncated: count >= maxFolders
    };
  } catch (err) {
    Logger.log(`ERROR in listFolderChildren: ${err.message}`);
    Logger.log(`ERROR stack: ${err.stack || 'No stack trace available'}`);
    
    return { 
      success: false, 
      error: 'Unable to list folder contents. Please verify the folder ID and your permissions.' 
    };
    Logger.log(`ERROR in listFolderChildren: ${err.message}`);
    Logger.log(`ERROR stack: ${err.stack || 'No stack trace available'}`);
    
    return { 
      success: false, 
      error: 'Unable to list folder contents. Please verify the folder ID and your permissions.' 
    };
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

    const out = {
      success: true,
      status: code,
      headers: hdrs,
      bodySnippet: text
    };

    // Log result so it appears in Execution logs when run from the editor
    try { Logger.log('pickerKeyDiagnostics result: %s', JSON.stringify(out)); } catch (e) {}

    return out;
  } catch (err) {
    const out = { success: false, error: err.message };
    try { Logger.log('pickerKeyDiagnostics error: %s', JSON.stringify(out)); } catch (e) {}
    return out;
  }
}


/**
 * ============================================================================
 * ANALYTICS ADMIN FUNCTIONS
 * ============================================================================
 */

/**
 * Gets analytics summary for admin panel display.
 * Wraps the Analytics.gs function with admin-specific formatting.
 * 
 * @returns {Object} Analytics summary
 */
 
function getAnalyticsForAdmin() {
  try {
    return getAnalyticsSummary();
  } catch (err) {
    Logger.log('ERROR in getAnalyticsForAdmin: ' + err.message);
    return {
      error: err.message,
      totalAccesses: 0,
      products: []
    };
  }
}
 
/**
 * Gets filtered access logs for admin panel.
 * 
 * @param {Object} options - Filter options
 * @returns {Object} Access logs
 */
function getAccessLogsForAdmin(options) {
  try {
    return getAccessLogs(options);
  } catch (err) {
    Logger.log('ERROR in getAccessLogsForAdmin: ' + err.message);
    return {
      success: false,
      error: err.message,
      logs: []
    };
  }
}


/**
 * Creates the analytics sheet from admin panel.
 * 
 * @returns {Object} Result with sheet info
 */
function adminCreateAnalyticsSheet() {
  try {
    return createAnalyticsSheet();
  } catch (err) {
    Logger.log('ERROR in adminCreateAnalyticsSheet: ' + err.message);
    return {
      success: false,
      error: err.message
    };
  }
}


/**
 
 * Exports analytics to CSV for download.
 * 
 
 * ============================================================================
 * BULK OPERATIONS & CSV IMPORT/EXPORT
 * ============================================================================
 */
/**
 * Exports analytics to CSV for download.
 *
 
 * @param {Object} options - Export options
 * @returns {string} CSV data
 */
function adminExportAnalytics(options) {
  try {
    return exportAnalyticsToCSV(options);
  } catch (err) {
    Logger.log('ERROR in adminExportAnalytics: ' + err.message);
    return 'Error: ' + err.message;
  }
}

 

/**
 * ============================================================================
 
/**
 * ============================================================================
 * ANALYTICS ADMIN FUNCTIONS
 * ============================================================================
 */

/**
 * Exports all products to CSV format
 * Includes all columns: name, folderId, displayName, enabled, description, category, tags
 * 
 * @returns {Object} Result with CSV content
 */
function exportProductsToCSV() {
  try {
    const configSheetId = getConfigSheetId();
    const ss = SpreadsheetApp.openById(configSheetId);
    const sheet = ss.getSheetByName('Products');
    const data = sheet.getDataRange().getValues();
    
    if (data.length === 0) {
      throw new Error('No data to export');
    }
    
    // Convert to CSV
    const csvLines = data.map(row => {
      return row.map(cell => {
        // Escape quotes and wrap in quotes if contains comma, newline, or quote
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
          return '"' + cellStr.replace(/"/g, '""') + '"';
        }
        return cellStr;
      }).join(',');
    });
    
    const csvContent = csvLines.join('\n');
    
    Logger.log(`Exported ${data.length - 1} products to CSV`);
    
    return {
      success: true,
      csv: csvContent,
      filename: 'products_export_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd_HHmmss') + '.csv'
    };
  } catch (err) {
    Logger.log('ERROR in exportProductsToCSV: ' + err.message);
    return {
      success: false,
      error: err.message
    };
  }

/**
 * Gets analytics summary for admin panel display.
 * Wraps the Analytics.gs function with admin-specific formatting.
 * 
 * @returns {Object} Analytics summary
 */
function getAnalyticsForAdmin() {
  try {
    return getAnalyticsSummary();
  } catch (err) {
    Logger.log('ERROR in getAnalyticsForAdmin: ' + err.message);
    return {
      error: err.message,
      totalAccesses: 0,
      products: []
    };
  }
}


/**
 * Gets filtered access logs for admin panel.
 * 
 * @param {Object} options - Filter options
 * @returns {Object} Access logs
 */
function getAccessLogsForAdmin(options) {
  try {
    return getAccessLogs(options);
  } catch (err) {
    Logger.log('ERROR in getAccessLogsForAdmin: ' + err.message);
    return {
      success: false,
      error: err.message,
      logs: []
    };
    };
  }
}


/**
 * Validates CSV data before import
 * Supports all product fields including category and tags
 * 
 * @param {string} csvContent - CSV content to validate
 * @returns {Object} Validation result with parsed data and warnings
 */
function validateCSVImport(csvContent) {
  try {
    if (!csvContent || typeof csvContent !== 'string') {
      throw new Error('Invalid CSV content');
    }
    
    // Parse CSV - handle different line ending formats (Windows, Unix, Mac)
    const lines = csvContent.split(/\r?\n|\r/).filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('CSV must contain at least a header row and one data row');
    }
    
    // Parse header
    const headers = parseCSVLine(lines[0]);
    const requiredColumns = ['name', 'folderid'];
    const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
    
    // Check required columns
    const missingColumns = requiredColumns.filter(col => !normalizedHeaders.includes(col));
    if (missingColumns.length > 0) {
      throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
    }
    
    // Get column indices
    const nameIdx = normalizedHeaders.indexOf('name');
    const folderIdIdx = normalizedHeaders.indexOf('folderid');
    const displayNameIdx = normalizedHeaders.indexOf('displayname');
    const enabledIdx = normalizedHeaders.indexOf('enabled');
    const descIdx = normalizedHeaders.indexOf('description');
    const categoryIdx = normalizedHeaders.indexOf('category');
    const tagsIdx = normalizedHeaders.indexOf('tags');
    
    // Parse data rows
    const parsedProducts = [];
    const warnings = [];
    const existingProducts = loadConfiguration().products;
    const existingNames = existingProducts.map(p => p.name.toLowerCase());
    
    for (let i = 1; i < lines.length; i++) {
      const cells = parseCSVLine(lines[i]);
      
      if (cells.length === 0 || !cells[nameIdx]) {
        continue; // Skip empty rows
      }
      
      const name = cells[nameIdx].trim();
      const folderId = cells[folderIdIdx] ? cells[folderIdIdx].trim() : '';
      
      if (!name || !folderId) {
        warnings.push(`Row ${i + 1}: Missing name or folderId, skipping`);
        continue;
      }
      
      // Check for duplicates in import
      if (parsedProducts.some(p => p.name.toLowerCase() === name.toLowerCase())) {
        warnings.push(`Row ${i + 1}: Duplicate product name "${name}" in import file`);
        continue;
      }
      
      // Check if product already exists
      const isUpdate = existingNames.includes(name.toLowerCase());
      
      // Validate folder ID format (basic check)
      if (folderId && folderId.length < 10) {
        warnings.push(`Row ${i + 1}: "${name}" has suspiciously short folder ID`);
      }
      
      // Parse tags from CSV (comma-separated string to array)
      let tags = [];
      if (tagsIdx !== -1 && cells[tagsIdx]) {
        tags = cells[tagsIdx].toString().split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      }
      
      parsedProducts.push({
        name: name,
        folderId: folderId,
        displayName: displayNameIdx !== -1 && cells[displayNameIdx] ? cells[displayNameIdx].trim() : name,
        enabled: enabledIdx !== -1 && cells[enabledIdx] ? (cells[enabledIdx].toString().toUpperCase() === 'TRUE') : true,
        description: descIdx !== -1 && cells[descIdx] ? cells[descIdx].trim() : '',
        category: categoryIdx !== -1 && cells[categoryIdx] ? cells[categoryIdx].trim() : 'Uncategorized',
        tags: tags,
        isUpdate: isUpdate
      });
    }
    
    if (parsedProducts.length === 0) {
      throw new Error('No valid products found in CSV');
    }
    
    const newCount = parsedProducts.filter(p => !p.isUpdate).length;
    const updateCount = parsedProducts.filter(p => p.isUpdate).length;
    
    Logger.log(`CSV validation: ${newCount} new, ${updateCount} updates, ${warnings.length} warnings`);
    
    return {
      success: true,
      products: parsedProducts,
      warnings: warnings,
      summary: {
        total: parsedProducts.length,
        new: newCount,
        updates: updateCount
      }
    };
  } catch (err) {
    Logger.log('ERROR in validateCSVImport: ' + err.message);
    return {
      success: false,
      error: err.message
    };
  }
}


/**
 * Helper function to parse a CSV line respecting quoted fields
 * 
 * @param {string} line - CSV line to parse
 * @returns {Array<string>} Array of cell values
 */
function parseCSVLine(line) {
  const cells = [];
  let currentCell = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = i < line.length - 1 ? line[i + 1] : '';
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        currentCell += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of cell
      cells.push(currentCell);
      currentCell = '';
    } else {
      currentCell += char;
    }
  }
  
  // Add last cell
  cells.push(currentCell);
  
  return cells;
}


/**
 * Imports products from CSV with validation
 * Updates all product fields including category and tags
 * 
 * @param {string} csvContent - CSV content to import
 * @returns {Object} Result of import operation
 */
function importProductsFromCSV(csvContent) {
  try {
    // Validate first
    const validation = validateCSVImport(csvContent);
    
    if (!validation.success) {
      return validation;
    }
    
    const configSheetId = getConfigSheetId();
    const ss = SpreadsheetApp.openById(configSheetId);
    const sheet = ss.getSheetByName('Products');
    const data = sheet.getDataRange().getValues();
    
    let addedCount = 0;
    let updatedCount = 0;
    const errors = [];
    
    // Process each product
    for (const product of validation.products) {
      try {
        // Verify folder is accessible
        try {
          DriveApp.getFolderById(product.folderId);
        } catch (err) {
          errors.push(`Cannot access folder for "${product.name}": ${err.message}`);
          continue;
        }
        
        // Convert tags array to comma-separated string for sheet storage
        const tagsString = product.tags ? product.tags.join(', ') : '';
        
        if (product.isUpdate) {
          // Update existing product
          let rowIndex = -1;
          for (let i = 1; i < data.length; i++) {
            if (data[i][0].toLowerCase() === product.name.toLowerCase()) {
              rowIndex = i + 1;
              break;
            }
          }
          
          if (rowIndex !== -1) {
            const updatedRow = [
              product.name,
              product.folderId,
              product.displayName,
              product.enabled,
              product.description,
              product.category || 'Uncategorized',
              tagsString
            ];
            sheet.getRange(rowIndex, 1, 1, 7).setValues([updatedRow]);
            updatedCount++;
          }
        } else {
          // Add new product
          const newRow = [
            product.name,
            product.folderId,
            product.displayName,
            product.enabled,
            product.description,
            product.category || 'Uncategorized',
            tagsString
          ];
          sheet.appendRow(newRow);
          addedCount++;
        }
      } catch (err) {
        errors.push(`Error processing "${product.name}": ${err.message}`);
      }
    }
    
    // Clear cache
    clearConfigCache();
    
    Logger.log(`CSV import: ${addedCount} added, ${updatedCount} updated, ${errors.length} errors`);
    
    return {
      success: true,
      added: addedCount,
      updated: updatedCount,
      errors: errors,
      warnings: validation.warnings
    };
  } catch (err) {
    Logger.log('ERROR in importProductsFromCSV: ' + err.message);
    return {
      success: false,
      error: err.message
    };
  }
}


/**
 * Generates a CSV template for importing products
 * Includes all columns: name, folderId, displayName, enabled, description, category, tags
 * 
 * @returns {Object} Result with CSV template
 */
function generateCSVTemplate() {
  try {
    const headers = ['name', 'folderId', 'displayName', 'enabled', 'description', 'category', 'tags'];
    const exampleRows = [
      ['EventPlanning', 'YOUR_FOLDER_ID_HERE', 'Event Planning Tool', 'TRUE', 'Organize events effortlessly', 'Event Management', 'planning, calendar, events'],
      ['MailMerge', 'YOUR_FOLDER_ID_HERE', 'Mail Merge Pro', 'TRUE', 'Send personalized emails at scale', 'Communication', 'email, automation, outreach']
    ];
    
    const csvLines = [headers, ...exampleRows].map(row => {
      return row.map(cell => {
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
          return '"' + cellStr.replace(/"/g, '""') + '"';
        }
        return cellStr;
      }).join(',');
    });
    
    const csvContent = csvLines.join('\n');
    
    return {
      success: true,
      csv: csvContent,
      filename: 'products_template.csv'
    };
  } catch (err) {
    Logger.log('ERROR in generateCSVTemplate: ' + err.message);
    return {
      success: false,
      error: err.message
    };
  }
}


/**
 * Bulk enable/disable products
 * 
 * @param {Array<string>} productNames - Array of product names to toggle
 * @param {boolean} enabled - True to enable, false to disable
 * @returns {Object} Result of bulk operation
 */
function bulkToggleProducts(productNames, enabled) {
  try {
    if (!Array.isArray(productNames) || productNames.length === 0) {
      throw new Error('No products specified');
    }
    
    const configSheetId = getConfigSheetId();
    const ss = SpreadsheetApp.openById(configSheetId);
    const sheet = ss.getSheetByName('Products');
    const data = sheet.getDataRange().getValues();
    
    let updatedCount = 0;
    const errors = [];
    
    for (const productName of productNames) {
      try {
        // Find the product row
        let rowIndex = -1;
        for (let i = 1; i < data.length; i++) {
          if (data[i][0] === productName) {
            rowIndex = i + 1;
            break;
          }
        }
        
        if (rowIndex === -1) {
          errors.push(`Product "${productName}" not found`);
          continue;
        }
        
        // Update enabled status (column 4)
        sheet.getRange(rowIndex, 4).setValue(enabled);
        updatedCount++;
      } catch (err) {
        errors.push(`Error updating "${productName}": ${err.message}`);
      }
    }
    
    // Clear cache
    clearConfigCache();
    
    Logger.log(`Bulk toggle: ${updatedCount} products ${enabled ? 'enabled' : 'disabled'}, ${errors.length} errors`);
    
    return {
      success: true,
      updated: updatedCount,
      errors: errors,
      message: `${updatedCount} product(s) ${enabled ? 'enabled' : 'disabled'}`
    };
  } catch (err) {
    Logger.log('ERROR in bulkToggleProducts: ' + err.message);
    return {
      success: false,
      error: err.message
    };
  }
}


/**
 * Bulk delete products
 * 
 * @param {Array<string>} productNames - Array of product names to delete
 * @returns {Object} Result of bulk operation
 */
function bulkDeleteProducts(productNames) {
  try {
    if (!Array.isArray(productNames) || productNames.length === 0) {
      throw new Error('No products specified');
    }
    
    const configSheetId = getConfigSheetId();
    const ss = SpreadsheetApp.openById(configSheetId);
    const sheet = ss.getSheetByName('Products');
    const data = sheet.getDataRange().getValues();
    
    // Collect row indices to delete (sort in reverse to delete from bottom up)
    const rowsToDelete = [];
    const errors = [];
    
    for (const productName of productNames) {
      let rowIndex = -1;
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === productName) {
          rowIndex = i + 1;
          break;
        }
      }
      
      if (rowIndex === -1) {
        errors.push(`Product "${productName}" not found`);
      } else {
        rowsToDelete.push(rowIndex);
      }
    }
    
    // Sort in descending order to delete from bottom to top
    rowsToDelete.sort((a, b) => b - a);
    
    // Delete rows
    for (const rowIndex of rowsToDelete) {
      sheet.deleteRow(rowIndex);
    }
    
    // Clear cache
    clearConfigCache();
    
    Logger.log(`Bulk delete: ${rowsToDelete.length} products deleted, ${errors.length} errors`);
    
    return {
      success: true,
      deleted: rowsToDelete.length,
      errors: errors,
      message: `${rowsToDelete.length} product(s) deleted`
    };
  } catch (err) {
    Logger.log('ERROR in bulkDeleteProducts: ' + err.message);
    return {
      success: false,
      error: err.message
    };
  }
/**
 * Creates the analytics sheet from admin panel.
 * 
 * @returns {Object} Result with sheet info
 */
 


/**
 * ============================================================================
// Include HTML helper (unchanged)
 
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
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
