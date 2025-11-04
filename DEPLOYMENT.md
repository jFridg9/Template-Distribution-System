# Deployment Guide

> **Instructions for automating deployment using clasp and GitHub Actions.**

---

## 🚀 Local Development with clasp

### Prerequisites

Install Node.js and clasp:
```powershell
# Install clasp globally
npm install -g @google/clasp

# Verify installation
clasp --version
```

---

### Initial Setup

**1. Login to clasp:**
```powershell
clasp login
```
This opens a browser for Google authentication.

**2. Create a new Apps Script project:**
```powershell
clasp create --type webapp --title "Template Distribution System"
```

Or link to an existing project:
```powershell
# Get your script ID from Apps Script editor (Project Settings)
clasp clone YOUR_SCRIPT_ID
```

**3. Update .clasp.json:**
```json
{
  "scriptId": "YOUR_ACTUAL_SCRIPT_ID",
  "rootDir": "."
}
```

---

### Development Workflow

**Push local changes to Apps Script:**
```powershell
npm run push
```

**Pull remote changes from Apps Script:**
```powershell
npm run pull
```

**Open Apps Script editor in browser:**
```powershell
npm run open
```

**View execution logs:**
```powershell
npm run logs
```

---

## 🤖 CI/CD with GitHub Actions

### Setup GitHub Secrets

The workflow requires two secrets:

**1. CLASP_CREDENTIALS**

Get your clasp credentials:
```powershell
# Windows
Get-Content $env:USERPROFILE\.clasprc.json

# Mac/Linux
cat ~/.clasprc.json
```

Copy the entire JSON content and add it as a GitHub secret:
- Go to your repository → Settings → Secrets and variables → Actions
- Click "New repository secret"
- Name: `CLASP_CREDENTIALS`
- Value: Paste the JSON content

**2. CLASP_PROJECT**

Get your project configuration:
```powershell
Get-Content .clasp.json
```

Copy the JSON and add as secret:
- Name: `CLASP_PROJECT`
- Value: Paste the JSON content (with your actual script ID)

---

### GitHub Actions Workflow

The `.github/workflows/deploy.yml` file automatically deploys on every push to `main`.

**Workflow steps:**
1. Checkout code
2. Install Node.js and dependencies
3. Configure clasp with secrets
4. Push code to Apps Script
5. Deploy new version

**Manual trigger:**
- Go to Actions tab in GitHub
- Select "Deploy to Apps Script"
- Click "Run workflow"

---

## 📋 Deployment Checklist

Before deploying:

- [ ] Test locally in Apps Script editor
- [ ] Run `validateConfiguration()` successfully
- [ ] Update CONFIG values (mode, configSheetId, branding)
- [ ] Verify folder permissions
- [ ] Test web app URL
- [ ] Document version changes

---

## 🔄 Version Management

### Semantic Versioning

Use git tags for version tracking:

```powershell
# Tag a release
git tag -a v1.0.0 -m "Initial release"
git push origin v1.0.0
```

### Apps Script Versions

Create named versions in Apps Script:
- Deploy → Manage deployments
- Click on active deployment → Edit
- Add description: "v1.0.0 - Initial release"

---

## 🆘 Troubleshooting

### "clasp: command not found"

**Fix:** Install clasp globally:
```powershell
npm install -g @google/clasp
```

### "User has not enabled the Apps Script API"

**Fix:**
1. Visit: https://script.google.com/home/usersettings
2. Enable "Google Apps Script API"

### "Push failed: Authorization required"

**Fix:** Re-authenticate:
```powershell
clasp login --creds credentials.json
```

### GitHub Actions failing

**Check:**
- Are secrets set correctly?
- Is script ID valid?
- Does the GitHub account have Apps Script API enabled?

---

**Ready to deploy!** 🎉
