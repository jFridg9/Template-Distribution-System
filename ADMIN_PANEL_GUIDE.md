# Admin Panel User Guide

> **Complete guide to managing your Template Distribution System without touching code**

---

## 🚀 Quick Access

**Admin Panel URL:**
```
https://your-webapp-url/exec?admin=true
```

Replace `your-webapp-url` with your actual Apps Script web app URL.

---

## 🎯 What Can You Do?

The admin panel provides a complete web-based interface for managing templates:

### ✅ Zero Manual Configuration
- **No copying IDs** - Use Drive Picker to visually select folders
- **No editing sheets** - Manage products through the UI
- **No code changes** - All configuration stored in Script Properties and sheets

### 📊 Product Management
- **Add** products with Drive Picker
- **Edit** product details (name, folder, description)
- **Enable/Disable** products with toggle
- **Delete** products when no longer needed
- **View** folder contents and file counts

### 🛠️ System Tools
- **Clear cache** to force configuration reload
- **Validate folders** to check accessibility
- **Navigate** to landing page to see user view

---

## 📖 Feature Guide

### First-Time Setup Wizard

**When:** Automatically appears if no configuration exists

**Steps:**
1. **Welcome** - Overview of features
2. **Create Config** - Click to create configuration sheet (auto-linked!)
3. **Add Product** - Add your first template with Drive Picker
4. **Complete** - Access admin panel

**Result:** System is fully configured without manual work

---

### Adding a Product

**Path:** Admin Panel → "Add New Product" button

**Form Fields:**

1. **Product Name*** (Internal ID)
   - Example: `EventPlanning`
   - Rules: Letters, numbers, hyphens, underscores only
   - Used in URLs: `?product=EventPlanning`

2. **Display Name***
   - Example: `Event Planning Tool`
   - Shown on landing page cards

3. **Google Drive Folder***
   - Click "Browse Drive" button
   - Select folder containing template files
   - System validates folder and shows file count
   - **No manual ID copying needed!**

4. **Description** (Optional)
   - Brief description for landing page
   - Example: `Organize events effortlessly`

5. **Enable this product** (Checkbox)
   - Checked: Product appears on landing page
   - Unchecked: Product hidden from users

**Save:** Click "Save Product"

---

### Editing a Product

**Path:** Admin Panel → Find product → Click "Edit" button

**What You Can Change:**
- ✅ Display Name
- ✅ Drive Folder (use Drive Picker)
- ✅ Description
- ✅ Enabled status
- ❌ Product Name (internal ID cannot be changed to maintain URL stability)

**Tip:** To rename a product, create a new one and delete the old one.

---

### Enabling/Disabling Products

**Quick Toggle:**
1. Find product in admin panel table
2. Click "Disable" or "Enable" button
3. Status badge updates immediately

**Use Cases:**
- **Disable:** Temporarily hide a product (e.g., during updates)
- **Enable:** Make product available again
- Products remain in configuration when disabled

**Landing Page Impact:**
- Enabled products: Show on landing page
- Disabled products: Hidden from users, only visible in admin panel

---

### Deleting a Product

**Path:** Admin Panel → Find product → Click trash icon 🗑️

**Confirmation:** System asks "Are you sure?"

