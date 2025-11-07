/**
 * ============================================================================
 * ANALYTICS MODULE
 * ============================================================================
 * 
 * Provides usage tracking and analytics for template distribution.
 * 
 * KEY FEATURES:
 * - Track product redirect counts
 * - Log version requests (latest vs specific versions)
 * - Store analytics in Script Properties for quick counters
 * - Optional detailed logging to Google Sheets
 * - Privacy-conscious (no PII collection)
 * - Non-blocking implementation (doesn't slow redirects)
 * 
 * PORTFOLIO NOTE:
 * This demonstrates building analytics systems that provide actionable insights
 * while respecting user privacy and maintaining system performance.
 * 
 * ============================================================================
 */


/**
 * ============================================================================
 * ANALYTICS TRACKING
 * ============================================================================
 */

/**
 * Helper function to determine version type from version parameter.
 * 
 * @param {string} version - Version parameter (null/undefined for latest, or specific version)
 * @returns {string} 'latest' or 'specific'
 */
function getVersionType(version) {
  return version ? 'specific' : 'latest';
}


/**
 * Tracks a product redirect event.
 * Non-blocking: Uses try-catch to ensure tracking failures don't break redirects.
 * 
 * @param {string} productName - Name of the product accessed
 * @param {string} version - Version requested ('latest' or specific version)
 * @param {string} fileName - Name of the file redirected to
 */
function trackProductAccess(productName, version, fileName) {
  try {
    // Increment product counter
    incrementProductCounter(productName);
    
    // Track version type
    trackVersionRequest(productName, version);
    
    // Log detailed event (optional - to separate analytics sheet)
    logAccessEvent(productName, version, fileName);
    
  } catch (err) {
    // Log error but don't throw - analytics should never break redirects
    Logger.log('Analytics tracking error (non-critical): ' + err.message);
  }
}


/**
 * Increments the access counter for a product.
 * Uses Script Properties for fast, persistent counters.
 * 
 * @param {string} productName - Name of the product
 */
function incrementProductCounter(productName) {
  const props = PropertiesService.getScriptProperties();
  const key = 'analytics_count_' + productName;
  
  const currentCount = parseInt(props.getProperty(key)) || 0;
  props.setProperty(key, (currentCount + 1).toString());
}


/**
 * Tracks version request type (latest vs specific version).
 * 
 * @param {string} productName - Name of the product
 * @param {string} version - Version requested ('latest' or specific version)
 */
function trackVersionRequest(productName, version) {
  const props = PropertiesService.getScriptProperties();
  const versionType = getVersionType(version);
  const key = 'analytics_version_' + versionType + '_' + productName;
  
  const currentCount = parseInt(props.getProperty(key)) || 0;
  props.setProperty(key, (currentCount + 1).toString());
}


/**
 * Logs a detailed access event to the analytics sheet.
 * Creates the sheet if it doesn't exist.
 * 
 * @param {string} productName - Name of the product
 * @param {string} version - Version requested
 * @param {string} fileName - Name of the file accessed
 */
function logAccessEvent(productName, version, fileName) {
  try {
    const analyticsSheetId = getAnalyticsSheetId();
    
    // If no analytics sheet configured, skip detailed logging
    if (!analyticsSheetId) {
      return;
    }
    
    const ss = SpreadsheetApp.openById(analyticsSheetId);
    let sheet = ss.getSheetByName('AccessLog');
    
    // Create sheet if it doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet('AccessLog');
      
      // Set up headers
      const headers = ['Timestamp', 'Product', 'VersionType', 'Version', 'FileName'];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length)
        .setFontWeight('bold')
        .setBackground('#4285f4')
        .setFontColor('#ffffff');
    }
    
    // Append log entry
    const timestamp = new Date();
    const versionType = getVersionType(version);
    const versionValue = version || 'latest';
    
    sheet.appendRow([timestamp, productName, versionType, versionValue, fileName]);
    
  } catch (err) {
    Logger.log('Failed to log access event: ' + err.message);
    // Don't throw - analytics logging is optional
  }
}


/**
 * ============================================================================
 * ANALYTICS RETRIEVAL
 * ============================================================================
 */

/**
 * Gets analytics summary for all products.
 * Returns product access counts, version request breakdowns, etc.
 * 
 * @returns {Object} Analytics summary object
 */
function getAnalyticsSummary() {
  try {
    const config = loadConfiguration();
    const products = config.products;
    const props = PropertiesService.getScriptProperties();
    
    const summary = {
      totalAccesses: 0,
      products: [],
      generatedAt: new Date().toISOString()
    };
    
    products.forEach(product => {
      const productName = product.name;
      
      // Get product counters
      const totalAccesses = parseInt(props.getProperty('analytics_count_' + productName)) || 0;
      const latestRequests = parseInt(props.getProperty('analytics_version_latest_' + productName)) || 0;
      const specificRequests = parseInt(props.getProperty('analytics_version_specific_' + productName)) || 0;
      
      summary.totalAccesses += totalAccesses;
      
      summary.products.push({
        name: productName,
        displayName: product.displayName,
        totalAccesses: totalAccesses,
        latestRequests: latestRequests,
        specificRequests: specificRequests,
        enabled: product.enabled
      });
    });
    
    // Sort by total accesses (descending)
    summary.products.sort((a, b) => b.totalAccesses - a.totalAccesses);
    
    return summary;
    
  } catch (err) {
    Logger.log('Error getting analytics summary: ' + err.message);
    return {
      error: err.message,
      totalAccesses: 0,
      products: []
    };
  }
}


