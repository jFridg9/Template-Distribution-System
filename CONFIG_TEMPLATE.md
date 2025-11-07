# Configuration Template

> **Reference guide for the configuration spreadsheet structure.**

Use this as a reference when setting up your configuration sheet, or run `createConfigurationSheet()` in Apps Script to generate it automatically.

---

## 📋 Sheet Structure

### Sheet Name: `Products`

### Column Definitions

| Column Name | Type | Required | Description | Example |
|-------------|------|----------|-------------|---------|
| **name** | Text | ✅ Yes | Internal identifier. Use CamelCase, no spaces. Used in URLs. | `EventPlanning` |
| **folderId** | Text | ✅ Yes | Google Drive folder ID containing template versions. Get from folder URL. | `1a2b3c4d5e6f7g8h9i0j` |
| **displayName** | Text | ⚠️ Optional | User-facing name shown on landing page. Defaults to `name` if omitted. | `Event Planning Tool` |
| **enabled** | Boolean | ⚠️ Optional | TRUE to make product visible, FALSE to hide. Defaults to TRUE. | `TRUE` |
| **description** | Text | ⚠️ Optional | Brief description for landing page. Can be empty. | `Organize events effortlessly` |
| **category** | Text | ⚠️ Optional | Category for grouping products. Defaults to 'Uncategorized'. | `Event Planning` |
| **tags** | Text | ⚠️ Optional | Comma-separated tags for filtering and search. | `planning, calendar, scheduling` |

---

## 📝 Example Configuration

### Minimal Example (Required Columns Only)

| name | folderId |
|------|----------|
| EventPlanning | 1a2b3c4d5e6f7g8h9i0j |
| MailMerge | 9i8h7g6f5e4d3c2b1a0 |

### Full Example (All Columns)

| name | folderId | displayName | enabled | description | category | tags |
|------|----------|-------------|---------|-------------|----------|------|
| EventPlanning | 1a2b3c4d5e6f7g8h9i0j | Event Planning Tool | TRUE | Plan and coordinate events with ease | Event Planning | planning, calendar, scheduling |
| MailMerge | 9i8h7g6f5e4d3c2b1a0 | Mail Merge Pro | TRUE | Send personalized emails at scale | Communication | email, communication, outreach |
| InvoiceTracker | abc123def456ghi789jk | Invoice Tracker | FALSE | Track invoices and payments (Coming soon!) | Finance | budget, expenses, tracking |
| BudgetPlanner | xyz987wvu654tsr321po | Budget Planning | TRUE | Manage organizational budgets | Finance | budget, planning, finance |

---

## 🎯 Naming Conventions

### Product Names (Internal)

**Good:**
- `EventPlanning` (CamelCase)
- `MailMerge` (CamelCase)
- `InvoiceTracker` (CamelCase)

**Bad:**
- `Event Planning` (spaces - breaks URLs)
- `mail-merge` (hyphens - inconsistent)
- `invoice_tracker` (underscores - inconsistent)

**URL Usage:**
```
https://script.google.com/.../exec?product=EventPlanning
                                           ↑
                                    Uses 'name' column
```

---

### Display Names (User-Facing)

**Good:**
- `Event Planning Tool` (readable, descriptive)
- `Mail Merge Pro` (branded)
- `Invoice & Budget Tracker` (special characters OK)

**Guidelines:**
- Can include spaces and special characters
- Keep under 40 characters for UI
- Clear and descriptive

---

## 📂 Folder Organization

### Recommended Structure

```
📁 Your Google Drive
  └── 📁 Template Distribution
      ├── 📁 EventPlanning/           ← Use this folder's ID
      │   ├── EventPlanner-v1.0
      │   ├── EventPlanner-v1.1
      │   └── EventPlanner-v1.2
      │
      ├── 📁 MailMerge/               ← Use this folder's ID
      │   ├── MailMerge-v1.0
      │   └── MailMerge-v2.0
      │
      └── 📁 InvoiceTracker/          ← Use this folder's ID
          └── InvoiceTracker-v1.0
```

### Getting Folder IDs

1. Open the folder in Google Drive
2. Look at the URL: `https://drive.google.com/drive/folders/[FOLDER_ID]`
3. Copy the `FOLDER_ID` part
4. Paste into the `folderId` column

**Example URL:**
```
https://drive.google.com/drive/folders/1a2b3c4d5e6f7g8h9i0j
                                        └─────────┬─────────┘
                                          Copy this part
```

---

## 🔄 Version File Naming

### Recommended Patterns

**Pattern 1: Semantic Versioning**
```
TemplateName-v1.0
TemplateName-v1.1
TemplateName-v2.0
```

**Pattern 2: Simple Versioning**
```
TemplateName-1.0
TemplateName-1.1
TemplateName-2.0
```

**Pattern 3: Date-Based**
```
TemplateName-2025-01-15
TemplateName-2025-02-20
```

### Version Detection

The system automatically finds the **most recently created file** in each folder.

**Important:** File **creation date** determines "latest," not the version number in the filename.

**To release a new version:**
1. Create the new file (e.g., `Template-v1.5`)
2. Place it in the appropriate product folder
3. Done! System automatically serves it as latest

---

## ✅ Validation Checklist

Before going live, verify:

