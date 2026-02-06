---
description: Release the game with a single commit including version bump and changes
---
1. Run `yarn release:prepare`.
   - This script analyzes git history to determine the correct semantic version bump (patch, minor, or major).
   - It updates `package.json` automatically.
   - It outputs a comprehensive commit message (including changelog) bounded by `RELEASE_MESSAGE_START` and `RELEASE_MESSAGE_END`.
2. Stage all changes: `git add .`
3. Commit using the generated message from step 1.
   - The message contains the version title and a breakdown of features/fixes.
4. Push to remote: `git push`
   - This triggers the pre-push hook which runs tests (`yarn test`) to ensure quality.
