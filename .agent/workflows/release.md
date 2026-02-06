---
description: Release the game with a single commit including version bump and changes
---
1. Run `yarn release:prepare --commit`.
   - Checks for changes and commits a new version.
   - **Single Commit Release**: If you have committed changes that you want to be the release commit, add `--amend`:
     `yarn release:prepare --commit --amend`
   - This keeps your history clean by combining the version bump with your latest change.
2. Push to remote: `git push`
   - This triggers the pre-push hook which runs tests (`yarn test`) to ensure quality.
