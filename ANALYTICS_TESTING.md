# Analytics Testing Guide

This guide provides step-by-step instructions for testing the analytics implementation.

---

## Pre-Testing Checklist

Before testing analytics, ensure:
- [ ] Apps Script project is deployed as web app
- [ ] Admin panel is accessible (`?admin=true`)
- [ ] At least one product is configured
- [ ] Product has accessible Drive folder with template files

---

## Test 1: Basic Analytics Tracking

**Objective:** Verify that analytics tracking captures product accesses

**Steps:**

1. **Access a product via redirect:**
   ```
   https://your-webapp-url/exec?product=YourProduct
   ```

2. **Open Apps Script Editor** and check execution logs:
   - Go to: Apps Script → Executions (left sidebar)
   - Look for log entry: "Redirecting to: [Product Name]"
   - Verify no analytics errors logged

3. **Check Script Properties:**
   ```javascript
   // Run in Apps Script editor
   function testScriptProperties() {
     const props = PropertiesService.getScriptProperties();
     const allProps = props.getProperties();
     
     // Filter analytics properties
     Object.keys(allProps).forEach(key => {
       if (key.startsWith('analytics_')) {
         Logger.log(`${key}: ${allProps[key]}`);
       }
     });
   }
   ```

4. **Expected Result:**
   - Properties like `analytics_count_YourProduct` should exist
   - Counter values should be > 0
   - Properties like `analytics_version_latest_YourProduct` should exist

**Pass Criteria:**
✅ Product redirect works (no errors)
✅ Analytics counters created in Script Properties
✅ Counter values increment with each access

---

## Test 2: Analytics Dashboard Display

**Objective:** Verify admin panel displays analytics correctly

**Steps:**

1. **Open Admin Panel:**
   ```
   https://your-webapp-url/exec?admin=true
   ```

2. **Switch to Analytics Tab:**
   - Click "📊 Analytics" tab
   - Dashboard should load automatically

3. **Verify Summary Cards:**
   - Check "Total Products" count
   - Check "Total Accesses" count (should match test accesses)
   - Check "Active Products" count
   - Check "Last Updated" timestamp

4. **Verify Product Statistics Table:**
   - Product names displayed
   - Total accesses shown
   - Latest/Specific version breakdowns visible
   - Progress bars render correctly

**Pass Criteria:**
✅ Analytics tab loads without errors
✅ Summary cards show correct data
✅ Product table displays all products
✅ Numbers match expected values

---

## Test 3: Version Type Tracking

**Objective:** Verify differentiation between latest and specific version requests

**Steps:**

1. **Access product without version (latest):**
   ```
   https://your-webapp-url/exec?product=YourProduct
   ```

2. **Access product with specific version:**
   ```
   https://your-webapp-url/exec?product=YourProduct&version=1.5
   ```
   Note: Version must exist in your folder

3. **Check Analytics Dashboard:**
   - Refresh analytics
   - Verify "Latest Version" counter increased
   - Verify "Specific Version" counter increased

4. **Check Script Properties:**
   ```javascript
   function testVersionTracking() {
     const props = PropertiesService.getScriptProperties();
     const latest = props.getProperty('analytics_version_latest_YourProduct');
     const specific = props.getProperty('analytics_version_specific_YourProduct');
     
     Logger.log(`Latest requests: ${latest}`);
     Logger.log(`Specific requests: ${specific}`);
   }
   ```

**Pass Criteria:**
✅ Latest version requests tracked separately
✅ Specific version requests tracked separately
✅ Dashboard shows correct breakdown

---

## Test 4: Analytics Sheet Setup

**Objective:** Verify optional detailed logging sheet creation

**Steps:**

1. **Open Admin Panel → Analytics Tab**

2. **Click "📊 Setup Analytics Sheet"**
   - Confirm creation in dialog

3. **Wait for Success Message:**
   - Should show: "Analytics sheet created successfully! You can view it at: [URL]"

4. **Open Analytics Sheet:**
   - Click the URL in success message
   - Verify sheet structure:
     - Sheet name: "AccessLog"
     - Headers: Timestamp, Product, VersionType, Version, FileName
     - Blue header row with white text

5. **Generate Some Accesses:**
   - Access products several times
   - Refresh analytics sheet
   - New rows should appear in AccessLog

**Pass Criteria:**
✅ Analytics sheet created without errors
✅ Sheet has correct structure
✅ Headers properly formatted
✅ Logs appear after product accesses

---

## Test 5: CSV Export

**Objective:** Verify analytics data can be exported

**Steps:**

