# Copilot Instructions - Template Distribution System

## Project Overview

This is a **Google Apps Script web application** that provides permanent URLs for versioned Google Sheets templates. It's configuration-driven—products are managed via a Google Sheet, enabling non-technical users to add/update templates without code changes.

**Business Model:** Client autonomy through configuration-as-data architecture.

## Key Architecture Patterns

### Dual Deployment Modes
The system has two modes controlled by `CONFIG.mode` in `Code.gs`:

- **`full`** - Landing page with product cards, version selection, branding (portfolio/multi-product use)
- **`simple`** - Direct redirect only, minimal UI (client deployments)

**Critical:** Always respect the mode when adding features. Full-mode features must gracefully degrade or be disabled in simple mode.

### Configuration Management
Products are stored in a Google Sheet (`CONFIG.configSheetId`), **not in code**:

```javascript
// Sheet columns: name | folderId | displayName | enabled | description
// Example: EventPlanning | abc123... | Event Planning Tool | TRUE | Organize events effortlessly
```

**5-minute cache** via `CacheService` prevents excessive Sheet reads. Clear cache with `clearConfigCache()` after config changes.

### Version Detection Logic
The system finds the "latest" template by **file creation date** (not filename parsing):

```javascript
// In getMostRecentFile() - uses file.getDateCreated()
// Assumes newer files = newer versions
```

Version-specific requests (full mode only) use **flexible regex matching** (`v1.5`, `1.5`, `Template-v1.5` all match version 1.5).

### Request Routing

```
User → doGet(e) 
  ├─ No params + full mode → renderLandingPage()
  ├─ No params + simple mode → Error (must specify product)
  └─ ?product=X → handleProductRedirect()
       ├─ Load config (with cache check)
       ├─ Find product in config.products
       ├─ Get Drive folder by folderId
       ├─ Find latest/specific version
       └─ Redirect to /copy URL
```

## Development Workflow

### Local → GitHub → Apps Script (CI/CD)
This project uses **GitHub Actions** for automated deployment:

**Local Development:**
```powershell
# Edit code in VS Code
# Test changes locally if needed

# Commit changes
git add .
git commit -m "Description of changes"

# Push to GitHub (triggers auto-deployment)
git push origin main
```

**What happens next:**
1. GitHub Actions workflow runs automatically
2. Installs dependencies and configures clasp
3. Pushes code to Apps Script using secrets from GitHub Secrets
4. Creates new deployment with commit SHA in description

**Why this approach?**
- Keeps OAuth tokens secure in GitHub Secrets (not local)
- Single source of truth (GitHub)
- Automated deployment on every push to main
- No local clasp credentials needed

### GitHub Environment & Secrets Required
Configure a **`Production`** environment in repo Settings → Environments with these secrets:

**Required:**
- **`CLASPRC_JSON`** - User OAuth tokens from `~/.clasprc.json` (entire JSON file)
  ```json
  {
    "tokens": {
      "default": {
        "client_id": "...",
        "refresh_token": "...",
        "access_token": "...",
        // ... full token structure
      }
    }
  }
  ```

**Optional (for versioned deployments):**
- **`CREATE_VERSION`** - Set to `'true'` to create Apps Script versions on deploy
- **`UPDATE_DEPLOYMENT`** - Set to `'true'` to update existing deployment
- **`DEPLOYMENT_ID`** - Numeric/string ID of deployment to update

**Important:** The repository's `.clasp.json` is the source of truth (contains `scriptId`, `rootDir`, `oauthClientId`). **Do NOT** overwrite it from secrets.

See `GITHUB_SECRETS_SETUP.md` for complete setup instructions.

### Local Testing (Optional)
If you need to test locally before pushing:

```powershell
# Install clasp globally
npm install -g @google/clasp

# Login (first time only) - use --no-localhost for headless environments
clasp login --no-localhost

# Push to Apps Script to test
clasp push

# Open in browser
clasp open
```

**Note:** Local clasp setup is optional. The CI/CD pipeline handles all deployments.

### Security & Secret Rotation
**Important:** The `CLASPRC_JSON` secret contains user OAuth tokens that should be rotated regularly:

