---
description: Release the game with a single commit including version bump and changes
---
1. Run `yarn release:prepare` to bump the version in package.json without tagging.
   - This increments the patch version by default.
2. Stage all changes: `git add .`
3. Commit with a release message: `git commit -m "chore: release v<VERSION> ..."`
4. Push to remote: `git push`
   - This triggers the pre-push hook which runs tests (`yarn test`) to ensure quality.