1. **Open Admin Panel → Analytics Tab**

2. **Click "📥 Export to CSV"**

3. **Verify Download:**
   - File should download automatically
   - Filename format: `analytics-YYYY-MM-DD.csv`
   - Check browser downloads folder

4. **Open CSV File:**
   - Open in Excel, Google Sheets, or text editor
   - Verify structure:
     ```csv
     Timestamp,Product,VersionType,Version,FileName
     2024-01-15 10:30:45,YourProduct,latest,latest,Template-v1.0
     ```

5. **Verify Data:**
   - All accessed products listed
   - Timestamps present
   - Version types correct
   - File names accurate

**Pass Criteria:**
✅ CSV file downloads
✅ File has correct structure
✅ Data matches analytics dashboard
✅ No encoding issues

---

## Test 6: Analytics Refresh

**Objective:** Verify analytics can be refreshed on demand

**Steps:**

1. **Access several products** (outside admin panel)

2. **In Admin Panel → Analytics Tab:**
   - Note current total accesses count

3. **Click "🔄 Refresh Analytics"**

4. **Verify Update:**
   - Summary cards should update
   - New accesses should appear
   - Product table should refresh

**Pass Criteria:**
✅ Refresh button works
✅ Data updates correctly
✅ No errors in console
✅ Success message shown

---

## Test 7: Non-Blocking Behavior

**Objective:** Verify analytics errors don't break redirects

**Steps:**

1. **Simulate Analytics Error:**
   ```javascript
   // Temporarily break analytics by restricting Script Properties
   // In Analytics.gs, add at start of trackProductAccess():
   // throw new Error('Simulated analytics error');
   ```

2. **Access Product:**
   ```
   https://your-webapp-url/exec?product=YourProduct
   ```

3. **Verify Redirect Still Works:**
   - User should still be redirected to template
   - Template should open in Google Sheets
   - No user-facing error

4. **Check Logs:**
   - Apps Script execution logs should show:
     "Analytics tracking error (non-critical): Simulated analytics error"
   - Redirect should have completed successfully

5. **Remove Simulation:**
   - Remove the simulated error
   - Redeploy

**Pass Criteria:**
✅ Redirects work even when analytics fails
✅ Error logged but not thrown to user
✅ User experience unaffected

---

## Test 8: Privacy Compliance

**Objective:** Verify no PII is collected

**Steps:**

1. **Review Analytics Sheet (if created):**
   - Open AccessLog sheet
   - Check all columns

2. **Verify No PII:**
   - ❌ No email addresses
   - ❌ No IP addresses
   - ❌ No session IDs
   - ❌ No user identifiers
   - ✅ Only: timestamp, product, version type, version, filename

3. **Review Script Properties:**
   ```javascript
   function reviewScriptProperties() {
     const props = PropertiesService.getScriptProperties();
     const allProps = props.getProperties();
     
     Object.keys(allProps).forEach(key => {
       if (key.startsWith('analytics_')) {
         Logger.log(`${key}: ${allProps[key]}`);
       }
     });
   }
   ```

4. **Verify Anonymous Data:**
   - Only counters stored
   - No user-specific information

**Pass Criteria:**
✅ No PII in analytics sheet
✅ No PII in Script Properties
✅ All data is anonymous
✅ Complies with privacy policy

---

## Test 9: Tab Navigation

**Objective:** Verify admin panel tab switching works correctly

**Steps:**

1. **Open Admin Panel** (`?admin=true`)

2. **Default View:**
   - Should start on "📦 Products" tab
   - Products tab highlighted
   - Products content visible

3. **Switch to Analytics:**
   - Click "📊 Analytics" tab
   - Tab should highlight
   - Analytics content should display
   - Products content should hide

4. **Switch Back to Products:**
   - Click "📦 Products" tab
   - Tab should highlight
   - Products content should display
   - Analytics content should hide

5. **Auto-Load Behavior:**
   - Analytics should auto-load when tab opened
   - Success message should appear
   - Data should populate

**Pass Criteria:**
✅ Tab switching works smoothly
✅ Only one tab active at a time
✅ Content shows/hides correctly
✅ No JavaScript errors

---

## Test 10: Edge Cases

**Objective:** Test unusual scenarios

**Test Cases:**

### 10.1: No Analytics Data Yet
1. Reset all analytics: `resetAnalyticsCounters()`
2. View analytics dashboard
3. Should show:
   - Total accesses: 0
   - Empty state message: "No analytics data available yet"

### 10.2: Disabled Products
1. Disable a product in admin panel
2. Access the disabled product (should fail)
3. Check analytics - disabled product attempts should not be tracked

