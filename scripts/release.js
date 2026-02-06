import { execSync } from "child_process";
import fs from "fs";
import path from "path";

function run(command) {
    try {
        return execSync(command, { encoding: "utf8" }).trim();
    } catch (error) {
        console.error(`Command failed: ${command}`);
        process.exit(1);
    }
}

function getLatestReleaseCommit() {
    try {
        // Look for the last commit starting with "chore: release"
        // git log --grep="chore: release" -n 1 --format="%H"
        return run('git log --grep="chore: release" -n 1 --format="%H"');
    } catch (e) {
        console.warn("No previous release found. Defaulting to all history.");
        return null;
    }
}

function determineBump(commits) {
    let type = "patch";
    const changes = {
        features: [],
        fixes: [],
        others: [],
        breaking: []
    };

    for (const commit of commits) {
        const rawMsg = commit.message.trim();
        const msgLower = rawMsg.toLowerCase();
        const bodyLower = commit.body.toLowerCase();

        // Check for breaking changes
        if (bodyLower.includes("breaking change") || msgLower.includes("breaking change")) {
            changes.breaking.push(rawMsg);
            // We return 'major' but keep collecting for the log
        }

        if (msgLower.startsWith("feat")) {
            changes.features.push(rawMsg);
            if (type === "patch") type = "minor";
        } else if (msgLower.startsWith("fix")) {
            changes.fixes.push(rawMsg);
        } else {
            changes.others.push(rawMsg);
        }
    }

    if (changes.breaking.length > 0) return { type: "major", changes };
    return { type, changes };
}

function generateReleaseMessage(version, bumpResult) {
    const { type, changes } = bumpResult;
    const date = new Date().toISOString().split('T')[0];

    // Title generation
    let title = `chore: release v${version}`;
    if (changes.features.length > 0) {
        // Use the first feature as part of title if it fits
        const firstFeat = changes.features[0].replace(/^feat:\s*/i, '').trim();
        title += ` - ${firstFeat}`;
        if (changes.features.length > 1) title += ` (+${changes.features.length - 1} features)`;
    } else if (changes.fixes.length > 0) {
        const firstFix = changes.fixes[0].replace(/^fix:\s*/i, '').trim();
        title += ` - ${firstFix}`;
        if (changes.fixes.length > 1) title += ` (+${changes.fixes.length - 1} fixes)`;
    } else if (changes.others.length > 0) {
        // Fallback: use the first 'other' change for context if no features/fixes
        // remove common prefixes for cleaner title
        const firstOther = changes.others[0].replace(/^(chore|refactor|style|docs|test|perf|ci|build):\s*/i, '').trim();
        title += ` - ${firstOther}`;
        if (changes.others.length > 1) title += ` (+${changes.others.length - 1} others)`;
    }

    let body = `${title}\n\n`;

    if (changes.breaking.length > 0) {
        body += `## 🚨 Breaking Changes\n`;
        changes.breaking.forEach(m => body += `- ${m}\n`);
        body += `\n`;
    }

    if (changes.features.length > 0) {
        body += `## ✨ Features\n`;
        changes.features.forEach(m => body += `- ${m}\n`);
        body += `\n`;
    }

    if (changes.fixes.length > 0) {
        body += `## 🐛 Bug Fixes\n`;
        changes.fixes.forEach(m => body += `- ${m}\n`);
        body += `\n`;
    }

    // Only add 'Other' if it's substantial or empty other categories
    if (changes.others.length > 0 && (changes.features.length + changes.fixes.length < 3)) {
        body += `## 🔧 Maintenance & Other\n`;
        changes.others.forEach(m => body += `- ${m}\n`);
    }

    return body.trim();
}

function getCommitsSince(hash) {
    const range = hash ? `${hash}..HEAD` : "HEAD";
    const separator = "------------------------";
    const logOutput = run(`git log ${range} --format="%s%n%b${separator}"`);

    return logOutput.split(separator)
        .map(block => block.trim())
        .filter(block => block.length > 0)
        .map(block => {
            const [message, ...bodyParts] = block.split("\n");
            return { message, body: bodyParts.join("\n") };
        });
}

function main() {
    console.log("🔍 Analyzing semantic versioning...");

    const lastReleaseHash = getLatestReleaseCommit();
    const commits = getCommitsSince(lastReleaseHash);

    if (commits.length === 0) {
        console.log("No new commits since last release.");
        return;
    }

    console.log(`Found ${commits.length} commits since last release.`);

    const bumpResult = determineBump(commits);
    console.log(`Recommended bump: ${bumpResult.type.toUpperCase()}`);

    const args = process.argv.slice(2);
    // console.log("DEBUG: args", args);
    const isDryRun = args.includes("--dry-run");

    if (isDryRun) {
        console.log("[Dry Run] Would run:");
        console.log(`> npm version ${bumpResult.type} --no-git-tag-version`);
        // Simulate next version for dry run message
        const currentVer = JSON.parse(fs.readFileSync("package.json")).version;
        const msg = generateReleaseMessage(currentVer + "-next", bumpResult);
        console.log("\n--- Generated Message Preview ---");
        console.log(msg);

    } else {
        // Run the npm version command
        try {
            // Output bump info for parsing
            console.log(`BUMP_TYPE:${bumpResult.type}`);

            // bump version
            const newVersionRaw = execSync(`npm version ${bumpResult.type} --no-git-tag-version`, { encoding: 'utf8' }).trim();
            const newVersion = newVersionRaw.replace(/^v/, '');

            const msg = generateReleaseMessage(newVersion, bumpResult);

            const shouldCommit = args.includes("--commit");

            if (shouldCommit) {
                console.log("💾 Staging changes...");
                run("git add .");

                console.log("💾 Committing...");

                // Check if we should amend the previous commit
                const isAmend = args.includes("--amend");

                // Create temp file for commit message
                const tempMsgParams = path.resolve(".git/RELEASE_MSG_TMP");
                fs.writeFileSync(tempMsgParams, msg, "utf8");

                try {
                    if (isAmend) {
                        // When amending, we want to update the commit message to the release message
                        // and include the staged version bump files
                        run(`git commit --amend -F "${tempMsgParams}" --no-edit`);
                        console.log(`✅ Amend-committed release v${newVersion}`);
                    } else {
                        run(`git commit -F "${tempMsgParams}"`);
                        console.log(`✅ Committed release v${newVersion}`);
                    }
                } catch (commitError) {
                    console.error("❌ Commit failed (likely due to pre-commit tests). Reverting version bump...");
                    try {
                        run("git checkout package.json package-lock.json");
                        console.log("🔄 Version bump reverted. Fixed the issues and try again.");
                    } catch (revertError) {
                        console.error("⚠️ Failed to revert version bump:", revertError);
                    }
                    throw commitError;
                } finally {
                    if (fs.existsSync(tempMsgParams)) fs.unlinkSync(tempMsgParams);
                }

            } else {
                // Legacy output for shell parsing
                console.log("RELEASE_MESSAGE_START");
                console.log(msg);
                console.log("RELEASE_MESSAGE_END");
            }

        } catch (e) {
            console.error("Failed to bump version.", e);
            process.exit(1);
        }
    }
}

main();
