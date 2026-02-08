---
description: Release the game with automatic version bump, commit, and push
---
1. **Run Release**: `yarn release`
   - Analyzes commits since last release to determine bump type (major/minor/patch)
   - Bumps version in package.json
   - Commits with a generated release message
   - Pre-commit hook runs tests automatically
   - On success, pushes to remote

2. **If Tests Fail**:
   - The version bump is preserved in package.json — do NOT run `yarn release` again or bump the version a second time
   - Read the test output to identify the failures
   - Fix the failing tests (update test expectations, fix broken code, etc.)
   - Run `yarn test` to verify all tests pass
   - Commit and push:
     ```
     git add -A && git commit -m "chore: release vX.Y.Z"
     git push
     ```

3. **Dry Run** (preview without changing anything): `yarn release --dry-run`