- [ ] All `name` values are unique
- [ ] All `name` values have no spaces
- [ ] All `folderId` values are valid Drive folder IDs
- [ ] All folders contain at least one Google Sheets file
- [ ] All folders have appropriate sharing permissions
- [ ] `enabled` is set to TRUE for active products
- [ ] `displayName` and `description` are clear and accurate

**Run validation:**
```javascript
validateConfiguration()  // In Apps Script editor
```

---

## 🚀 Common Configurations

### Configuration 1: Simple Deployment (2-3 Products)

```
| name          | folderId | displayName     | enabled | description |
|---------------|----------|-----------------|---------|-------------|
| Template1     | abc123   | Main Template   | TRUE    | Our primary template |
| Template2     | def456   | Advanced        | TRUE    | Advanced features |
```

**Use Case:** Small organization, few templates, simple needs.

---

### Configuration 2: Product Line (5-10 Products)

```
| name             | folderId | displayName          | enabled | description |
|------------------|----------|----------------------|---------|-------------|
| EventPlanning    | abc...   | Event Planning       | TRUE    | Plan events |
| MailMerge        | def...   | Mail Merge           | TRUE    | Send emails |
| BudgetPlanner    | ghi...   | Budget Planner       | TRUE    | Track budgets |
| InvoiceTracker   | jkl...   | Invoice Tracker      | TRUE    | Manage invoices |
| MemberRegistry   | mno...   | Member Registry      | TRUE    | Track members |
```

**Use Case:** Medium organization, diverse template needs.

---

### Configuration 3: Beta Testing

```
| name          | folderId | displayName     | enabled | description |
|---------------|----------|-----------------|---------|-------------|
| ProductStable | abc...   | Product v2      | TRUE    | Current stable version |
| ProductBeta   | def...   | Product v3 Beta | FALSE   | Testing - not public yet |
```

**Use Case:** Testing new versions before public release.

**Workflow:**
1. Create beta product with `enabled = FALSE`
2. Test internally using direct URL
3. When ready: set `enabled = TRUE`

---

## 🔧 Advanced Customization

### Categories and Tags

Categories help organize products into logical groups on the landing page. Tags enable fine-grained filtering and search.

**Example with Categories:**

| name | folderId | displayName | enabled | description | **category** | **tags** |
|------|----------|-------------|---------|-------------|------------|----------|
| EventPlanning | abc... | Event Tool | TRUE | Plan events | Event Planning | planning, calendar, scheduling |
| MailMerge | def... | Mail Merge | TRUE | Send emails | Communication | email, communication, outreach |
| InvoiceTracker | ghi... | Invoice Tracker | TRUE | Track invoices | Finance | budget, expenses, tracking |

**Recommended Categories:**
- Event Planning
- Communication
- Finance
- Project Management
- Custom

**Tag Best Practices:**
- Use lowercase
- Separate with commas
- Keep tags short and descriptive
- Use 2-5 tags per product
- Common tags help users find related products

**Landing Page Features:**
- Products are filterable by category
- Search works across names, descriptions, and tags
- Tag cloud shows popular tags
- Click a tag to filter products

---

### Future: Access Control

Future enhancement could support:

| name | folderId | displayName | enabled | description | **accessLevel** |
|------|----------|-------------|---------|-------------|----------------|
| PublicTemplate | abc... | Public Tool | TRUE | For everyone | public |
| InternalTool | def... | Internal | TRUE | Staff only | internal |

---

## 📊 Configuration Best Practices

### 1. **Start Small**
- Begin with 2-3 products
- Test thoroughly
- Add more products once comfortable

### 2. **Use Descriptive Names**
- Internal names should be clear (e.g., `EventPlanning` not `EP`)
- Display names should be user-friendly
- Descriptions should explain value, not just repeat the name

### 3. **Organize Folders**
- Keep all product folders in one parent folder
- Use consistent naming for version files
- Document your versioning scheme

### 4. **Test Before Enabling**
- Add new products with `enabled = FALSE`
- Test using direct URLs
- Enable when ready for users

### 5. **Document Changes**
- Keep notes on when products were added
- Track major version releases
- Use the sheet's comment feature for notes

---

## 🆘 Troubleshooting

### "Product not found"

**Check:**
- Is the product name in the URL spelled exactly like the `name` column?
- Is `enabled` set to TRUE?
- Are there any extra spaces in the `name` value?

**Fix:** Match URL to exact `name` value, case-sensitive.

---

### "Cannot access folder"

**Check:**
- Is the `folderId` correct?
- Does the folder still exist in Drive?
- Does the script deployer have access to the folder?

**Fix:** Verify folder ID, check sharing settings.

---

### "No templates found"

**Check:**
- Does the folder contain Google Sheets files?
- Are files in subfolders (not supported)?
- Are files in the trash?

**Fix:** Add Google Sheets directly to the folder.

---

## 📚 Additional Resources

- **Setup Guide:** See [CLIENT-SETUP.md](CLIENT-SETUP.md)
- **Architecture Details:** See [ARCHITECTURE.md](ARCHITECTURE.md)
- **Main Documentation:** See [README.md](README.md)

---

**Quick Start Command:**
```javascript
// In Apps Script editor, run this to generate the config sheet:
createConfigurationSheet()
```

Then follow the instructions in the execution log!
