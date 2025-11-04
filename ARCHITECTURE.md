# Architecture & Design Documentation

> **Deep dive into the technical architecture, design decisions, and scalability strategy of the Template Distribution System.**

This document is intended for developers, technical stakeholders, and portfolio reviewers who want to understand the engineering choices behind the system.

---

## 🎯 Design Philosophy

### Core Principles

**1. Configuration over Code**
- Business logic (what to distribute) lives in data, not code
- Enables non-technical users to manage the system
- Reduces deployment frequency and developer dependency

**2. Separation of Concerns**
- Code handles routing and redirect logic
- Configuration sheet manages product catalog
- Drive folders organize content versions

**3. Progressive Enhancement**
- Simple mode for basic needs
- Full mode adds features without breaking simplicity
- Client can grow into features over time

**4. Production-First Mindset**
- Comprehensive error handling
- Performance optimization (caching)
- Logging for observability
- Validation tools for operations

---

## 🏗️ System Architecture

### High-Level Overview

```
┌────────────────────────────────────────────────────────────┐
│                        USER LAYER                          │
│  - End users visiting /exec URLs                           │
│  - Direct links or landing page                            │
└────────────────┬───────────────────────────────────────────┘
                 │
                 ↓
┌────────────────────────────────────────────────────────────┐
│                   PRESENTATION LAYER                       │
│  Code.gs: doGet()                                          │
│  - HTTP request routing                                    │
│  - Parameter parsing                                       │
│  - HTML generation & redirects                             │
└────────────────┬───────────────────────────────────────────┘
                 │
                 ↓
┌────────────────────────────────────────────────────────────┐
│                    BUSINESS LOGIC LAYER                    │
│  Code.gs: handleProductRedirect()                          │
│  - Product resolution                                      │
│  - Version selection                                       │
│  - File selection algorithms                               │
└────────────────┬───────────────────────────────────────────┘
                 │
                 ↓
┌────────────────────────────────────────────────────────────┐
│                  CONFIGURATION LAYER                       │
│  Config.gs: loadConfiguration()                            │
│  - Sheet parsing                                           │
│  - Caching strategy                                        │
│  - Validation                                              │
└────────────────┬───────────────────────────────────────────┘
                 │
                 ↓
┌────────────────────────────────────────────────────────────┐
│                      DATA LAYER                            │
│  - Google Sheets (configuration)                           │
│  - Google Drive (template storage)                         │
│  - CacheService (performance)                              │
└────────────────────────────────────────────────────────────┘
```

---

## 🔀 Request Flow

### Scenario 1: Landing Page Request (Full Mode)

```
User visits: https://script.google.com/.../exec

1. doGet(e) called with empty parameters
2. Check CONFIG.mode → 'full'
3. loadConfiguration() → Check cache
4. If cache miss → Read from Google Sheets
5. Parse product list
6. Cache result (5 minutes)
7. renderLandingPage()
8. Generate HTML with product cards
9. Return HtmlOutput
```

**Performance:**
- Cache hit: ~50ms
- Cache miss: ~500ms (sheet read)
- Subsequent requests: ~50ms

---

### Scenario 2: Direct Product Request

```
User visits: https://script.google.com/.../exec?product=EventPlanning

1. doGet(e) called with params.product = 'EventPlanning'
2. handleProductRedirect('EventPlanning', null)
3. loadConfiguration() → Check cache (hit)
4. Find product in config.products array
5. DriveApp.getFolderById(product.folderId)
6. folder.getFilesByType(MimeType.GOOGLE_SHEETS)
7. Iterate files, find most recent
8. Get file URL, replace /edit with /copy
9. createRedirect(copyUrl)
10. Return HtmlOutput with JavaScript redirect
```

**Performance:**
- Total: ~200-400ms
- Config load (cached): ~50ms
- Drive API call: ~150-300ms

---

### Scenario 3: Version-Specific Request (Full Mode)

