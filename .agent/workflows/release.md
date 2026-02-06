---
description: Release the game with a single commit including version bump and changes
---
1. Run `yarn release:prepare --commit`.
   - This script calculates the version bump, updates `package.json`, generates the changelog, stages all files, and creates the commit.
2. Push to remote: `git push`
   - This triggers the pre-push hook which runs tests (`yarn test`) to ensure quality.
