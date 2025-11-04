# Testing Guide - Admin Panel & Setup Wizard

This guide helps you verify that the admin panel with Drive picker and setup wizard are working correctly.

## Prerequisites

- Apps Script project deployed as web app
- Web app URL (e.g., `https://script.google.com/.../exec`)
- At least one Google Drive folder with Google Sheets templates

---

## Test 1: Setup Wizard Flow (First-Time Users)

### Scenario
Testing the automated first-time setup experience.

### Steps

1. **Ensure Clean State**:
   - Option A: Use a fresh deployment
   - Option B: Clear Script Properties:
     ```javascript
     // Run this in Apps Script editor
     PropertiesService.getScriptProperties().deleteAllProperties();
     ```

2. **Access Admin Panel**:
   - Visit: `https://your-webapp/exec?admin=true`
   - Expected: Setup wizard should appear automatically

3. **Step 1 - Welcome**:
   - Verify welcome screen shows
   - Check that automation features are mentioned
   - Click "Next"

4. **Step 2 - Create Configuration Sheet**:
   - Click "Create Configuration Sheet"
   - Expected: Sheet is created, success message shows
   - Expected: Message confirms "Configuration automatically saved"
   - Verify: Sheet ID is displayed
   - Click link to open sheet in new tab (verify it exists)
   - Click "Next"

5. **Step 3 - Add First Product**:
   - Fill in Product Name (e.g., "EventPlanning")
   - Fill in Display Name (e.g., "Event Planning Tool")
   - Click "Browse Drive" button
   - Expected: Google Drive Picker opens
   - Select a folder containing Google Sheets
   - Expected: Folder name and file count appear
   - Fill in Description (optional)
   - Leave "Enable" checked
   - Click "Add Product"
   - Expected: Success message, moves to Step 4

6. **Step 4 - Complete**:
   - Verify success screen shows
   - Click "Go to Admin Panel"
   - Expected: Redirects to admin panel with your product listed

### Verification

✅ Configuration sheet created  
✅ Sheet ID saved to Script Properties (no manual code changes needed)  
✅ Drive Picker worked without manual ID entry  
✅ Product added successfully  
✅ Admin panel shows product  

---

## Test 2: Admin Panel - Product Management

### Scenario
Testing CRUD operations through the admin panel UI.

### Prerequisites
- Complete Test 1 first (setup wizard)

### Add Product

1. Visit: `https://your-webapp/exec?admin=true`
2. Click "Add New Product"
3. Fill form:
   - Product Name: "MailMerge"
   - Display Name: "Mail Merge Pro"
   - Click "Browse Drive", select folder
   - Description: "Send personalized emails"
   - Enable: Checked
4. Click "Save Product"
5. Expected: Success alert, product appears in table

### Edit Product

1. Find product in table
2. Click "Edit" button
3. Change Display Name to "Mail Merge Professional"
4. Click "Save Product"
5. Expected: Success alert, name updated in table

### Disable/Enable Product

1. Find product in table
2. Click "Disable" button
3. Expected: Status changes to "Disabled" badge
4. Click "Enable" button
5. Expected: Status changes to "Enabled" badge

### Delete Product

1. Find product in table
2. Click trash icon button
3. Confirm deletion in dialog
4. Expected: Product removed from table

### Verification

✅ Add product works with Drive Picker  
✅ Edit product updates correctly  
✅ Toggle enable/disable works  
✅ Delete removes product  
✅ Configuration sheet updated correctly  

---

## Test 3: Drive Picker Functionality

### Scenario
Verify Drive Picker integration works properly.

### Steps

1. Access admin panel
2. Click "Add New Product"
3. Click "Browse Drive" button
4. Expected: Drive Picker modal opens
5. Try these actions:
   - Navigate folders
   - Search for folders
   - Select different folders
6. Select a folder
7. Expected:
   - Folder ID appears in input field
   - Folder info shows: "✅ FolderName | 📊 Contains X Google Sheets file(s)"

### Verification

✅ Drive Picker loads correctly  
✅ Folder selection works  
✅ Folder ID auto-populates  
✅ Folder validation shows file count  

---

## Test 4: Landing Page Integration

### Scenario
Verify products appear on landing page after setup.

### Steps

1. Complete Test 1 (add at least one enabled product)
2. Visit: `https://your-webapp/exec` (no parameters)
3. Expected: Landing page shows
4. Verify: Product card appears with:
   - Display name
   - Description
   - "Get Latest Version" button