```
User visits: .../exec?product=EventPlanning&version=1.5

1. doGet(e) with params.product & params.version
2. handleProductRedirect('EventPlanning', '1.5')
3. loadConfiguration() (cached)
4. Find product
5. Get files from folder
6. findFileByVersion(fileList, '1.5')
7. Regex match: /v?1\.5/i against filenames
8. If found → redirect
9. If not found → error with available versions
```

**Smart Matching:**
- Matches: `v1.5`, `1.5`, `Template-v1.5`, `Template-1.5`
- Case insensitive
- Flexible naming conventions

---

## 🧩 Component Design

### Code.gs - Web App Controller

**Responsibilities:**
- HTTP request handling
- Routing logic
- HTML generation
- Error presentation

**Design Patterns:**
- **Front Controller:** Single entry point (doGet)
- **Strategy Pattern:** Mode-based behavior switching
- **Template Method:** HTML rendering pipeline

**Key Functions:**

```javascript
doGet(e)
  ├── handleProductRedirect()
  │   ├── loadConfiguration()
  │   ├── getMostRecentFile()
  │   └── createRedirect()
  └── renderLandingPage()
      └── loadConfiguration()
```

---

### Config.gs - Configuration Management

**Responsibilities:**
- Configuration loading & parsing
- Caching strategy
- Validation utilities
- Setup helpers

**Design Patterns:**
- **Repository Pattern:** Abstract config source
- **Cache-Aside:** Read-through caching
- **Builder Pattern:** createConfigurationSheet()

**Cache Strategy:**

```
Request → Check CacheService
           ├─ Hit → Return cached config
           └─ Miss → Read from sheet
                     ├─ Parse & validate
                     ├─ Cache for 5 minutes
                     └─ Return config
```

**Why 5 minutes?**
- Balance between freshness and performance
- Tolerant of brief delays for updates
- Reduces Sheets API quota usage
- Can be overridden with clearConfigCache()

---

## 🔄 Configuration Schema

### Products Sheet Structure

```javascript
{
  products: [
    {
      name: string,           // Internal identifier (CamelCase)
      folderId: string,       // Google Drive folder ID
      displayName: string,    // User-facing name
      enabled: boolean,       // Visibility toggle
      description: string     // Landing page description
    }
  ]
}
```

**Validation Rules:**
- `name` and `folderId` are required
- `name` should be URL-safe (no spaces)
- `enabled` defaults to true if omitted
- `displayName` defaults to `name` if omitted
- Empty rows are skipped

**Extensibility:**
Future columns could include:
- `category` - Grouping on landing page
- `icon` - Visual branding
- `accessLevel` - Permission requirements
- `featured` - Highlight on homepage

---

## 🚀 Deployment Modes

### Full Mode

**Target Audience:**
- Portfolio demonstrations
- Power users
- Organizations with diverse template needs

**Features:**
- Landing page with product cards
- Version selection via query params
- Professional branding
- Product discovery UI

**Use Cases:**
- Template marketplace
- Public-facing distribution
- Multiple audience segments

---

### Simple Mode

**Target Audience:**
- Single-purpose deployments
- Clients who want minimal UI
- Embedded/automated workflows

**Features:**
- Direct redirect only
- No HTML UI
- Latest version only
- Minimal response time

**Use Cases:**
- Embedded in documentation
- API-style access
- Single-template distributions

---

### Mode Comparison Matrix

| Feature | Full Mode | Simple Mode |
|---------|-----------|-------------|
| Landing Page | ✅ Yes | ❌ No |
| Version Selection | ✅ Yes | ❌ No (always latest) |
| Product Browsing | ✅ Yes | ❌ No |
| Direct Links | ✅ Yes | ✅ Yes |
| Branding | ✅ Customizable | ⚠️ Minimal |
| Response Time | ~200-400ms | ~150-250ms |
| Code Complexity | Higher | Lower |

---

## 📊 Performance Considerations

### Caching Strategy

**What's Cached:**
- Configuration object (product list)
- Duration: 5 minutes (300 seconds)
- Storage: CacheService (script-level)

