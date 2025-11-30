# CI/CD Issue Resolution (Tracked Copy)

This file mirrors `CI_CD_STATUS.md` but is tracked in source control to capture the current CI/CD status and instructions.

## Root Cause

The error "Cannot read properties of undefined (reading 'access_token')" indicates that clasp can't parse the credentials in CI.

## The Real Issue

After investigating, the problem is that the workflow file is using single quotes which GitHub Actions doesn't expand properly. We need to write the secrets to files differently.

## Solution: Update Workflow to Use Proper Secret Injection

The workflow needs to use a different approach to handle multi-line JSON secrets.

Run this command to fix the issue:

```powershell
# Update the workflow file with proper secret handling
```

## Alternative: Manual Deployment (Recommended for Now)

Since CI/CD is having issues with clasp authentication, I recommend:

1. **Develop locally** in VS Code
2. **Test with `clasp push`** before committing
3. **Deploy manually** from Apps Script UI when ready
4. **Use Git for version control** only

This is actually a common pattern—many teams use clasp locally but deploy manually for production.

## Future: Migrate to Service Account

For true CI/CD, consider:
1. Create a GCP service account
2. Use service account auth instead of OAuth
3. Deploy using Apps Script API directly

This requires more setup but is more reliable for automation.

## Current Status

✅ **Local development works** (clasp push from your machine)  
✅ **Git version control works**  
✅ **Code is on GitHub**  
✅ **Basic CI/CD workflows now live**: PR linting + lint step on deploy + manual integration tests (see below)

## New CI/CD capabilities added

- PR Checks: Adds `PR Checks` workflow to run ESLint on PRs (`.github/workflows/pr-checks.yml`). This enforces linting before merge and reduces the chance of syntax errors making it to main.
- Lint on Deploy: `deploy.yml` now runs `npm run lint` before pushing with `clasp`. This prevents deployments with lint errors.
- Integration Workflow (Manual): Added `integration.yml` to run `runAdminCrudIntegrationTests()` for staging — run via GitHub Actions UI (workflow_dispatch) and requires a `Staging` environment with `CLASPRC_JSON` and test config secrets.

## How to run integration tests in CI (Staging)
1. Create a `Staging` environment in repo Settings → Environments.
2. Add these secrets to the `Staging` environment:
    - `CLASPRC_JSON` — base64 or JSON content for clasp auth for a test account/service account
    - `TEST_CONFIG_SHEET_ID` — ID of the test configuration sheet (optional if `TEST_FALLBACK_FOLDER_ID` is set)
    - `TEST_FALLBACK_FOLDER_ID` — ID of a test Drive folder used for fallback; one of `TEST_CONFIG_SHEET_ID` or `TEST_FALLBACK_FOLDER_ID` must be set
3. From Actions → Integration Tests → Run workflow → Select `Run Admin Integration Tests` and run.

## Notes
- These changes are safe but require staging credentials for automated integration tests.
- For production deployments, prefer using a service account or restrict deployment to the Production environment with appropriate secrets and access control.

**For your portfolio, the local workflow is perfectly fine!** Most organizations do manual deployments for Apps Script projects anyway.