/**
 * Gets detailed access logs from the analytics sheet.
 * 
 * @param {Object} options - Filter options (startDate, endDate, productName, limit)
 * @returns {Object} Access log data
 */
function getAccessLogs(options) {
  try {
    options = options || {};
    const limit = options.limit || 1000;
    
    const analyticsSheetId = getAnalyticsSheetId();
    
    if (!analyticsSheetId) {
      return {
        success: false,
        message: 'Analytics sheet not configured',
        logs: []
      };
    }
    
    const ss = SpreadsheetApp.openById(analyticsSheetId);
    const sheet = ss.getSheetByName('AccessLog');
    
    if (!sheet) {
      return {
        success: true,
        message: 'No access logs yet',
        logs: []
      };
    }
    
    const data = sheet.getDataRange().getValues();
    
    // Skip header row
    let logs = [];
    for (let i = 1; i < data.length && logs.length < limit; i++) {
      const row = data[i];
      
      // Apply filters
      if (options.productName && row[1] !== options.productName) {
        continue;
      }
      
      if (options.startDate && new Date(row[0]) < new Date(options.startDate)) {
        continue;
      }
      
      if (options.endDate && new Date(row[0]) > new Date(options.endDate)) {
        continue;
      }
      
      logs.push({
        timestamp: row[0],
        product: row[1],
        versionType: row[2],
        version: row[3],
        fileName: row[4]
      });
    }
    
    // Sort by timestamp (most recent first)
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return {
      success: true,
      logs: logs,
      total: logs.length
    };
    
  } catch (err) {
    Logger.log('Error getting access logs: ' + err.message);
    return {
      success: false,
      error: err.message,
      logs: []
    };
  }
}


/**
 * Gets analytics data for a specific date range.
 * 
 * @param {string} startDate - Start date (ISO format)
 * @param {string} endDate - End date (ISO format)
 * @returns {Object} Analytics data for date range
 */
function getAnalyticsByDateRange(startDate, endDate) {
  try {
    const logs = getAccessLogs({
      startDate: startDate,
      endDate: endDate
    });
    
    if (!logs.success) {
      return logs;
    }
    
    // Aggregate logs by product
    const productStats = {};
    
    logs.logs.forEach(log => {
      if (!productStats[log.product]) {
        productStats[log.product] = {
          name: log.product,
          totalAccesses: 0,
          latestRequests: 0,
          specificRequests: 0
        };
      }
      
      productStats[log.product].totalAccesses++;
      
      if (log.versionType === 'latest') {
        productStats[log.product].latestRequests++;
      } else {
        productStats[log.product].specificRequests++;
      }
    });
    
    return {
      success: true,
      startDate: startDate,
      endDate: endDate,
      totalAccesses: logs.logs.length,
      products: Object.values(productStats).sort((a, b) => b.totalAccesses - a.totalAccesses)
    };
    
  } catch (err) {
    Logger.log('Error getting analytics by date range: ' + err.message);
    return {
      success: false,
      error: err.message
    };
  }
}


/**
 * ============================================================================
 * ANALYTICS MANAGEMENT
 * ============================================================================
 */

/**
 * Creates or gets the analytics sheet for detailed logging.
 * 
 * @returns {Object} Result with sheet ID and URL
 */
function createAnalyticsSheet() {
  try {
    // Create new spreadsheet for analytics
    const ss = SpreadsheetApp.create('Template Distribution - Analytics');
    const sheet = ss.getSheetByName('Sheet1');
    sheet.setName('AccessLog');
    
    // Set up headers
    const headers = ['Timestamp', 'Product', 'VersionType', 'Version', 'FileName'];
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
    
    // Add Summary sheet
    const summarySheet = ss.insertSheet('Summary');
    summarySheet.getRange(1, 1).setValue('Analytics data is stored in the AccessLog sheet. Use the Admin Panel to view analytics.');
    summarySheet.getRange(1, 1).setFontWeight('bold');
    
    const sheetId = ss.getId();
    const sheetUrl = ss.getUrl();
    
    // Save to Script Properties
    const saveResult = setAnalyticsSheetId(sheetId);
    if (!saveResult.success) {
      Logger.log(`Warning: Failed to save analytics sheet ID: ${saveResult.error}`);
    }
    
    Logger.log(`Created analytics sheet ${sheetId}`);
    
    return {
      success: true,
      sheetId: sheetId,
      sheetUrl: sheetUrl,
      message: 'Analytics sheet created successfully'
    };
    
  } catch (err) {
    Logger.log('ERROR in createAnalyticsSheet: ' + err.message);
    return {
      success: false,
      error: err.message
    };
  }
}


/**
 * Resets all analytics counters (use with caution!).
 * 
 * @returns {Object} Result of operation
 */