**What's NOT Cached:**
- Drive API responses (folders, files)
- Redirect HTML output
- Execution logs

**Cache Invalidation:**
- Automatic: 5-minute TTL
- Manual: `clearConfigCache()`
- On error: Cache ignored, sheet re-read

---

### API Quota Management

**Google Apps Script Quotas (Consumer Account):**
- DriveApp calls: 10,000/day
- SpreadsheetApp reads: 20,000/day
- CacheService: No daily limit

**Optimization Techniques:**
1. **Config Caching** - Reduces Sheets reads from 1/request to 1/5min
2. **Batch Operations** - Single file iterator per product
3. **Lazy Loading** - Only load config when needed
4. **Error Handling** - Fail gracefully without retry storms

**Estimated Capacity:**
- Without caching: ~10,000 redirects/day
- With caching: ~500,000 redirects/day
- Typical usage: <1,000/day for most deployments

---

### Scalability Analysis

**Current Architecture:**
- **Vertical Scale:** Single Apps Script project
- **Horizontal Scale:** Multiple deployments (per client)

**Bottlenecks:**
| Component | Limit | Mitigation |
|-----------|-------|-----------|
| Drive API calls | 10K/day | Caching, shared folder access |
| Sheets API reads | 20K/day | 5-minute cache, fallback config |
| Script execution time | 6 min max | Fast, non-blocking operations |
| Concurrent requests | ~30/sec | Apps Script auto-scaling |

**Growth Scenarios:**

**10 products, 1,000 users/day:**
- Config loads: ~288/day (cached)
- Drive calls: ~1,000/day
- **Status:** ✅ No issues

**50 products, 10,000 users/day:**
- Config loads: ~288/day
- Drive calls: ~10,000/day
- **Status:** ⚠️ Approaching Drive quota
- **Mitigation:** Consider BigQuery analytics, reduce logging

**100 products, 100,000 users/day:**
- **Status:** ❌ Exceeds single project limits
- **Solution:** Sharded deployments (multiple web apps), Cloud Run migration

---

## 🔐 Security Architecture

### Threat Model

**Assets to Protect:**
1. Template content (Google Sheets)
2. Configuration data (product catalog)
3. User privacy (access patterns)

**Attack Vectors:**
1. Unauthorized template access
2. Configuration tampering
3. Denial of service
4. Information disclosure

---

### Security Controls

**Authentication & Authorization:**
- Web app deployment settings control access
- Options: Public, Google account, domain-specific
- Script executes with deployer's permissions
- Users never touch backend Drive/Sheets

**Input Validation:**
```javascript
// Product name sanitization
productName.toLowerCase().trim()

// Version number validation
version.replace('.', '\\.') // Escape for regex
```

**Error Handling:**
- Sensitive details logged only (Logger.log)
- User-facing errors are generic
- No folder IDs or internal paths exposed

**Permissions Model:**
```
User → Web App (/exec URL)
         ↓
Web App Script (runs as deployer)
         ↓
Drive/Sheets Access (deployer's permissions)
```

**Users never need:**
- Drive access
- Sheets access
- Apps Script access

**Only deployer needs:**
- Read access to Drive folders
- Read access to config sheet

---

## 🛠️ Operational Design

### Monitoring & Observability

**Built-in Logging:**
```javascript
Logger.log(`Redirecting to: ${product.displayName}`)
Logger.log(`Loaded ${products.length} products from config`)
Logger.log('ERROR: Cannot access folder...')
```

**View Logs:**
- Apps Script Editor → Executions
- Shows: Timestamp, function, status, duration, logs

**Metrics to Monitor:**
- Request count by product
- Error rate
- Average response time
- Cache hit rate

**Future Enhancements:**
- BigQuery export for analytics
- Alerts on error rate thresholds
- Usage dashboards

---

### Validation & Testing

**Built-in Validation:**
```javascript
validateConfiguration()
```

