# Enabling Drive API v3 and Advanced Services

Follow these steps to ensure Drive API v3 is enabled for the Apps Script project and the advanced Drive service is correctly recorded in the local manifest.

Steps (recommended - safe):

1. In the Google Cloud Console (GCP):
   - Select the GCP project that is linked to your Apps Script project (Project Settings in the Apps Script Editor).
   - Go to APIs & Services -> Library -> Search for "Google Drive API" -> Enable it.

2. In the Apps Script Editor UI:
   - Open Extensions -> Advanced Google services
   - Turn "Drive API" ON. (This binds the advanced service to the Apps Script project.)

3. Immediately update your local copy with clasp:
   - Run: `npx @google/clasp pull` or `clasp pull` to fetch the latest Project manifest and settings.
   - This will update `appsscript.json` with the `enabledAdvancedServices` entry that records the advanced Drive service.

4. Commit the manifest and push to GitHub:
   - `git add appsscript.json`
   - `git commit -m "Enable Drive v3 advanced service manifest"
   - `git push origin main`

5. Verify via CI/deploy: (Optional but recommended)
   - Re-run your CI/Deploy pipeline and confirm the published script is associated with the intended GCP project and that the Drive API is enabled.

Notes & Recommendations:
- If you need the project switched between the default Apps Script project and a linked GCP project, be aware that advanced service metadata may differ between projects. Always enable the service in the targeted GCP project.
- After enabling in the UI, run `clasp pull` immediately — otherwise a future `clasp push` (or CI push) may overwrite the local `appsscript.json` and drop advanced service entries if the remote/CI environment uses a different set of metadata.
- `appsscript.json` now includes `enabledAdvancedServices` referencing Drive v3. Keep the manifest synchronized with the project’s UI settings.

Troubleshooting:
- If the advanced Drive API still reports missing, re-check linked GCP project ID in Project Settings and compare with Cloud Console.
- If using shared CI secrets for clasp auth (CLASPRC_JSON), ensure the secrets and credentials are for the correct project.
- Check `checkDriveApiStatus()` in the Admin Panel for quick diagnostics.

If you want, I can add a small CLI script to verify that the GCP project has the Drive API enabled automatically via the `gcloud` CLI.