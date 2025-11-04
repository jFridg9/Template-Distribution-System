/**
 * ============================================================================
 * TEMPLATE DISTRIBUTION SYSTEM - Main Entry Point
 * ============================================================================
 * 
 * A smart, version-aware template distribution system that automatically
 * redirects users to the latest version of Google Sheets templates.
 * 
 * KEY FEATURES:
 * - Multi-product support (Event Planning, Mail Merge, etc.)
 * - Automatic version detection (always serves latest)
 * - Client-configurable via Google Sheets (no code changes needed)
 * - Dual deployment modes (full-featured vs. simple)
 * - Professional landing page with product selection
 * 
 * ARCHITECTURE:
 * - Configuration stored in Google Sheets (client can self-manage)
 * - Products organized in Drive subfolders
 * - Mode-based feature toggling (portfolio vs. client deployments)
 * 
 * PORTFOLIO NOTE:
 * This demonstrates enterprise-grade thinking: separating configuration from
 * code, building for client autonomy, and designing systems that scale without
 * developer intervention.
 * 
 * ============================================================================
 */


/**
 * ============================================================================
 * CONFIGURATION
 * ============================================================================
 */

const CONFIG = {
  /**
   * DEPLOYMENT MODE
   * 
   * 'full'   - All features enabled (landing page, version selection, analytics)
   *            Use for: Portfolio demonstrations, power users
   * 
   * 'simple' - Minimal features (direct redirect only, no UI)
   *            Use for: Client deployments who want simplicity
   * 
   * Change this before deploying to different environments.
   */
  mode: 'full',  // 'full' or 'simple'
  
  /**
   * CONFIGURATION SOURCE
   * 
   * Replace with the ID of your configuration Google Sheet.
   * This sheet contains the list of products, folder IDs, and settings.
   * 
   * Format: Spreadsheet ID from the URL
   * Example: https://docs.google.com/spreadsheets/d/[THIS_IS_THE_ID]/edit
   * 
   * See CONFIG_TEMPLATE.md for the expected sheet structure.
   */
  configSheetId: 'YOUR_CONFIG_SHEET_ID_HERE',
  
  /**
   * FALLBACK FOLDER (Optional)
   * 
   * If you want a single-folder deployment (simpler setup), you can set
   * a folder ID here and leave configSheetId empty. Only use this for
   * single-product deployments.
   */
  fallbackFolderId: '',
  
  /**
   * BRANDING (Full mode only)
   */
  branding: {
    organizationName: 'Your Organization',
    tagline: 'Professional Templates',
    supportEmail: 'support@example.com'
  }
};


/**
 * ============================================================================
 * MAIN WEB APP ENTRY POINT
 * ============================================================================
 * 
 * Handles all incoming HTTP GET requests to the web app.
 * 
 * ROUTES:
 * - No parameters: Landing page (full mode) or error (simple mode)
 * - ?product=X: Redirect to latest version of product X
 * - ?product=X&version=Y: Redirect to specific version (full mode only)
 * 
 * @param {Object} e - Event object containing query parameters
 * @returns {HtmlOutput|TextOutput} - HTML redirect or error message
 */
function doGet(e) {
  try {
    const params = e.parameter || {};
    
    // ========================================================================
    // ROUTE: Product-specific redirect
    // ========================================================================
    if (params.product) {
      return handleProductRedirect(params.product, params.version);
    }
    
    // ========================================================================
    // ROUTE: Landing page or default behavior
    // ========================================================================
    if (CONFIG.mode === 'full') {
      return renderLandingPage();
    } else {
      // Simple mode: no landing page, user must specify product
      return ContentService.createTextOutput(
        'Please specify a product. Example: ?product=EventPlanning'
      ).setMimeType(ContentService.MimeType.TEXT);
    }
    
  } catch (err) {
    Logger.log('ERROR in doGet(): ' + err.message);
    Logger.log('Stack: ' + err.stack);
    
    return ContentService.createTextOutput(
      'System error: ' + err.message + '. Please contact support.'
    ).setMimeType(ContentService.MimeType.TEXT);
  }
}


/**
 * ============================================================================
 * PRODUCT REDIRECT HANDLER
 * ============================================================================
 * 
 * Finds and redirects to the appropriate template based on product name
 * and optional version parameter.
 * 
 * @param {string} productName - Product identifier (e.g., 'EventPlanning')
 * @param {string} version - Optional version number (full mode only)
 * @returns {HtmlOutput|TextOutput} - Redirect or error
 */
function handleProductRedirect(productName, version) {
  // Get configuration
  const config = loadConfiguration();
  
  // Find the requested product
  const product = config.products.find(p => 
    p.name.toLowerCase() === productName.toLowerCase() && p.enabled
  );
  
  if (!product) {
    return ContentService.createTextOutput(
      `Product "${productName}" not found or not available.`
    ).setMimeType(ContentService.MimeType.TEXT);
  }
  
  // Get the folder for this product
  let folder;
  try {
    folder = DriveApp.getFolderById(product.folderId);
  } catch (err) {
    Logger.log(`ERROR: Cannot access folder for product ${productName}: ${err.message}`);
    return ContentService.createTextOutput(
      `Configuration error: Cannot access templates for "${productName}".`
    ).setMimeType(ContentService.MimeType.TEXT);
  }
  
  // Get all Google Sheets in the folder
  const files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);
  const fileList = [];
  
  while (files.hasNext()) {
    fileList.push(files.next());
  }
  
  if (fileList.length === 0) {
    return ContentService.createTextOutput(
      `No templates found for "${productName}".`
    ).setMimeType(ContentService.MimeType.TEXT);
  }
  
  // Select the appropriate file
  let selectedFile;
  
  if (version && CONFIG.mode === 'full') {
    // Try to find specific version (full mode only)
    selectedFile = findFileByVersion(fileList, version);
    if (!selectedFile) {
      return ContentService.createTextOutput(
        `Version "${version}" not found for "${productName}". ` +
        `Available versions: ${listAvailableVersions(fileList)}`
      ).setMimeType(ContentService.MimeType.TEXT);
    }
  } else {
    // Get the most recent file
    selectedFile = getMostRecentFile(fileList);
  }
  
  // Create /copy URL
  const fileUrl = selectedFile.getUrl();
  const copyUrl = fileUrl.replace(/\/edit.*$/, '/copy');
  
  // Log the redirect (useful for analytics)
  Logger.log(`Redirecting to: ${product.displayName} - ${selectedFile.getName()}`);
  
  // Return redirect HTML
  return createRedirect(copyUrl);
}


