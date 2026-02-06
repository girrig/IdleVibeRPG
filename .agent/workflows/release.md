---
description: Release the game with a single commit including version bump and changes
---
1. **Check Git Status & History**:
   - Run `git log -n 1` to see the latest commit.
   - If the latest commit is a feature, fix, or other meaningful change (and NOT already a release commit), plan to use **Single Commit Release**.

2. **Run Release Command**:
   - **Standard Release**: `yarn release:prepare --commit`
   - **Single Commit Release** (Preferred for clean history): `yarn release:prepare --commit --amend`
     - Use this if you just made a commit and want to attach the version bump to it.

3. **Push to Remote**:
   - Run `git push`
   - This triggers the pre-push hook which runs tests (`yarn test`) to ensure quality.
