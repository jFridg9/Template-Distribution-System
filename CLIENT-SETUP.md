# Client Setup Guide

> **Step-by-step instructions for deploying and configuring the Template Distribution System for your organization.**

This guide is designed for non-technical users and IT staff who need to deploy the system without developer assistance.

---

## 📋 Prerequisites

Before you begin, ensure you have:

- ✅ A Google account with access to Google Drive and Apps Script
- ✅ Template files (Google Sheets) that you want to distribute
- ✅ Permissions to create Google Apps Script web apps in your organization
- ✅ 30-45 minutes for initial setup

---

## 🚀 Deployment Checklist

### ☐ Phase 1: Prepare Your Templates
### ☐ Phase 2: Set Up Configuration
### ☐ Phase 3: Deploy the Script
### ☐ Phase 4: Test Everything
### ☐ Phase 5: Share with Users

---

## Phase 1: Prepare Your Templates (10 minutes)

### Step 1.1: Organize Templates in Drive

Create a dedicated folder structure for your templates:

```
📁 Template Distribution (Main folder)
  ├── 📁 EventPlanning/
  │   ├── EventPlanner-v1.0
  │   ├── EventPlanner-v1.1
  │   └── EventPlanner-v1.2
  ├── 📁 MailMerge/
  │   ├── MailMerge-v1.0
  │   └── MailMerge-v2.0
  └── 📁 InvoiceTracker/
      └── InvoiceTracker-v1.0
```

**Important Rules:**
- One subfolder per product/template type
- Put all versions of the same template in the same subfolder
- Name files with version numbers (e.g., `TemplateName-v1.2`)
- The system will automatically find the most recent file

### Step 1.2: Set Sharing Permissions

For each subfolder:
1. Right-click the folder → **Share**
2. Set to "Anyone with the link can view" (or stricter as needed)
3. Click **Done**

### Step 1.3: Collect Folder IDs

For each subfolder, get its ID:
1. Open the folder in Google Drive
2. Look at the URL: `https://drive.google.com/drive/folders/[THIS_IS_THE_ID]`
3. Copy the ID (the long string after `folders/`)
4. Save it in a temporary note

**Example:**
```
EventPlanning folder ID: 1a2b3c4d5e6f7g8h9i0j
MailMerge folder ID: 9i8h7g6f5e4d3c2b1a0
```

---

## Phase 2: Set Up Configuration (10 minutes)

### Step 2.1: Create Apps Script Project