**Warning:** This action:
- ❌ Removes product from configuration sheet
- ❌ Cannot be undone (manually re-add if needed)
- ✅ Does NOT delete your Drive files (they're safe!)

---

### Using Drive Picker

**Where:** Product add/edit forms → "Browse Drive" button

**How It Works:**
1. Click "Browse Drive"
2. Google Drive Picker modal opens
3. Navigate your Drive folders
4. Click folder to select
5. Picker closes
6. Folder ID auto-populates
7. System shows folder name and file count

**Benefits:**
- No copying folder IDs from URLs
- Visual folder selection
- Instant validation
- Shows file count for verification

**Troubleshooting:**
- "Drive Picker is loading..." → Wait a moment and try again
- Modal doesn't open → Check browser console for errors
- Wrong folder selected → Click "Browse Drive" again to reselect

---

### Folder Validation

**Automatic:** Runs when you select a folder via Drive Picker

**Shows:**
- ✅ Folder name
- 📊 Number of Google Sheets files
- ❌ Error if folder inaccessible

**Why It Matters:**
- Confirms correct folder selected
- Verifies you have access
- Shows if templates exist

**Example Output:**
```
✅ Event Planning Templates
📊 Contains 3 Google Sheets file(s)
```

---

### Clearing Cache

**Path:** Admin Panel → "Clear Cache" button

**When to Use:**
- After editing configuration sheet directly
- If products not updating on landing page
- After bulk changes to products

**What It Does:**
- Forces system to reload configuration
- Updates appear immediately
- Otherwise, cache expires after 5 minutes

---

### Viewing Landing Page

**Path:** Admin Panel → "View Landing Page" button

**Purpose:** See how users see your products

**Shows:**
- Product cards with names, descriptions
- "Get Latest Version" buttons
- Live view of enabled products only

---

## 🔒 Security & Access

### Who Can Access Admin Panel?

**Production Mode:**
- Only the deployer (person who deployed the web app)
- Other users see "Access denied"

**Development Mode:**
- May allow any logged-in user (for testing)

### Why Restrict Access?

- Prevents unauthorized product changes
- Maintains system integrity
- Protects configuration data

### Changing Deployer

If you need to transfer admin access:
1. Redeploy web app as different user in Apps Script editor
2. New deployer becomes admin
3. Previous deployer loses access

---

## 💡 Tips & Best Practices

### Organizing Products

**Naming Convention:**
- Product Name: `EventPlanning`, `MailMerge` (CamelCase, no spaces)
- Display Name: `Event Planning Tool`, `Mail Merge Pro` (user-friendly)

**Descriptions:**
- Keep brief (1-2 sentences)
- Focus on benefits
- Example: "Organize events effortlessly with this comprehensive planner"

### Folder Structure

**Recommended:**
```
📁 Your Drive
  └─ 📁 Template Distribution
       ├─ 📁 Event Planning Templates
       │    ├─ EventPlanner-v1.0
       │    ├─ EventPlanner-v1.1
       │    └─ EventPlanner-v1.2
       └─ 📁 Mail Merge Templates
            ├─ MailMerge-v1.0
            └─ MailMerge-v2.0
```

**Benefits:**
- Organized by product
- Easy to manage versions
- Clear folder names for Drive Picker

### Version Management

**System Behavior:**
- Always serves most recently created file
- No need to update links when adding new versions
- Just add new file to folder

**Best Practice:**
- Name files with version numbers: `Template-v1.5`
- Keep old versions for reference
- Delete very old versions to declutter

### Testing Changes

**Before Enabling:**
1. Add product as disabled
2. Test the product URL: `?product=YourProduct`
3. Verify redirect works
4. Enable when ready

### Backup Strategy

**Configuration Sheet:**
- Lives in your Google Drive
- Backed up by Google automatically
- Download copy for extra safety: File → Download → CSV

**Templates:**
- Store in Google Drive (auto-backed up)
- Consider duplicating critical templates
- Version history available per file

---

## 🐛 Troubleshooting

### "Cannot access the specified folder"

**Causes:**
- Folder doesn't exist
- No permission to access folder
- Incorrect folder ID

**Solutions:**
1. Use Drive Picker (prevents ID errors)
2. Verify folder exists in Drive
3. Check folder sharing settings
4. Try accessing folder manually first

### "Product not found or not available"

**Causes:**
- Product disabled
- Product doesn't exist
- Configuration cache stale

**Solutions:**
1. Check product enabled in admin panel
2. Clear cache
3. Verify product name matches URL parameter

### "Configuration error"

**Causes:**
- Config sheet deleted or inaccessible
- Script Properties cleared
- Invalid sheet structure

**Solutions:**
1. Visit `?admin=true` to trigger setup wizard
2. Run `validateConfiguration()` in Apps Script editor
3. Check config sheet exists and is accessible

### Changes not appearing on landing page

**Cause:** Configuration cached (5-minute expiry)

**Solutions:**
1. Click "Clear Cache" in admin panel
2. Wait 5 minutes for auto-expiry
3. Hard refresh browser (Ctrl+F5)

### Drive Picker not working

**Causes:**
- OAuth token not loaded yet
- Browser blocking pop-ups
- Network issues

**Solutions:**
1. Wait 5 seconds and try again
2. Check browser pop-up blocker
3. Refresh page and retry
4. Check browser console for errors

---

## 📊 Monitoring & Maintenance

### Regular Tasks

**Weekly:**
- Review enabled products
- Check for disabled products to re-enable
- Add new versions of templates to folders

**Monthly:**
- Review folder permissions
- Clean up old template versions
- Check landing page displays correctly

**As Needed:**
- Add new products
- Update descriptions
- Clear cache after bulk changes

### Validation

**Run in Apps Script Editor:**
```javascript
validateConfiguration()
```

**Shows:**
- Total products
- Enabled/disabled counts
- Folder accessibility
- File counts per product

**Use When:**
- After major changes
- Troubleshooting issues
- Verifying setup

---

## 🎓 Advanced Features

### Script Properties (Background)

**What:** Runtime configuration storage

**Benefit:** Configuration persists without code changes

**Access (for debugging):**
```javascript
// Run in Apps Script editor
getRuntimeConfig()
```

### Manual Configuration Override

**When:** Advanced users who want code-based config

**How:** Set `CONFIG.configSheetId` in Code.gs

**Note:** Script Properties take precedence if set

---

## 📞 Support

### For Administrators

**Configuration Issues:**
1. Check this guide
2. Review TESTING_GUIDE.md
3. Run `validateConfiguration()` in Apps Script
4. Check execution logs in Apps Script

**Technical Issues:**
- Review ARCHITECTURE.md for system design
- Check GitHub repository for updates
- Contact system deployer

### For End Users

Direct users to:
- Landing page for template browsing
- Product-specific URLs for direct access
- Support email in system branding

---

**Ready to manage your templates like a pro!** 🚀

Visit your admin panel and start adding products - no code changes needed.
