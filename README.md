# Template Distribution System

> **A smart, version-aware template distribution system that automatically redirects users to the latest version of Google Sheets templates.**

**Perfect for organizations that need to distribute versioned templates without manually updating links.**

---

## 🎯 What This Solves

### The Problem
You maintain multiple Google Sheets templates (Event Planning, Mail Merge, etc.) and release new versions regularly. Every time you release a new version, you have to:
- Update documentation with new links
- Notify users of the new version
- Manually manage which version users should use
- Risk users accidentally using outdated templates

### The Solution
This system provides **one permanent URL** that always points to the latest version of each template. When you release a new version, users automatically get the latest one—no link updates needed.

---

## ✨ Key Features

### 🚀 **Always Current**
- Users always get the latest version automatically
- No link updates needed when you release new versions
- Smart version detection based on file creation date

### 📦 **Multi-Product Support**
- Distribute multiple template types from one system
- Each product (e.g., Event Planning, Mail Merge) gets its own folder
- Professional landing page for users to browse available templates

### 🎛️ **Client Self-Management**
- Configuration stored in Google Sheets
- Non-technical users can add/remove products
- No code changes needed for configuration updates
- Instant updates (with 5-minute cache)

### 🛠️ **Admin Panel** ⭐ NEW - Fully Automated Setup
- **🚀 Zero Manual Configuration** - Setup wizard handles everything automatically
- **📁 Visual Drive Picker** - Select folders without copy/pasting IDs
- **⚡ Instant Configuration** - Sheet created and linked automatically via Script Properties
- **🎨 Product Management** - Add, edit, delete, enable/disable products via UI
- **✅ Folder Validation** - Automatic checking of Drive folders and file counts
- **🚫 No Code Editing** - All configuration through web interface (no sheet editing, no ID copying)
- **📥📤 CSV Import/Export** - Bulk manage products with CSV files
- **⚡ Bulk Operations** - Enable, disable, or delete multiple products at once
- **🔄 Import Preview** - Review changes before applying CSV imports
- **📋 CSV Template** - Download sample CSV to get started quickly

**What you DON'T need to do:**
- ❌ Copy sheet IDs into code
- ❌ Copy folder IDs from URLs
- ❌ Edit configuration sheets manually
- ❌ Understand Apps Script
- ❌ Make any code changes
- ❌ Manage products one at a time

**What you DO:** Visit `?admin=true` → Click buttons → Select folders → Done! (5 minutes)

**Bulk Operations:**
- ✅ Export all products to CSV for backup or documentation
- ✅ Import products from CSV file with validation
- ✅ Bulk enable/disable products with selection checkboxes
- ✅ Bulk delete products with confirmation
- ✅ Preview import changes before applying

### 🔧 **Dual Deployment Modes**

**Full Mode** (Portfolio / Power Users):
- Beautiful landing page with product cards
- Version selection support (`?version=1.5`)
- Professional branding and UI
- Product browsing and discovery

**Simple Mode** (Client Deployments):
- Direct redirect only (no UI)
- Latest version only
- Minimal, fast, no-decisions-needed experience

### 🛡️ **Production-Ready**
- Comprehensive error handling and logging
- Performance optimized with caching
- Validation utilities for testing
- Clear separation of code and configuration

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────┐
│  Users visit permanent /exec URL    │
└──────────────┬──────────────────────┘
               ↓
┌──────────────────────────────────────┐
│  Apps Script Web App (Code.gs)       │
│  - Route requests                    │
│  - Load configuration                │
│  - Find latest version               │
└──────────────┬───────────────────────┘
               ↓
┌──────────────────────────────────────┐
│  Config Sheet (Config.gs)            │
│  - Product catalog                   │
│  - Folder mappings                   │
│  - Settings                          │
└──────────────┬───────────────────────┘
               ↓
┌──────────────────────────────────────┐
│  Google Drive Folders                │
│  📁 EventPlanning/                   │
│    ├── EventPlanner-v1.0             │
│    ├── EventPlanner-v1.1             │
│    └── EventPlanner-v1.2 ← Latest    │
│  📁 MailMerge/                       │
│    └── MailMerge-v2.0 ← Latest       │
└──────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Option A: Setup Wizard (Recommended) ⭐

The easiest way to get started—**fully automated, zero manual configuration**:

1. **Deploy the Web App**:
   - Push to GitHub (CI/CD deploys automatically via GitHub Actions), OR
   - Use `clasp push` to deploy manually
2. **Deploy as Web App** in Apps Script editor:
   - Deploy → New deployment → Web app
   - Execute as: Me
   - Who has access: Anyone (or Anyone with Google account)
3. **Access Admin Panel**: Visit your web app URL with `?admin=true`
4. **Setup Wizard Runs Automatically** (first time only):
   - **Step 1:** Welcome & overview of automated features
   - **Step 2:** Click to create configuration sheet (automatically linked - no ID copying!)
   - **Step 3:** Add first product using Drive Picker (visual folder selection - no ID copying!)
   - **Step 4:** Complete & access admin panel