- Rotate at least every **30 days** for regular projects
- Use the `Production` environment to gate access with required reviewers
- Only repository administrators should edit secrets
- To rotate: `clasp logout && clasp login --no-localhost` locally, then update the `CLASPRC_JSON` secret

**Note:** Service accounts cannot be used for Apps Script deployments—the API requires user-level OAuth for write operations.

### Testing Strategy

**Function-level testing (Apps Script editor):**
```javascript
// Open Apps Script: https://script.google.com/d/[SCRIPT_ID]/edit
validateConfiguration()  // Checks config sheet, folder access, file counts
clearConfigCache()       // Forces config reload
createConfigurationSheet()  // Setup helper
```

**Deployment testing workflow:**
1. Make code changes locally
2. Commit and push to GitHub
3. Wait for GitHub Actions to complete (check Actions tab)
4. Open Apps Script editor to run function tests
5. Test the web app `/exec` URL with different parameters

**Web app testing:**
- Test without params (landing page in full mode)
- Test `?product=ProductName` (redirect)
- Test `?product=X&version=1.5` (version-specific, full mode only)
- Test invalid product names (error handling)
- Test disabled products (should not be accessible)

**Monitoring deployments:**
- GitHub Actions: Repository → Actions tab
- Apps Script logs: Apps Script editor → Executions (left sidebar)

## Code Organization

### Code.gs - Web App Controller
- `doGet(e)` - HTTP entry point, routing logic
- `handleProductRedirect()` - Core redirect logic
- `renderLandingPage()` - HTML generation (full mode)
- `createRedirect()` - HTML redirect response with iframe-breaking
- File selection utilities: `getMostRecentFile()`, `findFileByVersion()`

### Config.gs - Configuration Layer
- `loadConfiguration()` - Loads from Sheet with cache-aside pattern
- `loadConfigFromSheet()` - Sheet parsing logic (handles missing columns gracefully)
- `createConfigurationSheet()` - Setup helper for new deployments
- `validateConfiguration()` - Operational validation tool
- `clearConfigCache()` - Cache management

### appsscript.json
- Runtime: V8 (modern JavaScript)
- Timezone: America/New_York
- Exception logging: STACKDRIVER (view in Apps Script executions)

## Critical Conventions

### Error Handling Philosophy
- **User-facing errors:** Generic, helpful messages (no technical details)
- **Logging:** Detailed errors to `Logger.log()` for developer troubleshooting
- **No stack traces to users:** Security best practice

Example:
```javascript
try {
  folder = DriveApp.getFolderById(product.folderId);
} catch (err) {
  Logger.log(`ERROR: Cannot access folder for ${productName}: ${err.message}`);
  return ContentService.createTextOutput('Configuration error: Cannot access templates.');
}
```

### HTML Output Pattern
Always use `HtmlService.XFrameOptionsMode.ALLOWALL` to break out of Google's iframe:

```javascript
return HtmlService.createHtmlOutput(html)
  .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
```

Use `window.top.location.href` for redirects to escape iframes.

### Configuration Validation
Required columns in Products sheet: `name`, `folderId`  
Optional columns: `displayName`, `enabled`, `description`

Default values:
- `enabled` → `true` if missing
- `displayName` → value of `name` if missing
- `description` → empty string if missing

Empty rows are skipped during parsing.

### Performance Considerations
- **Cache duration:** 5 minutes (`300` seconds)
- **API quota awareness:** DriveApp calls are limited (10K/day consumer accounts)
- **Caching rationale:** Reduces Sheet reads from 1/request to 1/5min (~500x reduction)

## Common Development Tasks

### Adding New Features
1. Check if feature should respect mode (`if (CONFIG.mode === 'full')`)
2. Add configuration to `CONFIG` object if needed
3. Document in comments (this project values comprehensive inline docs)
4. Test in both modes if applicable
5. Update relevant .md files (README, ARCHITECTURE, etc.)

### Adding Configuration Options
Extend the Products sheet schema:

1. Add column to sheet (e.g., `category`)
2. Update `loadConfigFromSheet()` to parse new column
3. Add to product object in return value
4. Use in business logic (e.g., group products by category)
5. Document in CONFIG_TEMPLATE.md