function resetAnalyticsCounters() {
  try {
    const props = PropertiesService.getScriptProperties();
    const allProps = props.getProperties();
    
    let resetCount = 0;
    
    // Remove all analytics-related properties
    Object.keys(allProps).forEach(key => {
      if (key.startsWith('analytics_')) {
        props.deleteProperty(key);
        resetCount++;
      }
    });
    
    Logger.log(`Reset ${resetCount} analytics counters`);
    
    return {
      success: true,
      message: `Reset ${resetCount} analytics counters`,
      resetCount: resetCount
    };
    
  } catch (err) {
    Logger.log('ERROR in resetAnalyticsCounters: ' + err.message);
    return {
      success: false,
      error: err.message
    };
  }
}


/**
 * Exports analytics data to CSV format.
 * 
 * @param {Object} options - Export options (startDate, endDate, productName)
 * @returns {string} CSV data
 */
function exportAnalyticsToCSV(options) {
  try {
    options = options || {};
    
    const logs = getAccessLogs(options);
    
    if (!logs.success || logs.logs.length === 0) {
      return 'Timestamp,Product,VersionType,Version,FileName\n';
    }
    
    // Generate CSV
    let csv = 'Timestamp,Product,VersionType,Version,FileName\n';
    
    logs.logs.forEach(log => {
      const row = [
        log.timestamp,
        log.product,
        log.versionType,
        log.version,
        log.fileName
      ];
      
      // Escape commas and quotes
      const escapedRow = row.map(field => {
        const str = String(field);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      });
      
      csv += escapedRow.join(',') + '\n';
    });
    
    return csv;
    
  } catch (err) {
    Logger.log('ERROR in exportAnalyticsToCSV: ' + err.message);
    return 'Error exporting analytics: ' + err.message;
  }
}


/**
 * ============================================================================
 * CONFIGURATION HELPERS
 * ============================================================================
 */

/**
 * Gets the analytics sheet ID from Script Properties.
 * 
 * @returns {string} Analytics sheet ID or empty string
 */
function getAnalyticsSheetId() {
  const scriptProps = PropertiesService.getScriptProperties();
  return scriptProps.getProperty('ANALYTICS_SHEET_ID') || '';
}


/**
 * Sets the analytics sheet ID in Script Properties.
 * 
 * @param {string} sheetId - Analytics sheet ID
 * @returns {Object} Result object
 */
function setAnalyticsSheetId(sheetId) {
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
    scriptProps.setProperty('ANALYTICS_SHEET_ID', sheetId);
    
    Logger.log(`Analytics sheet ID updated to: ${sheetId}`);
    
    return {
      success: true,
      message: 'Analytics sheet ID updated successfully'
    };
    
  } catch (err) {
    Logger.log('ERROR in setAnalyticsSheetId: ' + err.message);
    return {
      success: false,
      error: err.message
    };
  }
}


/**
 * ============================================================================
 * DATA RETENTION POLICY
 * ============================================================================
 * 
 * POLICY:
 * - Script Properties counters: Persistent (manual reset only)
 * - Detailed logs in analytics sheet: Keep last 10,000 entries
 * - Automated cleanup can be implemented via time-based trigger
 * 
 * PRIVACY:
 * - No PII (Personally Identifiable Information) is collected
 * - No user email addresses, IP addresses, or session IDs
 * - Only track: product name, version type, timestamp, file name
 * - Data is used solely for system improvement and understanding usage patterns
 * 
 * ACCESS:
 * - Analytics data accessible only to system administrators
 * - Same authentication as admin panel
 */

/**
 * Cleans up old analytics log entries (keeps last 10,000 entries).
 * Can be run manually or via time-based trigger.
 * 
 * @returns {Object} Result of cleanup operation
 */
function cleanupAnalyticsLogs() {
  try {
    const analyticsSheetId = getAnalyticsSheetId();
    
    if (!analyticsSheetId) {
      return {
        success: false,
        message: 'Analytics sheet not configured'
      };
    }
    
    const ss = SpreadsheetApp.openById(analyticsSheetId);
    const sheet = ss.getSheetByName('AccessLog');
    
    if (!sheet) {
      return {
        success: true,
        message: 'No logs to clean up'
      };
    }
    
    const maxRows = 10000;
    const currentRows = sheet.getLastRow();
    
    if (currentRows <= maxRows + 1) { // +1 for header
      return {
        success: true,
        message: `No cleanup needed (${currentRows - 1} logs, limit is ${maxRows})`
      };
    }
    
    // Delete oldest rows
    const rowsToDelete = currentRows - maxRows - 1; // Keep header
    sheet.deleteRows(2, rowsToDelete); // Start at row 2 (after header)
    
    Logger.log(`Cleaned up ${rowsToDelete} old analytics log entries`);
    
    return {
      success: true,
      message: `Cleaned up ${rowsToDelete} old log entries`,
      deletedRows: rowsToDelete,
      remainingRows: maxRows
    };
    
  } catch (err) {
    Logger.log('ERROR in cleanupAnalyticsLogs: ' + err.message);
    return {
      success: false,
      error: err.message
    };
  }
}
