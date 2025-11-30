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
   * IMPORTANT: Script Properties Override
   * If the setup wizard has been used, the config sheet ID is stored in
   * Script Properties and takes precedence over this hardcoded value.
   * This enables autonomous setup without code editing.
   * 
   * Priority: Script Properties > configSheetId > fallbackFolderId
   * 
   * See CONFIG_TEMPLATE.md for the expected sheet structure.
   */
  configSheetId: '1X4RrTt45ceYRYrzC0jAlcgBMADF1S4cWHuOfxjHZ4Is',
  
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
  },
  
  /**
   * LANDING PAGE SETTINGS (Full mode only)
   */
  landingPage: {
    tagCloudLimit: 15  // Maximum number of tags to show in tag cloud
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
    const multiParams = e.parameters || {};
    const queryString = e.queryString || '';
    
    // DEBUG: Log all parameters
    Logger.log('DEBUG: doGet called with params: ' + JSON.stringify(params));
    Logger.log('DEBUG: doGet called with parameters (multi): ' + JSON.stringify(multiParams));
    Logger.log('DEBUG: doGet called with queryString: ' + queryString);
    Logger.log('DEBUG: admin param value: ' + params.admin);
    Logger.log('DEBUG: admin param type: ' + typeof params.admin);
    
    // ========================================================================
    // ROUTE: Admin panel
    // ========================================================================
    // Smoke test: if ?smokeTest=true provided, return JSON with params & queryString for diagnostics
    if (params.smokeTest === 'true' || params.smokeTest === '1' || Object.prototype.hasOwnProperty.call(params, 'smokeTest')) {
      const debugResponse = {
        queryString: queryString,
        params: params,
        multiParams: multiParams,
        url: (e && e.parameter && e.parameter._url) ? e.parameter._url : ''
      };
      Logger.log('DEBUG: smokeTest - ' + JSON.stringify(debugResponse));
      return ContentService.createTextOutput(JSON.stringify(debugResponse)).setMimeType(ContentService.MimeType.JSON);
    }
    // Accept `?admin=true`, `?admin=1`, or presence of `?admin` as a flag
    if (params.admin === 'true' || params.admin === '1' || Object.prototype.hasOwnProperty.call(params, 'admin')) {
      Logger.log('DEBUG: Admin panel route matched!');
      return renderAdminPanel();
    }
    
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
  
  // Get all files in the folder (templates can be any type)
  const files = folder.getFiles();
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
  
  // Track analytics (non-blocking - errors won't affect redirect)
  trackProductAccess(productName, version, selectedFile.getName());
  
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
  
  // Extract unique categories
  const categories = [...new Set(products.map(p => p.category || 'Uncategorized'))].sort();
  
  // Extract all tags and count frequency
  const tagFrequency = {};
  products.forEach(product => {
    if (product.tags && Array.isArray(product.tags)) {
      product.tags.forEach(tag => {
        tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
      });
    }
  });
  
  // Sort tags by frequency (most popular first)
  const sortedTags = Object.keys(tagFrequency)
    .sort((a, b) => tagFrequency[b] - tagFrequency[a])
    .slice(0, CONFIG.landingPage.tagCloudLimit);
  
  // Fetch optional override for public webapp URL
  const publicWebAppUrl = typeof getPublicWebAppUrl === 'function' ? getPublicWebAppUrl() : '';

  // Build product cards HTML with category and tags
  const productCards = products.map(product => {
    const categoryBadge = `<span class="category-badge">${product.category || 'Uncategorized'}</span>`;
    const tagBadges = product.tags && product.tags.length > 0 
      ? product.tags.map(tag => `<span class="tag-badge">${tag}</span>`).join('')
      : '';
    
    return `
      <div class="product-card" data-category="${product.category || 'Uncategorized'}" data-tags="${product.tags ? product.tags.join(',') : ''}">
        <div class="badges">
          ${categoryBadge}
        </div>
        <h3>${product.displayName}</h3>
        <p class="description">${product.description || 'No description available.'}</p>
        ${tagBadges ? `<div class="tags">${tagBadges}</div>` : ''}
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
            max-width: 1200px;
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
            position: relative;
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
          .admin-link {
            position: absolute;
            right: 0;
            top: 0;
          }
          .admin-link a {
            color: #667eea;
            text-decoration: none;
            font-weight: 600;
          }
          
          /* Filters Section */
          .filters {
            margin-bottom: 30px;
            padding: 20px;
            background: #f9f9f9;
            border-radius: 8px;
          }
          .filters-row {
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
            align-items: center;
          }
          .filter-group {
            flex: 1;
            min-width: 200px;
          }
          .filter-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #555;
          }
          .filter-group select,
          .filter-group input {
            width: 100%;
            padding: 10px;
            border: 2px solid #e0e0e0;
            border-radius: 6px;
            font-size: 1em;
            font-family: inherit;
          }
          .filter-group select:focus,
          .filter-group input:focus {
            outline: none;
            border-color: #667eea;
          }
          .clear-filters {
            padding: 10px 20px;
            background: #e0e0e0;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            align-self: flex-end;
          }
          .clear-filters:hover {
            background: #d0d0d0;
          }
          
          /* Tag Cloud */
          .tag-cloud {
            margin-bottom: 20px;
            padding: 15px;
            background: #f5f5f5;
            border-radius: 8px;
          }
          .tag-cloud h3 {
            font-size: 0.9em;
            color: #666;
            margin-bottom: 12px;
            text-transform: uppercase;
          }
          .tag-cloud-items {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }
          .tag-cloud-item {
            padding: 6px 12px;
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 16px;
            font-size: 0.85em;
            cursor: pointer;
            transition: all 0.2s;
          }
          .tag-cloud-item:hover {
            background: #667eea;
            color: white;
            border-color: #667eea;
          }
          .tag-cloud-item.active {
            background: #667eea;
            color: white;
            border-color: #667eea;
          }
          
          /* Products Grid */
          .products {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
          }
          .product-card {
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            padding: 25px;
            transition: all 0.3s ease;
            display: flex;
            flex-direction: column;
          }
          .product-card.hidden {
            display: none;
          }
          .product-card:hover {
            border-color: #667eea;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
            transform: translateY(-2px);
          }
          .badges {
            display: flex;
            gap: 8px;
            margin-bottom: 12px;
            flex-wrap: wrap;
          }
          .category-badge {
            padding: 4px 12px;
            background: #667eea;
            color: white;
            border-radius: 12px;
            font-size: 0.75em;
            font-weight: 600;
            text-transform: uppercase;
          }
          .tags {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-top: 12px;
            margin-bottom: 15px;
          }
          .tag-badge {
            padding: 3px 10px;
            background: #f0f0f0;
            color: #666;
            border-radius: 10px;
            font-size: 0.75em;
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
            flex-grow: 1;
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
            text-align: center;
          }
          .btn:hover {
            background: #5568d3;
          }
          
          /* Results counter */
          .results-info {
            margin-bottom: 20px;
            color: #666;
            font-size: 0.95em;
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
          
          /* ============================================================================
           * MOBILE RESPONSIVE STYLES
           * ============================================================================
           * Optimizations for mobile devices (phones and tablets)
           * Breakpoints: 320px (small phones), 480px (phones), 768px (tablets)
           * ========================================================================== */
          
          /* Small phones (iPhone SE, etc) - 320px to 479px */
          @media (max-width: 479px) {
            body {
              padding: 10px;
            }
            
            .container {
              padding: 20px;
              border-radius: 8px;
            }
            
            header {
              padding-bottom: 20px;
              margin-bottom: 25px;
              position: relative;
            }
            
            h1 {
              font-size: 1.6em;
              margin-bottom: 8px;
            }
            
            .tagline {
              font-size: 0.95em;
            }
            
            /* Reposition admin link for mobile */
            header div[style*="position: absolute"] {
              position: relative !important;
              right: auto !important;
              top: auto !important;
              text-align: center;
              margin-top: 15px;
            }
            
            header div[style*="position: absolute"] a {
              display: inline-block;
              padding: 10px 20px;
              background: #667eea;
              color: white !important;
              border-radius: 6px;
              min-height: 44px;
              line-height: 24px;
            }
            
            /* Stack product cards on mobile */
            .products {
              grid-template-columns: 1fr;
              gap: 15px;
              margin-bottom: 20px;
            }
            
            .product-card {
              padding: 20px;
            }
            
            .product-card h3 {
              font-size: 1.2em;
              margin-bottom: 10px;
            }
            
            .description {
              font-size: 0.95em;
              margin-bottom: 15px;
            }
            
            /* Touch-friendly buttons */
            .btn {
              display: block;
              width: 100%;
              min-height: 44px;
              padding: 12px 20px;
              text-align: center;
            }
            
            /* Category and tags adapt */
            .category-badge {
              font-size: 0.7em;
            }
            
            .tags {
              gap: 5px;
            }
            
            .tag-badge {
              font-size: 0.7em;
            }
            
            footer {
              font-size: 0.85em;
              margin-top: 30px;
              padding-top: 15px;
            }
            
            footer a {
              display: inline-block;
              margin-top: 5px;
            }
            
            .empty-state {
              padding: 40px 15px;
            }
            
            .empty-state h2 {
              font-size: 1.3em;
            }
            
            .results-info {
              font-size: 0.9em;
            }
          }
          
          /* Phones in portrait - 480px to 767px */
          @media (min-width: 480px) and (max-width: 767px) {
            body {
              padding: 15px;
            }
            
            .container {
              padding: 30px;
            }
            
            h1 {
              font-size: 2em;
            }
            
            .tagline {
              font-size: 1em;
            }
            
            /* One column on larger phones */
            .products {
              grid-template-columns: 1fr;
              gap: 18px;
            }
            
            .product-card {
              padding: 22px;
            }
            
            .btn {
              min-height: 44px;
            }
          }
          
          /* Tablets - 768px to 1023px */
          @media (min-width: 768px) and (max-width: 1023px) {
            .container {
              max-width: 100%;
              padding: 35px;
            }
            
            h1 {
              font-size: 2.2em;
            }
            
            /* Two columns on tablets */
            .products {
              grid-template-columns: repeat(2, 1fr);
            }
            
            .btn {
              min-height: 44px;
            }
          }
          
          /* Touch device optimizations */
          @media (hover: none) and (pointer: coarse) {
            /* Increase touch targets */
            .btn {
              min-height: 44px;
              min-width: 44px;
            }
            
            /* Remove hover effects on touch devices */
            .btn:hover {
              background: #667eea;
              transform: none;
            }
            
            .product-card:hover {
              transform: none;
              border-color: #e0e0e0;
              box-shadow: none;
            }
            
            /* Add active state for touch feedback */
            .btn:active {
              opacity: 0.8;
              transform: scale(0.98);
            }
            
            .product-card:active {
              border-color: #667eea;
              box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15);
            }
          }
          
          /* Landscape orientation handling */
          @media (max-width: 767px) and (orientation: landscape) {
            h1 {
              font-size: 1.5em;
            }
            
            .container {
              padding: 25px;
            }
            
            header {
              padding-bottom: 15px;
              margin-bottom: 20px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <header>
            <h1>${CONFIG.branding.organizationName}</h1>
            <p class="tagline">${CONFIG.branding.tagline}</p>
            <div class="admin-link">
              <!-- Use absolute public URL if provided; fall back to relative query param when unknown. Use top-level target to avoid iframe behavior -->
              <a href="${publicWebAppUrl ? publicWebAppUrl + '?admin=true' : '?admin=true'}" id="adminLink" target="_top" rel="noopener noreferrer">Admin</a>
            </div>
          </header>
          
          ${products.length > 0 ? `
            <!-- Filters -->
            <div class="filters">
              <div class="filters-row">
                <div class="filter-group">
                  <label for="categoryFilter">Filter by Category</label>
                  <select id="categoryFilter">
                    <option value="">All Categories</option>
                    ${categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                  </select>
                </div>
                <div class="filter-group">
                  <label for="searchInput">Search Products</label>
                  <input type="text" id="searchInput" placeholder="Search by name, description, or tag...">
                </div>
                <button class="clear-filters" onclick="clearFilters()">Clear Filters</button>
              </div>
            </div>
            
            <!-- Tag Cloud -->
            ${sortedTags.length > 0 ? `
              <div class="tag-cloud">
                <h3>Popular Tags</h3>
                <div class="tag-cloud-items">
                  ${sortedTags.map(tag => 
                    `<span class="tag-cloud-item" data-tag="${tag}" onclick="filterByTag('${tag}')">${tag} (${tagFrequency[tag]})</span>`
                  ).join('')}
                </div>
              </div>
            ` : ''}
            
            <div class="results-info" id="resultsInfo">
              Showing <span id="resultCount">${products.length}</span> of ${products.length} templates
            </div>
            
            <div class="products" id="productsGrid">
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
        
        <script>
                    // Detect base URL for public web app and redirect reliably to /exec or /dev
                    function detectBaseFromLocation() {
                      try {
                        const href = window.location.href;
                        const execIndex = href.indexOf('/exec');
                        const devIndex = href.indexOf('/dev');
                        const userCodeIndex = href.indexOf('/userCodeAppPanel');
                        // Prefer to redirect to the canonical /exec path to ensure query params are passed
                        if (userCodeIndex !== -1) return href.substring(0, userCodeIndex) + '/exec';
                        if (execIndex !== -1) return href.substring(0, execIndex) + '/exec';
                        if (devIndex !== -1) return href.substring(0, devIndex) + '/dev';
                        return (window.location.origin + window.location.pathname).replace(/\/$/, '');
                      } catch (e) {
                        return window.location.origin;
                      }
                    }

                    // Attach click handler to admin link to ensure it navigates to the public exec endpoint
                    document.addEventListener('DOMContentLoaded', function() {
                      const adminLink = document.getElementById('adminLink');
                      if (adminLink) {
                        // Set the href using server override when available
                        try {
                          if (google && google.script && google.script.run) {
                            google.script.run.withSuccessHandler(function(override) {
                              const base = override && override.length ? override : detectBaseFromLocation();
                              const href = base + (base.indexOf('?') === -1 ? '?admin=true' : '&admin=true');
                              adminLink.href = href;
                            }).getPublicWebAppUrl();
                          }
                        } catch (e) { /* ignore */ }

                        adminLink.addEventListener('click', function(e) {
                          e.preventDefault();
                          // Prefer to use the computed href if present
                          const targetHref = adminLink.href || (detectBaseFromLocation() + (detectBaseFromLocation().indexOf('?') === -1 ? '?admin=true' : '&admin=true'));
                          try {
                            // If running inside the Apps Script editor host, fetch admin HTML directly
                            if (google && google.script && google.script.host && google.script.host.origin && google.script.host.origin.indexOf('script.google.com') !== -1) {
                              google.script.run.withSuccessHandler(function(content) {
                                try {
                                  // Insert admin content into the body safely to avoid breaking the
                                  // Apps Script editor's wrapper which uses document.write internally.
                                  const rootId = '__admin_panel_root__';
                                  let root = document.getElementById(rootId);
                                  if (!root) {
                                    // Clear the body so the landing page markup is removed cleanly
                                    document.body.innerHTML = '';
                                    root = document.createElement('div');
                                    root.id = rootId;
                                    document.body.appendChild(root);
                                  }

                                  // Use a temporary container to parse out scripts so we can re-execute them
                                  const tmp = document.createElement('div');
                                  tmp.innerHTML = content || '';

                                  // Remove script tags from the HTML content we will set as innerHTML
                                  const scripts = Array.from(tmp.querySelectorAll('script'));
                                  scripts.forEach(s => s.parentNode && s.parentNode.removeChild(s));

                                  // Set the HTML body content
                                  root.innerHTML = tmp.innerHTML || '';

                                  // Re-insert and execute script tags from the original content
                                  scripts.forEach(s => {
                                    const script = document.createElement('script');
                                    if (s.src) {
                                      script.src = s.src;
                                      // Preserve type and async attributes
                                      if (s.type) script.type = s.type;
                                      if (s.async) script.async = true;
                                    } else {
                                      script.textContent = s.textContent;
                                    }
                                    document.body.appendChild(script);
                                  });
                                  // Call any initialization that normally runs on DOMContentLoaded
                                  try {
                                    if (typeof loadProducts === 'function') loadProducts();
                                    if (typeof loadGooglePicker === 'function') loadGooglePicker();
                                  } catch (err) { /* ignore */ }
                                } catch (err) {
                                  // Fall back to navigating to the public webapp URL when insertion fails
                                  window.location.href = targetHref;
                                }
                              }).getAdminPanelHtml();
                            } else {
                              window.location.href = targetHref;
                            }
                            console.log('Admin link clicked; navigation attempted to:', targetHref);
                          } catch (err) {
                            // Fallback navigate
                            try { window.location.href = targetHref; } catch (_) { try { window.top.location.href = targetHref; } catch (_) {} }
                          }
                        });
                      }
                    });
          // Filter functionality
          const categoryFilter = document.getElementById('categoryFilter');
          const searchInput = document.getElementById('searchInput');
          const productCards = document.querySelectorAll('.product-card');
          const resultCount = document.getElementById('resultCount');
          const totalProducts = productCards.length;
          
          function applyFilters() {
            const selectedCategory = categoryFilter ? categoryFilter.value : '';
            const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
            let visibleCount = 0;
            
            productCards.forEach(card => {
              const category = card.getAttribute('data-category');
              const tags = card.getAttribute('data-tags');
              const text = card.textContent.toLowerCase();
              
              const categoryMatch = !selectedCategory || category === selectedCategory;
              const searchMatch = !searchTerm || text.includes(searchTerm) || tags.toLowerCase().includes(searchTerm);
              
              if (categoryMatch && searchMatch) {
                card.classList.remove('hidden');
                visibleCount++;
              } else {
                card.classList.add('hidden');
              }
            });
            
            if (resultCount) {
              resultCount.textContent = visibleCount;
            }
          }
          
          function clearFilters() {
            if (categoryFilter) categoryFilter.value = '';
            if (searchInput) searchInput.value = '';
            document.querySelectorAll('.tag-cloud-item.active').forEach(item => {
              item.classList.remove('active');
            });
            applyFilters();
          }
          
          function filterByTag(tag) {
            const tagItems = document.querySelectorAll('.tag-cloud-item');
            tagItems.forEach(item => {
              // Use data attribute for more robust matching
              if (item.getAttribute('data-tag') === tag) {
                item.classList.toggle('active');
              }
            });
            
            if (searchInput) {
              searchInput.value = tag;
            }
            applyFilters();
          }
          
          // Event listeners
          if (categoryFilter) {
            categoryFilter.addEventListener('change', applyFilters);
          }
          if (searchInput) {
            searchInput.addEventListener('input', applyFilters);
          }
          // Update Admin link href using PUBLIC_WEBAPP_URL when available
          (function updateAdminLinkFromServer() {
            try {
              if (google && google.script && google.script.run) {
                google.script.run.withSuccessHandler(function(override) {
                  const adminLinkEl = document.getElementById('adminLink');
                  if (!adminLinkEl) return;
                  const base = override && override.length ? override : detectBaseFromLocation();
                  adminLinkEl.href = base + (base.indexOf('?') === -1 ? '?admin=true' : '&admin=true');
                }).getPublicWebAppUrl();
              }
            } catch (e) { /* ignore */ }
          })();
        </script>
      </body>
    </html>
  `;
  
  return HtmlService.createHtmlOutput(html)
    .setTitle(`${CONFIG.branding.organizationName} Templates`)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