**That's it!** Your system is configured and ready. The configuration sheet ID is automatically saved to Script Properties, so no code changes are needed.

### Option B: Manual Configuration

If you prefer full control:

### 1. **Create Configuration Sheet**

Run this in Apps Script editor:
```javascript
createConfigurationSheet()
```

This creates a pre-formatted Google Sheet with:
- Product configuration table
- Instructions sheet
- Example products

### 2. **Set Up Your Products**

In the configuration sheet:

| name          | folderId           | displayName         | enabled | description                    |
|---------------|-------------------|---------------------|---------|--------------------------------|
| EventPlanning | abc123...         | Event Planning Tool | TRUE    | Organize events effortlessly   |
| MailMerge     | def456...         | Mail Merge Pro      | TRUE    | Send personalized emails       |

Replace `abc123...` with your actual Google Drive folder IDs.

### 3. **Configure the Script**

In `Code.gs`, update the `CONFIG` object (optional if using Setup Wizard):

```javascript
const CONFIG = {
  mode: 'full',  // or 'simple' for client deployments
  configSheetId: 'YOUR_CONFIG_SHEET_ID_HERE',  // Optional - Setup Wizard uses Script Properties
  branding: {
    organizationName: 'Your Organization',
    tagline: 'Professional Templates',
    supportEmail: 'support@example.com'
  }
};
```

**Note:** If you use the Setup Wizard (Option A), the configuration sheet ID is stored in Script Properties and takes precedence over the hardcoded value. Manual configuration in `CONFIG` is only needed if you want to bypass the Setup Wizard.

### 4. **Deploy as Web App**

1. In Apps Script editor: **Deploy** → **New deployment**
2. Type: **Web app**
3. Execute as: **Me**
4. Who has access: **Anyone** (or **Anyone with Google account**)
5. Click **Deploy**
6. Copy the `/exec` URL — this is your permanent redirector link

### 5. **Test It**

Visit your URLs:
- `https://script.google.com/.../exec` → Landing page (full mode)
- `https://script.google.com/.../exec?product=EventPlanning` → Latest Event Planning template
- `https://script.google.com/.../exec?product=MailMerge` → Latest Mail Merge template

---

## 📖 Usage Examples

### For Administrators

**Admin Panel:**
```
https://your-webapp/exec?admin=true
```
Access the admin panel to:
- Add, edit, delete products via web UI
- Enable/disable products with toggle
- Use Drive Picker to select folders visually (no ID copying!)
- View folder contents and file counts
- Validate folder accessibility
- Clear configuration cache
- Navigate to landing page

**Setup Wizard** (runs automatically on first `?admin=true` visit):
- Automatically shown if no configuration exists
- Creates and links configuration sheet automatically
- No manual ID copying or code changes needed
First-time setup wizard (automatic redirect if not configured):
- Creates configuration sheet automatically
- Guides through first product setup
- Uses Drive Picker for folder selection
- Validates configuration

**Note:** Both admin panel and setup wizard are only accessible to the script deployer for security.

### For End Users

**Landing Page (Full Mode):**
```
https://your-webapp/exec
```
Shows all available templates with descriptions and links.

**Direct Product Link:**
```
https://your-webapp/exec?product=EventPlanning
```
Instantly redirects to latest Event Planning template's `/copy` link.

**Specific Version (Full Mode Only):**
```
https://your-webapp/exec?product=EventPlanning&version=1.5
```
Redirects to version 1.5 if available.

---

## 🎨 Customization

### Changing Deployment Mode

```javascript
// In Code.gs
const CONFIG = {
  mode: 'simple'  // Change to 'simple' for minimal client deployment
};
```

### Updating Branding

```javascript
// In Code.gs
branding: {
  organizationName: 'USBG National',
  tagline: 'Member Resources & Templates',
  supportEmail: 'support@usbg.org'
}
```

### Adding New Products

**Via Admin Panel (Recommended):**
1. Visit `?admin=true`
2. Click "➕ Add New Product"
3. Fill in product details
4. Click "📁 Browse Drive" to select folder visually
5. Save—configuration updates automatically

**Via Google Sheet (Manual):**

Simply add a new row to your configuration sheet:

| name        | folderId  | displayName      | enabled | description           |
|-------------|-----------|------------------|---------|----------------------|
| NewProduct  | xyz789... | New Product Name | TRUE    | Description here     |

Changes take effect within 5 minutes (cache refresh).

To force immediate update (Admin Panel → Clear Cache button, or run in Apps Script editor):
```javascript
clearConfigCache()
```

---

## 🛠️ Maintenance & Operations

### Validation

Test your configuration:
```javascript
validateConfiguration()
```

Checks:
- Configuration sheet format
- Folder accessibility
- File counts per product