5. Click "Get Latest Version"
6. Expected: Redirects to Google Sheets copy dialog

### Verification

✅ Landing page renders  
✅ Products from config sheet appear  
✅ Product cards show correct info  
✅ Redirect to template works  

---

## Test 5: Runtime Configuration

### Scenario
Verify Script Properties override hardcoded CONFIG.

### Steps

1. **Check Current Config**:
   ```javascript
   // Run in Apps Script editor
   Logger.log(getConfigSheetId());
   Logger.log(getRuntimeConfig());
   ```
   - Expected: Shows config sheet ID from Script Properties

2. **Test Priority**:
   - In Code.gs, change `CONFIG.configSheetId` to invalid value
   - Deploy
   - Visit admin panel
   - Expected: Still works (uses Script Properties, not hardcoded value)

3. **Restore**:
   - Change CONFIG.configSheetId back to valid value or placeholder

### Verification

✅ getConfigSheetId() returns Script Properties value  
✅ Script Properties take precedence over CONFIG  
✅ System works even with invalid hardcoded CONFIG  

---

## Test 6: Error Handling

### Scenario
Verify graceful error handling.

### Test Cases

**Invalid Folder ID:**
1. Try to add product with fake folder ID: "invalid123"
2. Expected: Error message "Cannot access the specified folder"

**Duplicate Product Name:**
1. Try to add product with existing name
2. Expected: Error message "A product with this name already exists"

**Missing Required Fields:**
1. Try to save product without Product Name
2. Expected: HTML5 validation error

**Inaccessible Config Sheet:**
1. In Script Properties, set invalid sheet ID
2. Visit admin panel
3. Expected: Setup wizard appears (detects config error)

### Verification

✅ Invalid folder ID rejected  
✅ Duplicate names prevented  
✅ Required fields validated  
✅ Inaccessible config triggers setup wizard  

---

## Test 7: Cache Management

### Scenario
Verify cache clearing works.

### Steps

1. Add a product via admin panel
2. Manually edit the configuration sheet (change display name)
3. Visit landing page
4. Expected: Old name shows (cached)
5. Return to admin panel, click "Clear Cache"
6. Visit landing page again
7. Expected: New name shows

### Alternative
- Wait 5 minutes for cache to expire naturally

### Verification

✅ Cache stores configuration  
✅ Clear cache forces reload  
✅ Updates appear after cache clear  

---

## Test 8: Authentication (Production)

### Scenario
Verify admin panel is restricted to deployer.

### Steps

1. Visit admin panel as deployer
2. Expected: Access granted
3. Share admin panel URL with another user
4. Expected: They see "Access denied" message

**Note:** In development (CONFIG.mode = 'full'), authentication may be relaxed.

### Verification

✅ Deployer can access admin panel  
✅ Non-deployers see access denied  

---

## Common Issues & Solutions

### Drive Picker doesn't load
- **Cause:** OAuth token not available
- **Solution:** Wait a few seconds and try again. Check browser console for errors.

### "Configuration error" when accessing products
- **Cause:** Config sheet or folder not accessible
- **Solution:** Verify folder permissions, run `validateConfiguration()` in Apps Script

### Products not appearing on landing page
- **Cause:** Cache not cleared after adding products
- **Solution:** Click "Clear Cache" in admin panel or wait 5 minutes

### Setup wizard doesn't detect existing config
- **Cause:** Script Properties and CONFIG both empty
- **Solution:** Run setup wizard to create new config, or manually set CONFIG.configSheetId

---

## Success Criteria

All tests should pass with these results:

- ✅ Setup wizard creates and links configuration automatically
- ✅ Drive Picker eliminates manual ID copying
- ✅ Admin panel CRUD operations work correctly
- ✅ Landing page displays configured products
- ✅ Script Properties override hardcoded CONFIG
- ✅ Error handling is graceful and informative
- ✅ Cache management works as expected
- ✅ Authentication restricts access appropriately

---

## Automated Testing (Future Enhancement)

Currently, testing is manual due to Google Apps Script limitations. Potential improvements:

1. **Unit Tests:** Use Apps Script testing frameworks (e.g., GasT)
2. **Integration Tests:** Automated browser testing (Selenium, Playwright)
3. **CI/CD Tests:** Run validation checks on deployment

For now, manual testing via this guide ensures all features work correctly.
