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
    const files = folder.getFiles(); // Count all files, not just Sheets
    
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
 * Gets the parent folder ID from a file ID.
 * This allows users to select a file in the Picker, and we extract the folder.
 * More reliable than folder-only Picker views.
 * 
 * @param {string} fileId - Google Drive file ID
 * @returns {Object} Result with folderId, folderName, and fileCount
 */
function getParentFolderFromFile(fileId) {
  try {
    Logger.log('getParentFolderFromFile(): fileId = ' + fileId);
    
    // Get the file
    const file = DriveApp.getFileById(fileId);
    
    // Get parent folders (files can have multiple parents, but we'll use the first)
    const parents = file.getParents();
    
    if (!parents.hasNext()) {
      return {
        success: false,
        error: 'File has no parent folder (orphaned file)'
      };
    }
    
    const folder = parents.next();
    const folderId = folder.getId();
    
    // Count all files in the folder (templates can be any type)
    const files = folder.getFiles();
    let fileCount = 0;
    while (files.hasNext()) {
      files.next();
      fileCount++;
    }
    
    Logger.log('getParentFolderFromFile(): success - folder ' + folder.getName() + ' with ' + fileCount + ' files');
    
    return {
      success: true,
      folderId: folderId,
      folderName: folder.getName(),
      folderUrl: folder.getUrl(),
      fileCount: fileCount
    };
    
  } catch (err) {
    Logger.log('ERROR getParentFolderFromFile(): ' + err.message);
    return {
      success: false,
      error: 'Cannot access file or folder: ' + err.message
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
 * BULK OPERATIONS & CSV IMPORT/EXPORT
 * ============================================================================
 */

/**
 * Exports all products to CSV format
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
}


/**
 * Validates CSV data before import
 * 
 * @param {string} csvContent - CSV content to validate
 * @returns {Object} Validation result with parsed data and warnings
 */
function validateCSVImport(csvContent) {
  try {
    if (!csvContent || typeof csvContent !== 'string') {
      throw new Error('Invalid CSV content');
    }
    
    // Parse CSV
    const lines = csvContent.split('\n').filter(line => line.trim());
    
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
      
      parsedProducts.push({
        name: name,
        folderId: folderId,
        displayName: displayNameIdx !== -1 && cells[displayNameIdx] ? cells[displayNameIdx].trim() : name,
        enabled: enabledIdx !== -1 && cells[enabledIdx] ? (cells[enabledIdx].toString().toUpperCase() === 'TRUE') : true,
        description: descIdx !== -1 && cells[descIdx] ? cells[descIdx].trim() : '',
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
              product.description
            ];
            sheet.getRange(rowIndex, 1, 1, 5).setValues([updatedRow]);
            updatedCount++;
          }
        } else {
          // Add new product
          const newRow = [
            product.name,
            product.folderId,
            product.displayName,
            product.enabled,
            product.description
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
 * 
 * @returns {Object} Result with CSV template
 */
function generateCSVTemplate() {
  try {
    const headers = ['name', 'folderId', 'displayName', 'enabled', 'description'];
    const exampleRows = [
      ['EventPlanning', 'YOUR_FOLDER_ID_HERE', 'Event Planning Tool', 'TRUE', 'Organize events effortlessly'],
      ['MailMerge', 'YOUR_FOLDER_ID_HERE', 'Mail Merge Pro', 'TRUE', 'Send personalized emails at scale']
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
        
        // Update enabled status
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