### 10.3: Invalid Product
1. Access non-existent product: `?product=NonExistent`
2. Should show error
3. Check analytics - invalid requests should not be tracked

### 10.4: Multiple Rapid Accesses
1. Access same product 10 times in quick succession
2. Check analytics counters
3. Should increment correctly 10 times

### 10.5: No Analytics Sheet
1. Don't create analytics sheet
2. Access products
3. Counters should still work (Script Properties)
4. Export should show "No analytics sheet configured"

**Pass Criteria:**
✅ All edge cases handle gracefully
✅ No crashes or errors
✅ Appropriate messages shown

---

## Validation Functions

Run these from Apps Script Editor to validate setup:

### Check Analytics Counters
```javascript
function checkAnalyticsCounters() {
  const props = PropertiesService.getScriptProperties();
  const allProps = props.getProperties();
  
  Logger.log('=== Analytics Counters ===');
  let found = false;
  
  Object.keys(allProps).forEach(key => {
    if (key.startsWith('analytics_')) {
      Logger.log(`${key}: ${allProps[key]}`);
      found = true;
    }
  });
  
  if (!found) {
    Logger.log('No analytics counters found. Access some products first.');
  }
}
```

### Validate Analytics Summary
```javascript
function validateAnalyticsSummary() {
  const summary = getAnalyticsSummary();
  Logger.log(JSON.stringify(summary, null, 2));
}
```

### Check Analytics Sheet
```javascript
function checkAnalyticsSheet() {
  const sheetId = getAnalyticsSheetId();
  
  if (!sheetId) {
    Logger.log('Analytics sheet not configured');
    return;
  }
  
  try {
    const ss = SpreadsheetApp.openById(sheetId);
    const sheet = ss.getSheetByName('AccessLog');
    
    if (!sheet) {
      Logger.log('AccessLog sheet not found');
      return;
    }
    
    const lastRow = sheet.getLastRow();
    Logger.log(`AccessLog has ${lastRow - 1} entries (excluding header)`);
    
    if (lastRow > 1) {
      const lastEntry = sheet.getRange(lastRow, 1, 1, 5).getValues()[0];
      Logger.log('Most recent entry:');
      Logger.log(`  Timestamp: ${lastEntry[0]}`);
      Logger.log(`  Product: ${lastEntry[1]}`);
      Logger.log(`  Version Type: ${lastEntry[2]}`);
    }
  } catch (err) {
    Logger.log('Error accessing analytics sheet: ' + err.message);
  }
}
```

---

## Troubleshooting

### Issue: No analytics data appearing

**Possible Causes:**
1. No products have been accessed yet
2. Script Properties not accessible
3. Analytics tracking function not called

**Solutions:**
- Access a product: `?product=YourProduct`
- Check execution logs for errors
- Run `checkAnalyticsCounters()` to verify

### Issue: CSV export fails

**Possible Causes:**
1. No analytics sheet configured
2. Analytics sheet deleted
3. No access logs yet
4. Browser pop-up blocker

**Solutions:**
- Setup analytics sheet via admin panel
- Verify sheet exists in Google Drive
- Allow pop-ups for script.google.com
- Access products to generate logs

### Issue: Dashboard not loading

**Possible Causes:**
1. JavaScript errors
2. Missing admin functions
3. Server-side errors

**Solutions:**
- Check browser console (F12)
- Check Apps Script execution logs
- Verify all Analytics.gs functions deployed
- Refresh page and try again

---

## Success Criteria Summary

✅ **Core Functionality:**
- Product accesses tracked in Script Properties
- Counters increment correctly
- Non-blocking (errors don't break redirects)

✅ **Admin Dashboard:**
- Analytics tab loads and displays data
- Summary cards show correct metrics
- Product table renders with progress bars
- Refresh button updates data

✅ **Optional Features:**
- Analytics sheet creation works
- Detailed logs appear in sheet
- CSV export downloads correctly

✅ **Privacy:**
- No PII collected
- Anonymous usage data only
- Complies with documented policy

✅ **Robustness:**
- Handles edge cases gracefully
- Error handling prevents failures
- Validation functions work correctly

---

## Post-Testing

After completing all tests:

1. **Document any issues found**
2. **Verify fixes if issues occurred**
3. **Clean up test data** (optional):
   ```javascript
   resetAnalyticsCounters()
   ```
4. **Enable for production use**
5. **Monitor analytics regularly**

---

**Testing Complete!** 

The analytics system is now ready for production use. Monitor the analytics dashboard regularly to gain insights into template usage.