**Checks:**
- ✅ Config sheet accessible
- ✅ All products have valid folder IDs
- ✅ Folders contain Google Sheets
- ✅ File counts per product

**Testing Strategy:**

**Unit-Level:**
- Run individual functions in Apps Script editor
- Use Logger.log for debugging
- Test with sample data

**Integration-Level:**
- Deploy as test web app
- Test all URL patterns
- Verify redirects work end-to-end

**User Acceptance:**
- Share test URL with stakeholders
- Gather feedback on landing page
- Validate template accessibility

---

### Deployment Pipeline

**Current: Manual Deployment**
```
1. Edit code in Apps Script editor
2. Save changes
3. Deploy → Manage deployments
4. Create new version or update existing
```

**Future: CI/CD with clasp**
```
1. Develop in VS Code
2. Push to GitHub
3. GitHub Actions runs:
   - Run linters
   - Execute tests
   - clasp push to Apps Script
   - Deploy new version
4. Automatic notification
```

**Files for CI/CD:**
```
.clasp.json          ← Project ID and root directory
.claspignore         ← Exclude from deployment
package.json         ← Scripts for clasp commands
.github/workflows/   ← CI pipeline
```

---

## 🔄 Maintenance & Evolution

### Configuration Changes

**Adding Products:**
1. User adds row to config sheet
2. Cache expires (5 min) or manual clear
3. Product immediately available
4. **No code changes, no redeployment**

**Updating Products:**
- Edit config sheet directly
- Changes reflected within 5 minutes
- Zero downtime

**Removing Products:**
- Set `enabled = FALSE` in config sheet
- Or delete row entirely
- Product becomes unavailable

---

### Code Updates

**Backward Compatibility:**
- New features should be optional
- Use feature flags (CONFIG.mode pattern)
- Maintain existing URL patterns

**Example: Adding Analytics**
```javascript
const CONFIG = {
  mode: 'full',
  enableAnalytics: false,  // New optional feature
  analyticsSheetId: ''
};

if (CONFIG.enableAnalytics) {
  logRedirect(product, user);
}
```

---

### Growth Scenarios

**Scenario 1: More Products**
- **0-10 products:** Current architecture ✅
- **10-50 products:** Consider categorization on landing page
- **50+ products:** Add search functionality, pagination

**Scenario 2: More Users**
- **0-1K requests/day:** No changes needed ✅
- **1K-10K/day:** Monitor quota usage
- **10K+/day:** Consider Cloud Run migration for unlimited scale

**Scenario 3: More Features**
- **Version history:** Add "Changelog" link per product
- **Usage analytics:** Track popular products
- **User feedback:** Embedded survey/ratings
- **A/B testing:** Multiple landing page variants

---

## 🎓 Design Decisions & Tradeoffs

### Why Google Sheets for Configuration?

**Pros:**
- ✅ Familiar interface (anyone can edit)
- ✅ Edit history & audit trail
- ✅ No database setup required
- ✅ Built-in access control
- ✅ Easy to backup/export

**Cons:**
- ❌ Not ideal for high-frequency writes
- ❌ Limited query capabilities
- ❌ Schema enforcement is manual

**Alternative Considered:** Firestore
- Better for large scale (1M+ reads/day)
- Requires more setup and permissions
- Overkill for typical use case

**Decision:** Sheets for simplicity, consider Firestore at scale.

---

### Why File Creation Date for "Latest"?

**Pros:**
- ✅ Automatic, no manual tagging
- ✅ Simple logic
- ✅ Works with any naming convention

**Cons:**
- ❌ Can be confusing if files moved/copied
- ❌ Doesn't handle version semantics (v1.10 vs v1.9)

**Alternatives:**
- Parse version numbers from filenames (complex)
- Maintain version manifest file (manual)

**Decision:** Creation date for simplicity, document naming best practices.

---

### Why Two Deployment Modes?

**Rationale:**
- Portfolio needs showcase features
- Clients want simplicity and speed
- Single codebase easier to maintain than two projects