1. Go to [script.google.com](https://script.google.com)
2. Click **New project**
3. Rename it to "Template Distribution System"

### Step 2.2: Add the Code Files

**Add Code.gs:**
1. Delete the default `myFunction()` code
2. Copy the entire contents of `Code.gs` from this repository
3. Paste it into the editor

**Add Config.gs:**
1. Click the **+** next to **Files** → **Script**
2. Name it `Config`
3. Copy the entire contents of `Config.gs` from this repository
4. Paste it into the editor

**Save:**
- Click the disk icon or press `Ctrl+S` (Windows) / `Cmd+S` (Mac)

### Step 2.3: Generate Configuration Sheet

1. In the Apps Script editor, find the function dropdown (says "Select function")
2. Select `createConfigurationSheet`
3. Click **Run** (▶️ icon)
4. **First-time authorization:**
   - Click **Review permissions**
   - Select your Google account
   - Click **Advanced** → **Go to Template Distribution System (unsafe)**
   - Click **Allow**
5. Wait for execution to complete (check progress in **Execution log**)
6. Copy the **Spreadsheet ID** from the log

**The log will show:**
```
Configuration sheet created successfully!
Spreadsheet ID: 1a2b3c4d5e6f7g8h9i0j...
Copy this ID into CONFIG.configSheetId in Code.gs
```

### Step 2.4: Configure Your Products

1. Open the configuration sheet (use the URL from the log)
2. Go to the "Products" tab
3. Replace the example data with your real products:

| name          | folderId                | displayName         | enabled | description                    |
|---------------|-------------------------|---------------------|---------|--------------------------------|
| EventPlanning | 1a2b3c4d5e6f7g8h9i0j... | Event Planning Tool | TRUE    | Organize events effortlessly   |
| MailMerge     | 9i8h7g6f5e4d3c2b1a0...  | Mail Merge Pro      | TRUE    | Send personalized emails       |

**Tips:**
- Use the folder IDs you collected in Phase 1
- `name` should be short, no spaces (e.g., EventPlanning, MailMerge)
- `displayName` is what users will see on the landing page
- Set `enabled` to TRUE to make products visible
- `description` appears on the landing page

### Step 2.5: Update Script Configuration

Back in the Apps Script editor, in `Code.gs`:

1. Find the `CONFIG` object (near the top of the file)
2. Update these values:

```javascript
const CONFIG = {
  mode: 'simple',  // Use 'simple' for your deployment
  configSheetId: 'PASTE_YOUR_SHEET_ID_HERE',  // From step 2.3
  
  branding: {
    organizationName: 'Your Organization Name',
    tagline: 'Professional Templates',
    supportEmail: 'support@yourorg.com'
  }
};
```

3. **Save** (Ctrl+S / Cmd+S)

---

## Phase 3: Deploy the Script (5 minutes)

### Step 3.1: Deploy as Web App

1. In Apps Script editor, click **Deploy** → **New deployment**
2. Click the gear icon ⚙️ next to "Select type"
3. Choose **Web app**

**Configure deployment settings:**
- **Description:** `Initial deployment` (or current date)
- **Execute as:** `Me (your-email@domain.com)`
- **Who has access:** Choose one:
  - `Anyone` - Public access (anyone can use templates)
  - `Anyone with Google account` - Requires sign-in
  - `Anyone within [your domain]` - Internal only

4. Click **Deploy**
5. **Copy the Web App URL** (looks like `https://script.google.com/macros/s/.../exec`)

**Save this URL!** This is your permanent template distribution link.

### Step 3.2: Test the Deployment

Click the Web App URL you just copied.

**Expected results:**

**If mode = 'full':**
- You should see a landing page with your products listed
- Click a product to test the redirect

**If mode = 'simple':**
- You'll see a message asking you to specify a product
- Add `?product=EventPlanning` to the URL to test

---

## Phase 4: Test Everything (10 minutes)

### Step 4.1: Run Validation

In the Apps Script editor:
1. Select function: `validateConfiguration`
2. Click **Run** (▶️)
3. Check the **Execution log** for results

**Look for:**
- ✓ All products listed
- ✓ "Folder accessible" for each product
- ✓ File counts showing your templates

**If you see errors:**
- Check folder IDs in configuration sheet
- Verify folder sharing permissions
- Ensure folders contain Google Sheets files

### Step 4.2: Test Direct Links

Build test URLs for each product:

```
https://script.google.com/.../exec?product=EventPlanning
https://script.google.com/.../exec?product=MailMerge
```

**Expected behavior:**
1. Click the link
2. Browser redirects to Google Sheets
3. You see "Make a copy" dialog for the template
4. It's the latest version from your folder

### Step 4.3: Add a New Version (Growth Test)

1. In Drive, duplicate one of your templates
2. Rename it with a higher version number (e.g., `EventPlanner-v1.3`)
3. Wait 5 minutes (for cache to expire)
4. Test the product link again
5. Verify you're redirected to the new version

**To force immediate cache refresh:**
- In Apps Script: Run `clearConfigCache()`

---

## Phase 5: Share with Users (5 minutes)

### Step 5.1: Create User Documentation

Provide users with:

**For Landing Page Users (Full Mode):**
```
📋 Access Templates
Visit: [your-webapp-url]

Browse available templates and click to make a copy.
```

**For Direct Link Users (Simple Mode):**
```
📋 Quick Access Links

Event Planning Template:
https://script.google.com/.../exec?product=EventPlanning

Mail Merge Template:
https://script.google.com/.../exec?product=MailMerge

Click any link to make a copy of the latest version.
```

### Step 5.2: Update Your Documentation

Replace old template links in:
- ✅ Internal wikis/knowledge bases
- ✅ Training materials
- ✅ Email templates
- ✅ Onboarding documents
- ✅ Website resources pages

Use your permanent web app URLs instead of direct Google Sheets links.

---

## 🔄 Ongoing Management

### Adding New Products

1. Create a new folder in Google Drive
2. Add your template files to the folder
3. Get the folder ID
4. Add a new row in your configuration sheet
5. Wait 5 minutes (or run `clearConfigCache()`)

**No code changes or redeployment needed!**

### Disabling Products Temporarily

In the configuration sheet:
- Set `enabled` to `FALSE` for any product
- Change takes effect within 5 minutes
- Users will see "Product not available" message

### Updating Products

To release a new version:
1. Create the new version in Drive (e.g., `Template-v1.5`)
2. Place it in the appropriate product folder
3. Done! Users automatically get the latest version

**The system always serves the most recent file automatically.**

### Monitoring Usage

View usage logs in Apps Script:
1. Open your Apps Script project
2. Click **Executions** (left sidebar)
3. See recent redirects, products accessed, errors

---

## 🆘 Troubleshooting

### "Product not found" Error

**Causes:**
- Product name in URL doesn't match `name` column in config sheet
- Product is disabled (`enabled` = FALSE)
- Configuration sheet ID is wrong in Code.gs

**Fix:**
- Check spelling in both URL and config sheet
- Verify `enabled` is TRUE
- Run `validateConfiguration()` to diagnose

### "Cannot access folder" Error

**Causes:**
- Folder ID is incorrect
- Folder sharing permissions are too restrictive
- Folder was deleted or moved

**Fix:**
- Verify folder ID in config sheet
- Check folder still exists in Drive
- Set folder to "Anyone with link can view"

### "No templates found" Error

**Causes:**
- Folder is empty
- Folder contains files that aren't Google Sheets
- Files are in subfolders (system only checks top level)

**Fix:**
- Add Google Sheets files directly to the folder
- Don't use nested subfolders within product folders

### Changes Not Taking Effect

**Cause:**
- Configuration is cached for 5 minutes

**Fix:**
- Wait 5 minutes, or
- Run `clearConfigCache()` in Apps Script

### "Script not authorized" Error

**Cause:**
- First-time users haven't granted permissions

**Fix:**
- This is expected for first run
- Follow authorization prompts
- Click "Advanced" → "Go to... (unsafe)"
- This is safe—you're authorizing your own script

---

## 🔐 Security Best Practices

### Recommended Settings

**Public Templates:**
- Execute as: Me
- Access: Anyone

**Internal Templates:**
- Execute as: Me
- Access: Anyone within [domain]

### Keep Private

**DO NOT share publicly:**
- Configuration sheet (contains folder IDs)
- Apps Script project (contains code)
- Google Drive folder IDs

**OK to share publicly:**
- Web app /exec URLs
- Direct product URLs

### Access Control

Template folders should match your web app access level:
- Web app set to "Anyone" → Folders: "Anyone with link"
- Web app set to "Domain only" → Folders: "Anyone in domain"

---

## 📞 Getting Help

### Self-Service Options

1. **Run validation:** `validateConfiguration()`
2. **Check logs:** Apps Script → Executions
3. **Review troubleshooting** (above)

### Contact Developer

If you're stuck:
- Provide error messages from Execution log
- Share configuration sheet structure (not sensitive IDs)
- Describe what you're trying to do

---

## ✅ Setup Complete!

You now have a professional template distribution system that:
- ✅ Always serves the latest versions
- ✅ Requires zero maintenance for version updates
- ✅ Supports client self-management
- ✅ Provides permanent, shareable URLs

**Next Steps:**
- Share your web app URL with users
- Monitor usage in execution logs
- Expand product catalog as needed

**Remember:** You can manage products entirely through the configuration sheet—no need to touch code again!

---

*Need ongoing support? Contact your system administrator or the developer who set up this system.*