/**
 * ============================================================================
 * FILE SELECTION UTILITIES
 * ============================================================================
 */

/**
 * Finds the most recently created file from a list.
 * 
 * @param {File[]} fileList - Array of Google Drive File objects
 * @returns {File} - The most recent file
 */
function getMostRecentFile(fileList) {
  return fileList.reduce((mostRecent, file) => {
    if (!mostRecent) return file;
    return file.getDateCreated() > mostRecent.getDateCreated() ? file : mostRecent;
  }, null);
}

/**
 * Finds a file matching a specific version number.
 * Searches for version patterns like "v1.5", "1.5", "version-1.5" in filename.
 * 
 * @param {File[]} fileList - Array of Google Drive File objects
 * @param {string} version - Version to search for
 * @returns {File|null} - Matching file or null
 */
function findFileByVersion(fileList, version) {
  const versionPattern = new RegExp(`v?${version.replace('.', '\\.')}`, 'i');
  
  return fileList.find(file => {
    const fileName = file.getName();
    return versionPattern.test(fileName);
  }) || null;
}

/**
 * Lists available version numbers from filenames.
 * 
 * @param {File[]} fileList - Array of Google Drive File objects
 * @returns {string} - Comma-separated list of versions
 */
function listAvailableVersions(fileList) {
  const versions = fileList
    .map(file => {
      const match = file.getName().match(/v?([\d.]+)/i);
      return match ? match[1] : null;
    })
    .filter(v => v !== null);
  
  return versions.length > 0 ? versions.join(', ') : 'none detected';
}


/**
 * ============================================================================
 * HTML RENDERING
 * ============================================================================
 */

/**
 * Creates an HTML redirect response.
 * Uses window.top.location.href to break out of Google's iframe.
 * 
 * @param {string} url - URL to redirect to
 * @returns {HtmlOutput} - HTML redirect response
 */
function createRedirect(url) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Redirecting...</title>
      </head>
      <body>
        <p>Redirecting to template...</p>
        <script>
          window.top.location.href = '${url}';
        </script>
      </body>
    </html>
  `;
  
  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Renders the landing page with product selection.
 * Only available in 'full' mode.
 * 
 * @returns {HtmlOutput} - Landing page HTML
 */
function renderLandingPage() {
  const config = loadConfiguration();
  const products = config.products.filter(p => p.enabled);
  
  // Build product cards HTML
  const productCards = products.map(product => {
    return `
      <div class="product-card">
        <h3>${product.displayName}</h3>
        <p class="description">${product.description || 'No description available.'}</p>
        <a href="?product=${product.name}" class="btn">Get Latest Version</a>
      </div>
    `;
  }).join('');
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${CONFIG.branding.organizationName} - Templates</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            color: #333;
          }
          .container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            padding: 40px;
          }
          header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 2px solid #f0f0f0;
            padding-bottom: 30px;
          }
          h1 {
            color: #667eea;
            font-size: 2.5em;
            margin-bottom: 10px;
          }
          .tagline {
            color: #666;
            font-size: 1.1em;
          }
          .products {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
          }
          .product-card {
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            padding: 25px;
            transition: all 0.3s ease;
          }
          .product-card:hover {
            border-color: #667eea;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
            transform: translateY(-2px);
          }
          .product-card h3 {
            color: #333;
            margin-bottom: 12px;
            font-size: 1.4em;
          }
          .description {
            color: #666;
            margin-bottom: 20px;
            line-height: 1.6;
            min-height: 48px;
          }
          .btn {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 12px 24px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 600;
            transition: background 0.2s;
          }
          .btn:hover {
            background: #5568d3;
          }
          footer {
            text-align: center;
            color: #999;
            font-size: 0.9em;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #f0f0f0;
          }
          .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #999;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <header>
            <h1>${CONFIG.branding.organizationName}</h1>
            <p class="tagline">${CONFIG.branding.tagline}</p>
          </header>
          
          ${products.length > 0 ? `
            <div class="products">
              ${productCards}
            </div>
          ` : `
            <div class="empty-state">
              <h2>No templates available at this time</h2>
              <p>Please check back later or contact support.</p>
            </div>
          `}
          
          <footer>
            <p>Need help? Contact <a href="mailto:${CONFIG.branding.supportEmail}">${CONFIG.branding.supportEmail}</a></p>
          </footer>
        </div>
      </body>
    </html>
  `;
  
  return HtmlService.createHtmlOutput(html)
    .setTitle(`${CONFIG.branding.organizationName} Templates`)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
