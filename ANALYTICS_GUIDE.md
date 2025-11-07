# Analytics & Usage Tracking Guide

> **Understand how your templates are being used with comprehensive analytics tracking.**

This guide explains the analytics and usage tracking features of the Template Distribution System, including how to view analytics, export data, and understand the privacy-conscious implementation.

---

## 🎯 Overview

The analytics system tracks template usage to help you understand:
- Which templates are most popular
- How often users request specific versions vs. latest versions
- Usage trends over time
- System performance and adoption

**Key Principles:**
- **Privacy-First**: No personally identifiable information (PII) is collected
- **Non-Blocking**: Analytics tracking never slows down template redirects
- **Actionable**: Clear, visual insights you can act on
- **Optional Detailed Logging**: Choose between lightweight counters or detailed logs

---

## 📊 What's Tracked

### Product Access Counters
- **Total accesses per product**: How many times each template has been accessed
- **Latest version requests**: Requests without a specific version parameter
- **Specific version requests**: Requests for a particular version (e.g., `?version=1.5`)

### Detailed Logs (Optional)
If you set up an analytics sheet, the system also logs:
- Timestamp of access
- Product name
- Version type (latest or specific)
- Version value
- File name accessed

### What's NOT Tracked
✅ **Privacy-Conscious Implementation:**
- ❌ No user email addresses
- ❌ No IP addresses
- ❌ No session IDs
- ❌ No user-specific identifiers
- ❌ No personal information

---

## 🖥️ Viewing Analytics

### Access the Analytics Dashboard

1. **Open Admin Panel**: Visit your web app URL with `?admin=true`
   ```
   https://script.google.com/.../exec?admin=true
   ```

2. **Switch to Analytics Tab**: Click the "📊 Analytics" tab in the admin panel

3. **View Summary**: See key metrics at a glance:
   - Total Products
   - Total Accesses
   - Active Products
   - Last Updated Time

4. **Review Details**: Scroll down to see per-product statistics:
   - Product name
   - Total accesses
   - Latest version requests (with percentage)
   - Specific version requests (with percentage)
   - Visual popularity bars

### Analytics Dashboard Features

**Summary Cards:**
- Quick overview of system-wide metrics
- Real-time counters
- Last update timestamp

**Product Statistics Table:**
- Sortable columns
- Visual progress bars for popularity
- Percentage breakdowns
- Color-coded for easy reading

**Action Buttons:**
- 🔄 **Refresh Analytics**: Reload current data
- 📊 **Setup Analytics Sheet**: Create detailed logging sheet
- 📥 **Export to CSV**: Download analytics data

---

## 📁 Setting Up Detailed Logging

By default, analytics uses **Script Properties** for lightweight, fast counters. For detailed historical logs, set up an analytics sheet:

### Create Analytics Sheet

1. Go to Admin Panel → Analytics tab
2. Click "📊 Setup Analytics Sheet"
3. Confirm creation
4. The system creates a Google Sheet and links it automatically

### What You Get

**AccessLog Sheet:**
- Timestamp
- Product name
- Version type
- Version value
- File name

**Benefits:**
- Historical tracking
- Date range filtering
- Detailed access patterns
- Exportable data

### Data Retention

**Script Properties Counters:**
- Persistent (never expire)
- Lightweight and fast
- Manual reset only

**Detailed Logs Sheet:**
- Keeps last 10,000 entries
- Automated cleanup available
- Run `cleanupAnalyticsLogs()` from Apps Script editor

---

## 📥 Exporting Analytics Data

### Export to CSV

1. Go to Admin Panel → Analytics tab
2. Click "📥 Export to CSV"
3. File downloads automatically as `analytics-YYYY-MM-DD.csv`

### CSV Format

```csv
Timestamp,Product,VersionType,Version,FileName
2024-01-15 10:30:45,EventPlanning,latest,latest,EventPlanning-v2.0
2024-01-15 10:32:12,MailMerge,specific,1.5,MailMerge-v1.5
```

### Use Cases for Exported Data

- **Spreadsheet Analysis**: Open in Excel/Sheets for pivot tables
- **Data Visualization**: Import into Tableau, Power BI, etc.
- **Custom Reports**: Process with Python, R, or other tools
- **Long-Term Storage**: Archive analytics data externally

---

## 🔧 Advanced: Programmatic Access

### Get Analytics Summary

From the Apps Script editor, run:

```javascript
function testAnalytics() {
  const summary = getAnalyticsSummary();
  Logger.log(JSON.stringify(summary, null, 2));
}
```

**Returns:**
```json
{
  "totalAccesses": 1250,
  "products": [
    {
      "name": "EventPlanning",
      "displayName": "Event Planning Tool",
      "totalAccesses": 850,
      "latestRequests": 750,
      "specificRequests": 100,
      "enabled": true
    },
    ...
  ],
  "generatedAt": "2024-01-15T10:30:45.000Z"
}
```

### Get Access Logs

```javascript
function testAccessLogs() {
  const logs = getAccessLogs({
    limit: 100,
    productName: 'EventPlanning', // Optional filter
    startDate: '2024-01-01',      // Optional filter
    endDate: '2024-01-31'         // Optional filter
  });
  
  Logger.log(JSON.stringify(logs, null, 2));
}
```