**Test Script Properties implementation:**
```javascript
// Run individual tests
test_ScriptPropertiesPriority()
test_SetConfigSheetId()
test_LoadConfigurationWithScriptProperties()

// Or run all tests at once
runAllTests()
```

See `Tests.gs` for detailed test suite that verifies:
- Script Properties priority system
- Configuration loading with runtime values
- Setup wizard automation
- All runtime configuration functions

### Cache Management

Configuration is cached for 5 minutes for performance.

**Clear cache manually:**
```javascript
clearConfigCache()
```

**Set up automatic cache clearing:**
Add a time-based trigger for `clearConfigCache()` (e.g., every hour).

### Monitoring

Check execution logs in Apps Script:
- **Extensions** → **Apps Script** → **Executions**

Logs show:
- Successful redirects
- Configuration loads
- Errors and warnings

---

## 📊 Deployment Strategies

### Single Client Deployment

1. Set `mode: 'simple'`
2. Configure products in sheet
3. Deploy once
4. Client manages products via sheet

### Multi-Environment Deployment

**Portfolio (Full Features):**
```javascript
mode: 'full'
configSheetId: 'YOUR_PORTFOLIO_SHEET'
```

**Client (Simple):**
```javascript
mode: 'simple'
configSheetId: 'CLIENT_SHEET'
```

Deploy to different Apps Script projects with different configs.

---

## 🔐 Security & Permissions

### Recommended Settings

**For Public Templates:**
- Execute as: **Me** (your account)
- Who has access: **Anyone**

**For Internal Templates:**
- Execute as: **Me**
- Who has access: **Anyone with Google account**

### Permission Scopes

This script requires:
- `DriveApp` - Read template folders
- `SpreadsheetApp` - Read configuration sheet
- `CacheService` - Performance optimization

Users visiting the web app do **NOT** need Drive permissions—only you (the deployer) do.

---

## 📁 Repository Structure

```
Template-Distribution-System/
├── Code.gs                  ← Main web app logic
├── Config.gs                ← Configuration management
├── README.md                ← This file
├── CLIENT-SETUP.md          ← Client deployment guide
├── ARCHITECTURE.md          ← Detailed design documentation
├── docs/
│   ├── CONFIG_TEMPLATE.md   ← Configuration sheet structure
│   └── TROUBLESHOOTING.md   ← Common issues and solutions
└── .clasp.json              ← Deployment configuration (optional)
```

---

## 🎓 Portfolio Presentation

### When Showcasing This Project

**The Problem:**
> "Client needed to distribute versioned templates to users without manually updating links or documentation every release."

**The Solution:**
> "Built a configuration-driven template distribution system with automatic version detection and client self-management capabilities."

**Key Achievements:**
- ✅ Reduced client maintenance burden (zero developer intervention for product changes)
- ✅ Improved user experience (always get latest version automatically)
- ✅ Enabled non-technical staff to manage products via spreadsheet
- ✅ Supported organizational growth (2 products → 10+ products with no code changes)

**Technical Highlights:**
- Configuration-as-data architecture pattern
- Dual deployment modes for different use cases
- Performance optimization with intelligent caching
- Production-grade error handling and logging
- Separation of concerns (code vs. configuration)

**Business Impact:**
- Eliminated manual link updates across documentation
- Reduced support requests about outdated templates
- Empowered client to scale product offerings independently
- Created passive maintenance model (rarely needs updates)

---

## 🤝 Integration with Other Systems

### Works Well With

- **Admin Consoles** - Reference this as optional distribution module
- **CI/CD Pipelines** - Deploy via `clasp push` from GitHub Actions
- **Analytics Systems** - Log redirects to BigQuery or Sheets for usage tracking
- **Documentation Sites** - Embed permanent links in docs/wikis

### Related Projects

- [Google Workspace Admin Console](../Google-Workspace-Admin-Console) - Enterprise automation platform for USBG
- More modular tools for Google Workspace automation

---

## 📝 License

[Choose appropriate license - MIT recommended for portfolio projects]

---

## 🆘 Support & Contributing

### Need Help?

1. Check [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
2. Review [CLIENT-SETUP.md](CLIENT-SETUP.md) for detailed setup guide
3. Open an issue on GitHub

### Contributing

This is a portfolio project, but suggestions and improvements are welcome!

---

## 🌟 Why This Project Matters

This isn't just a utility script—it's a demonstration of:

- **Systems thinking** - Solving operational problems with elegant code
- **Client-centric design** - Building for autonomy and scalability
- **Production-grade practices** - Error handling, caching, validation
- **Business acumen** - Understanding that more features ≠ better for all users

**Perfect for showing employers you understand both the technical AND business sides of software engineering.**

---

**Built with ❤️ by [Your Name]**  
*Part of the LOIS Core portfolio - transforming coursework into career assets*

<!-- CI/CD test -->