### Troubleshooting Deployments
**"Cannot access folder"** → Check folder permissions for deployer account  
**"Product not found"** → Verify `enabled = TRUE` in config sheet  
**"Old config showing"** → Run `clearConfigCache()` to force reload  
**"Redirect not working"** → Check if URL has `/copy` suffix  

View execution logs: Apps Script editor → Executions (left sidebar)

## Integration Points

### Google Apps Script APIs Used
- **DriveApp:** Read folders, list files by MIME type (`MimeType.GOOGLE_SHEETS`)
- **SpreadsheetApp:** Read configuration sheet
- **CacheService:** Store parsed config (script-level cache)
- **HtmlService:** Generate HTML responses
- **ContentService:** Return text responses (errors)
- **Logger:** Execution logging (view in Apps Script UI)

### External Dependencies
None—fully self-contained in Google Apps Script runtime.

### Required Permissions
- Read access to Drive folders (for template files)
- Read access to config spreadsheet
- CacheService (no auth required)

Users visiting web app need **no permissions** (script runs as deployer).

## Portfolio Context

This project demonstrates:
- **Configuration-driven design:** Business logic in data, not code
- **Client autonomy:** Non-technical users can manage products
- **Dual-mode architecture:** One codebase serves different use cases
- **Production practices:** Caching, error handling, validation, logging
- **Google Workspace ecosystem expertise:** Apps Script, Drive, Sheets integration

**When showcasing:** Emphasize the "zero developer intervention" for adding products—this is the core value proposition.

## Documentation Standards

This codebase uses **comprehensive inline comments** following a specific style:

```javascript
/**
 * ============================================================================
 * SECTION HEADER
 * ============================================================================
 * 
 * High-level description of the section.
 * 
 * KEY POINTS:
 * - Bullet point explanations
 * 
 * PORTFOLIO NOTE:
 * Why this matters for career showcase
 * 
 * ============================================================================
 */
```

**Maintain this style** when adding new code sections. Comments should explain "why" not just "what."

## Important Files Reference

- **Code.gs** - All web app logic (routing, redirects, HTML generation)
- **Config.gs** - Configuration management, caching, validation
- **.clasp.json** - Apps Script project ID (contains actual script ID)
- **package.json** - clasp commands (`npm run push`, etc.)
- **appsscript.json** - Apps Script manifest (runtime, timezone)
- **ARCHITECTURE.md** - Deep technical documentation (read for design rationale)
- **README.md** - User-facing documentation (portfolio presentation)

## AI Agent Best Practices

1. **Read ARCHITECTURE.md first** when making significant changes—it contains design rationale
2. **Use Git workflow**—never use `clasp push` directly; commit and push to GitHub instead
3. **Test with `validateConfiguration()`** after config changes in Apps Script editor
4. **Respect the dual-mode pattern**—don't break simple mode when adding full-mode features
5. **Maintain documentation standards**—comprehensive inline comments are required
6. **Log errors to Logger, not to users**—security best practice
7. **Cache-aware development**—remember the 5-minute cache when testing config changes
8. **Portfolio mindset**—this is a showcase project, prioritize code clarity and documentation
9. **Check GitHub Actions**—after pushing, verify deployment succeeded in Actions tab

## Quick Reference

### Key Functions
- `doGet(e)` - HTTP entry point
- `handleProductRedirect(name, version)` - Redirect logic
- `loadConfiguration()` - Config loader with caching
- `validateConfiguration()` - Test config setup
- `clearConfigCache()` - Force cache refresh

### Configuration Sheet Structure
```
| name          | folderId      | displayName         | enabled | description                    |
|---------------|---------------|---------------------|---------|--------------------------------|
| EventPlanning | abc123...     | Event Planning Tool | TRUE    | Organize events effortlessly   |
```

### Mode Toggle
```javascript
const CONFIG = {
  mode: 'full',  // or 'simple'
  // ...
};
```

### Common URLs
- Landing page: `https://script.google.com/.../exec`
- Product redirect: `https://script.google.com/.../exec?product=ProductName`
- Version-specific: `https://script.google.com/.../exec?product=Name&version=1.5`
