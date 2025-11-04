# Apps Script CI/CD Setup Guide for AI Agents

> **Purpose:** This prompt helps AI agents set up GitHub Actions CI/CD for Google Apps Script projects correctly on the first try, avoiding common authentication pitfalls.

## Critical Success Factors

### 1. Authentication Approach ✅

**What Works:**
- User OAuth tokens via `CLASPRC_JSON` secret
- Tokens stored in GitHub Environment (not repo-level secrets)
- `.clasp.json` committed to repo (contains scriptId, rootDir, oauthClientId)
- Workflow writes credentials to `~/.clasprc.json` at runtime

**What DOESN'T Work:**
- ❌ Service accounts (Apps Script API requires user OAuth for deployments)
- ❌ Overwriting `.clasp.json` from secrets (breaks oauthClientId)
- ❌ Using `echo` to write JSON (breaks on special characters)
- ❌ Repo-level secrets without environment protection

### 2. GitHub Environment Setup 🔐

**Required Steps:**
1. Create a GitHub Environment named `Production` (Settings → Environments)
2. (Optional) Add required reviewers for approval gates
3. Add `CLASPRC_JSON` as an **environment secret** (not repo secret)
4. Reference environment in workflow: `environment: { name: Production }`

**Why Environment vs Repo Secret?**
- Adds approval gates before exposing credentials
- Better audit trail
- Restricts who can trigger deployments
- Follows security best practices

### 3. Secret Structure 📋

**Only ONE secret is required: `CLASPRC_JSON`**

```json
{
  "tokens": {
    "default": {
      "client_id": "...",
      "client_secret": "...",
      "type": "authorized_user",
      "refresh_token": "...",
      "access_token": "...",
      "token_type": "Bearer",
      "expiry_date": 1234567890,
      "id_token": "..."
    }
  }
}
```

**How to obtain:**
```powershell
# Windows
Get-Content $env:USERPROFILE\.clasprc.json

# Mac/Linux
cat ~/.clasprc.json
```

**Common Mistakes:**
- ❌ Creating separate `CLASP_CREDENTIALS` and `CLASP_PROJECT` secrets
- ❌ Storing `.clasp.json` contents as a secret
- ❌ Manually constructing the JSON structure
- ✅ Copy the ENTIRE `~/.clasprc.json` file contents as-is

### 4. Workflow File Pattern 📄

**Key elements of a working workflow:**

```yaml
name: Deploy to Apps Script

on:
  push:
    branches: [main]
  workflow_dispatch: {}

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    # CRITICAL: Use environment, not repo-level secrets
    environment:
      name: Production
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci || npm install --no-audit --prefer-offline
      
      # CRITICAL: Use printf, not echo (handles special chars)
      - name: Authenticate clasp
        env:
          CLASPRC_JSON: ${{ secrets.CLASPRC_JSON }}
        run: |
          printf '%s' "$CLASPRC_JSON" > ~/.clasprc.json
          chmod 600 ~/.clasprc.json
      
      # CRITICAL: Use npx @google/clasp for consistency
      - name: Deploy
        run: |
          rm -rf node_modules || true
          npx -y @google/clasp push --force
      
      # CRITICAL: Always cleanup credentials
      - name: Cleanup
        if: always()
        run: rm -f ~/.clasprc.json
```

**Critical Details:**
- Use `printf '%s'` NOT `echo` (handles special characters correctly)
- Use `npx -y @google/clasp` NOT global `clasp` (version consistency)
- Use `--force` flag on push (ensures local code replaces remote)
- Remove `node_modules` before push (prevents non-Apps-Script files)
- Always cleanup credentials with `if: always()`

### 5. Repository File Structure 📁

**What should be committed:**
```
.clasp.json          ← YES, commit this (contains scriptId)
.claspignore         ← YES (controls what gets pushed)
package.json         ← YES (dev dependencies)
*.gs files           ← YES (Apps Script code)
appsscript.json      ← YES (manifest)
```

**What should be .gitignored:**
```
.clasprc.json        ← NEVER commit (contains OAuth tokens)
node_modules/        ← NEVER commit
.husky/              ← Can commit or ignore
```

**Sample `.clasp.json`:**
```json
{
  "scriptId": "YOUR_ACTUAL_SCRIPT_ID_HERE",
  "rootDir": ".",
  "oauthClientId": "optional_but_recommended"
}
```

### 6. Common Errors & Solutions 🐛

**Error: "Cannot read properties of undefined (reading 'access_token')"**
- **Cause:** Invalid JSON in `CLASPRC_JSON` secret
- **Fix:** Re-run `clasp login --no-localhost` and copy fresh tokens
- **Prevention:** Copy entire file contents, don't manually construct JSON

**Error: "User has not enabled the Apps Script API"**
- **Cause:** Apps Script API not enabled for the authenticated account
- **Fix:** Visit https://script.google.com/home/usersettings and enable it
- **Prevention:** Document this requirement in setup instructions

**Error: "Script not found"**
- **Cause:** Wrong `scriptId` in `.clasp.json` or account lacks access
- **Fix:** Verify scriptId and check account permissions
- **Prevention:** Test `clasp push` locally before setting up CI/CD