### Reset Analytics

**⚠️ Caution**: This clears all counters!

```javascript
function resetAllAnalytics() {
  const result = resetAnalyticsCounters();
  Logger.log(result.message);
}
```

---

## 🛡️ Privacy & Data Policy

### Data Retention Policy

**Script Properties (Counters):**
- **Storage**: Persistent in Google Apps Script
- **Retention**: Indefinite (until manually reset)
- **Purpose**: Real-time access statistics
- **Access**: System administrators only

**Analytics Sheet (Detailed Logs):**
- **Storage**: Google Sheets (separate spreadsheet)
- **Retention**: Last 10,000 entries (automated cleanup available)
- **Purpose**: Historical analysis and trends
- **Access**: System administrators only

### Privacy Compliance

✅ **GDPR/Privacy-Friendly:**
- No personal data collected
- Anonymous usage metrics only
- No user tracking across sessions
- No behavioral profiling

✅ **Purpose Limitation:**
- Data used solely for system improvement
- Understanding usage patterns
- Capacity planning
- Template popularity insights

### Who Can Access Analytics?

**Admin Panel Access:**
- Same authentication as admin panel
- Deployer/administrator accounts only
- No public access

**Analytics Sheet Access:**
- Created under deployer account
- Share manually if needed
- Recommend: Keep private to administrators

---

## 📈 Using Analytics for Decision-Making

### Product Popularity

**High Access Count = Popular Template**
- Consider promoting popular templates
- Allocate more resources to maintaining popular items
- Use as reference for creating new templates

**Low Access Count = Review Needed**
- Is the template still relevant?
- Is it properly documented?
- Does it need better marketing?

### Version Request Patterns

**High Latest Version Requests:**
- ✅ Users trust your versioning
- ✅ Automatic updates working well
- Consider: Always use latest version links

**High Specific Version Requests:**
- 🤔 Users prefer specific versions
- 🤔 May indicate stability concerns
- Consider: Better version documentation

### Trend Analysis

**Growing Access Over Time:**
- ✅ Successful adoption
- ✅ Template meets user needs
- Consider: Scale infrastructure if needed

**Declining Access Over Time:**
- 🤔 User interest decreasing
- 🤔 Better alternatives available?
- Consider: Survey users for feedback

---

## 🔧 Troubleshooting

### Analytics Not Showing Data

**Check 1: Has Anyone Used Templates?**
- Analytics only track when products are accessed
- Test by visiting: `?product=ProductName`

**Check 2: Script Properties Accessible?**
```javascript
function testScriptProperties() {
  const props = PropertiesService.getScriptProperties();
  const testKey = 'test_key';
  props.setProperty(testKey, 'test_value');
  const result = props.getProperty(testKey);
  Logger.log('Script Properties working: ' + (result === 'test_value'));
  props.deleteProperty(testKey);
}
```

**Check 3: Analytics Sheet Setup**
- If using detailed logging, ensure analytics sheet is created
- Run `adminCreateAnalyticsSheet()` from admin panel

### Export Not Working

**Browser Popup Blocker:**
- Allow popups for the script.google.com domain
- Try export again

**Empty Export:**
- Check if analytics sheet is set up
- Verify access to analytics sheet
- Run `getAccessLogs({})` from editor to test

### Performance Issues

**Too Many Log Entries:**
- Run cleanup: `cleanupAnalyticsLogs()`
- Keeps last 10,000 entries
- Consider exporting before cleanup

**Slow Admin Panel:**
- Large product lists take time to load
- Consider pagination for 100+ products
- Cache analytics summary for faster loads

---

## 🎓 Best Practices

### 1. Regular Monitoring
- Check analytics weekly
- Export monthly reports
- Track trends over time

### 2. Data Cleanup
- Run `cleanupAnalyticsLogs()` quarterly
- Export before cleanup for archival
- Keep last 10,000 entries for performance

### 3. Privacy Protection
- Never share analytics data publicly
- Restrict analytics sheet access
- Document data handling in privacy policy

### 4. Actionable Insights
- Focus on trends, not absolute numbers
- Compare products fairly (age, promotion)
- Use data to guide improvements

### 5. Backup Analytics
- Export CSV regularly
- Store in secure location
- Use for long-term trend analysis

---

## 📞 Support

### Questions About Analytics?

**Documentation:**
- README.md - Overview and features
- ARCHITECTURE.md - Technical implementation
- ADMIN_PANEL_GUIDE.md - Admin panel usage

**Code Reference:**
- `Analytics.gs` - All analytics functions
- `Admin.gs` - Admin panel integration
- `Code.gs` - Tracking integration

**Need Help?**
- Review execution logs in Apps Script editor
- Check `validateConfiguration()` output
- Contact system administrator

---

## 📝 Summary

The analytics system provides valuable insights into template usage while respecting user privacy. Use the admin panel dashboard for quick insights, export CSV for deeper analysis, and leverage the data to improve your template distribution system.

**Key Takeaways:**
- ✅ Privacy-conscious (no PII collected)
- ✅ Non-blocking (never slows redirects)
- ✅ Easy to use (admin panel dashboard)
- ✅ Flexible (lightweight counters or detailed logs)
- ✅ Actionable (clear insights for decision-making)

---

*Last Updated: 2024*