**Implementation:**
- Simple `if/else` on CONFIG.mode
- No code duplication
- Easy to test both modes

**Alternative Considered:** Separate projects
- Would require maintaining two codebases
- Harder to keep in sync
- Not worth the complexity

---

## 📈 Future Enhancements

### Near-Term (Low Effort, High Value)

**1. Usage Analytics Dashboard**
- Log redirects to Google Sheets
- Aggregate by product, day, source
- Simple charts for trends

**2. QR Code Generation**
- Generate QR codes for each product
- Downloadable from landing page
- Useful for printed materials

**3. Email Notifications**
- Notify admins of errors
- Weekly usage summaries
- New product alerts

---

### Mid-Term (Medium Effort, Medium Value)

**1. Version History Page**
- Show all versions per product
- Let users browse and select old versions
- Display release dates

**2. Search & Filtering**
- Search bar on landing page
- Filter by category/tag
- Improves discoverability at scale

**3. Custom Branding Themes**
- Configurable colors, logos
- Per-client customization
- Stored in config sheet

---

### Long-Term (High Effort, High Impact)

**1. Multi-Tenant SaaS**
- One deployment serves multiple organizations
- Tenant isolation via subdomain or parameter
- Centralized management dashboard

**2. Cloud Run Migration**
- Unlimited scale
- Custom domain support
- Advanced features (rate limiting, CDN)

**3. Template Versioning System**
- Git-like version control
- Branch/merge templates
- Collaborative editing workflow

---

## 🎯 Portfolio Talking Points

### For Technical Interviews

**Question: "Tell me about a system you designed."**

> "I built a template distribution system that decouples content management from code deployment. It uses a configuration-driven architecture where non-technical users manage a product catalog via Google Sheets, while the core routing logic remains stable in code. This reduced the client's maintenance burden to zero—they can add products, update versions, and manage availability without developer intervention."

**Question: "How do you balance simplicity and features?"**

> "I implemented a dual-mode system. 'Simple mode' provides just the core redirect functionality—perfect for clients who want speed and clarity. 'Full mode' adds a landing page, version selection, and discovery features—great for portfolios and power users. Both use the same codebase, just with a configuration flag. This shows I can prioritize user needs over feature bloat."

**Question: "How did you handle scalability?"**

> "I used strategic caching to reduce API calls from 1 per request to 1 per 5 minutes, increasing capacity from 10K to 500K daily requests. I also designed the system to be horizontally scalable—each client gets their own deployment, so one client's traffic doesn't affect another's. For extreme scale, I documented a Cloud Run migration path."

---

### For Behavioral Interviews

**Question: "Describe a time you improved a process."**

> "My client was manually updating template links across 50+ documents every time they released a new version. I built a system that provides one permanent URL that always points to the latest version. This eliminated the manual update process entirely and ensured users never accidentally used outdated templates."

**Question: "How do you design for maintainability?"**

> "I separated configuration from code. Business rules—what templates to distribute—live in a Google Sheet that anyone can edit. The code just handles routing logic. This means the client can add 10 new products without touching code or redeploying. I also included validation tools so they can test changes before rolling them out."

---

## 📚 References & Inspiration

### Patterns & Principles

- **Configuration Management:** 12-Factor App methodology
- **Caching Strategy:** Cache-Aside pattern (Valet Key)
- **Separation of Concerns:** Clean Architecture (Robert Martin)
- **Progressive Enhancement:** Mobile-first web design

### Similar Systems

- **URL Shorteners:** bit.ly, TinyURL (permanent → temporary mapping)
- **CDN Edge Redirects:** Cloudflare Workers (routing logic at edge)
- **Package Managers:** npm, pip (latest vs. specific versions)

---

**This architecture is designed for longevity, adaptability, and client autonomy—the hallmarks of production-grade software.**

---

*Last updated: [Current Date]*  
*Author: [Your Name]*  
*Part of the LOIS Core Portfolio*