**Error: Workflow can't find secrets**
- **Cause:** Secrets in wrong location (repo vs environment)
- **Fix:** Move secrets to the `Production` environment
- **Prevention:** Always use environments for sensitive secrets

**Error: "Permission denied" when pushing**
- **Cause:** Authenticated account doesn't have edit access to script
- **Fix:** Grant editor access or use correct account
- **Prevention:** Document which account should run `clasp login`

### 7. Security Best Practices 🔒

**Secret Rotation:**
```powershell
# Rotate tokens every 30 days
clasp logout
clasp login --no-localhost
Get-Content $env:USERPROFILE\.clasprc.json
# Update CLASPRC_JSON in GitHub Production environment
```

**Access Control:**
- Use GitHub Environments with required reviewers
- Limit who can edit environment secrets (admins only)
- Enable branch protection on main
- Require PR reviews before merging workflow changes

**Audit Trail:**
- Monitor GitHub Actions logs
- Check Apps Script execution logs
- Set up notifications for failed deployments

### 8. Setup Checklist for New Repos ✅

Use this checklist when setting up a new Apps Script repo:

**Local Setup:**
- [ ] Run `clasp login --no-localhost` (if not already logged in)
- [ ] Run `clasp create` or `clasp clone SCRIPT_ID`
- [ ] Verify `.clasp.json` exists with correct scriptId
- [ ] Add `.clasprc.json` to `.gitignore`
- [ ] Test `clasp push` works locally
- [ ] Commit `.clasp.json` to git

**GitHub Setup:**
- [ ] Create repository and push code
- [ ] Create `Production` environment (Settings → Environments)
- [ ] Add `CLASPRC_JSON` as environment secret (copy from `~/.clasprc.json`)
- [ ] (Optional) Add required reviewers to Production environment
- [ ] Enable Apps Script API at https://script.google.com/home/usersettings

**Workflow Setup:**
- [ ] Copy working workflow from this repo or another successful one
- [ ] Verify `environment: { name: Production }` is set
- [ ] Verify using `printf '%s'` not `echo` for credentials
- [ ] Verify using `npx -y @google/clasp` not global clasp
- [ ] Verify cleanup step has `if: always()`

**Testing:**
- [ ] Push to main branch
- [ ] Watch GitHub Actions run (Actions tab)
- [ ] Verify workflow completes successfully
- [ ] Check Apps Script editor to confirm code updated
- [ ] Test a subsequent push to verify repeatability

**Documentation:**
- [ ] Add `GITHUB_SECRETS_SETUP.md` with instructions
- [ ] Document which account is authenticated
- [ ] Include troubleshooting section
- [ ] Add security rotation policy

### 9. AI Agent Instructions 🤖

When asked to set up Apps Script CI/CD:

1. **Ask first:** "Have you run `clasp login --no-localhost` locally?"
2. **Verify:** Check if `.clasp.json` exists and has scriptId
3. **Environment:** Always use GitHub Environment, not repo secrets
4. **Workflow:** Use the pattern from section 4 (printf, npx, cleanup)
5. **Documentation:** Create setup guide with actual commands
6. **Test plan:** Include verification steps before marking complete
7. **Security:** Document rotation policy in setup guide

**Template Response:**
```
I'll set up GitHub Actions CI/CD for your Apps Script project. 

First, let me verify:
1. Have you run `clasp login --no-localhost` locally?
2. Does `.clasp.json` exist in your repo with a scriptId?

I'll create:
- GitHub Environment called "Production"
- Workflow file using proven authentication pattern
- Setup documentation with your specific script details
- Troubleshooting guide

The workflow will:
✅ Use environment secrets (not repo secrets)
✅ Handle credentials safely with printf
✅ Use npx for consistent clasp version
✅ Clean up credentials after deployment
```

### 10. Reference Links 📚

**Official Documentation:**
- Apps Script API: https://developers.google.com/apps-script/api
- clasp: https://github.com/google/clasp
- GitHub Environments: https://docs.github.com/en/actions/deployment/targeting-different-environments

**Working Examples:**
- This repository's workflow: `.github/workflows/deploy.yml`
- Setup guide: `GITHUB_SECRETS_SETUP.md`

**Common Pitfalls Blog Posts:**
- "Why Service Accounts Don't Work for Apps Script Deployments"
- "The printf vs echo Problem in GitHub Actions"
- "Why .clasp.json Should Be Committed"

---

## Quick Start Command

Copy-paste this into chat when starting a new Apps Script CI/CD setup:

```
Set up GitHub Actions CI/CD for this Apps Script project following the proven pattern:

1. Create Production environment (not repo secrets)
2. Use CLASPRC_JSON from ~/.clasprc.json as environment secret
3. Use printf (not echo) to write credentials in workflow
4. Use npx @google/clasp (not global)
5. Commit .clasp.json, gitignore .clasprc.json
6. Add cleanup step with if: always()

Reference: .github/prompts/apps-script-cicd-setup.md in this repo for detailed pattern.
```

---

## Version History

- **v1.0** (2025-11-04): Initial version based on lessons learned from Template Distribution System and Google Workspace Admin Console repos

---

**Save yourself hours of debugging—follow this guide exactly!** 🚀
