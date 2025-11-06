# Forge Security Guidance

## Local Memory Storage

- Local memory is stored at `~/.forge_memory/`
- **Do not commit those files to GitHub.**
- If you choose to back up memory, use strong encryption and a private repository.
- Rotate credentials regularly and enable 2FA on your GitHub account.

## Best Practices

1. **Keep secrets out of memory files** - Never store API keys, passwords, or tokens in project-cache.json or vector-db.json
2. **Use .gitignore** - Ensure `~/.forge_memory/` is never accidentally committed to version control
3. **Encrypt backups** - If syncing memory to GitHub or cloud storage, encrypt it first using tools like GPG or age
4. **Regular audits** - Periodically review your memory files to ensure no sensitive data has been stored
5. **Access control** - Keep your local machine secure with disk encryption and strong authentication

## Memory File Format

Memory files use JSON format and should contain only:
- Non-sensitive project patterns
- Code snippets (without secrets)
- Architecture decisions
- Lessons learned
- General workflow notes

## If Memory is Compromised

1. Delete the compromised memory files
2. Rotate any credentials that might have been exposed
3. Review commit history if files were accidentally pushed to Git
4. Use `git filter-branch` or BFG Repo-Cleaner to remove sensitive data from Git history if needed
