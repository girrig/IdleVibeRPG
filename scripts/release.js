import { execSync } from "child_process";
import fs from "fs";
import path from "path";

function run(command) {
    try {
        return execSync(command, { encoding: "utf8" }).trim();
    } catch (error) {
        console.error(`Command failed: ${command}`);
        throw error;
    }
}

function getLatestReleaseCommit() {
    try {
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

        if (bodyLower.includes("breaking change") || msgLower.includes("breaking change")) {
            changes.breaking.push({ message: rawMsg, body: commit.body });
        }

        const changeObj = { message: rawMsg, body: commit.body };

        if (msgLower.startsWith("feat")) {
            changes.features.push(changeObj);
            if (type === "patch") type = "minor";
        } else if (msgLower.startsWith("fix")) {
            changes.fixes.push(changeObj);
        } else {
            changes.others.push(changeObj);
        }
    }

    if (changes.breaking.length > 0) return { type: "major", changes };
    return { type, changes };
}

function generateReleaseMessage(version, bumpResult) {
    const { changes } = bumpResult;

    let title = `chore: release v${version}`;
    if (changes.features.length > 0) {
        const firstFeat = changes.features[0].message.replace(/^feat:\s*/i, '').trim();
        title += ` - ${firstFeat}`;
        if (changes.features.length > 1) title += ` (+${changes.features.length - 1} features)`;
    } else if (changes.fixes.length > 0) {
        const firstFix = changes.fixes[0].message.replace(/^fix:\s*/i, '').trim();
        title += ` - ${firstFix}`;
        if (changes.fixes.length > 1) title += ` (+${changes.fixes.length - 1} fixes)`;
    } else if (changes.others.length > 0) {
        const firstOther = changes.others[0].message.replace(/^(chore|refactor|style|docs|test|perf|ci|build):\s*/i, '').trim();
        title += ` - ${firstOther}`;
        if (changes.others.length > 1) title += ` (+${changes.others.length - 1} others)`;
    }

    let body = `${title}\n\n`;

    const formatChange = (change) => {
        let text = `- ${change.message}`;
        if (change.body && change.body.trim().length > 0) {
            const indentedBody = change.body.trim().split('\n').map(line => `  ${line}`).join('\n');
            text += `\n${indentedBody}`;
        }
        return text + '\n';
    };

    if (changes.breaking.length > 0) {
        body += `## Breaking Changes\n`;
        changes.breaking.forEach(change => body += formatChange(change));
        body += `\n`;
    }

    if (changes.features.length > 0) {
        body += `## Features\n`;
        changes.features.forEach(change => body += formatChange(change));
        body += `\n`;
    }

    if (changes.fixes.length > 0) {
        body += `## Bug Fixes\n`;
        changes.fixes.forEach(change => body += formatChange(change));
        body += `\n`;
    }

    if (changes.others.length > 0 && (changes.features.length + changes.fixes.length < 3)) {
        body += `## Maintenance & Other\n`;
        changes.others.forEach(change => body += formatChange(change));
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

function bumpSemver(version, type) {
    const [major, minor, patch] = version.split('.').map(Number);
    switch (type) {
        case 'major': return `${major + 1}.0.0`;
        case 'minor': return `${major}.${minor + 1}.0`;
        default: return `${major}.${minor}.${patch + 1}`;
    }
}

function main() {
    const args = process.argv.slice(2);
    const isDryRun = args.includes("--dry-run");

    // Ensure working tree is clean before releasing
    if (!isDryRun) {
        const status = run("git status --porcelain");
        if (status.length > 0) {
            console.error("Working tree is dirty. Commit or stash your changes before releasing.");
            process.exit(1);
        }
    }

    console.log("Analyzing commits...");

    const lastReleaseHash = getLatestReleaseCommit();
    const commits = getCommitsSince(lastReleaseHash);

    if (commits.length === 0) {
        console.log("No new commits since last release.");
        return;
    }

    console.log(`Found ${commits.length} commits since last release.`);

    const bumpResult = determineBump(commits);
    console.log(`Bump type: ${bumpResult.type.toUpperCase()}`);

    const currentVer = JSON.parse(fs.readFileSync("package.json", "utf8")).version;

    if (isDryRun) {
        const nextVer = bumpSemver(currentVer, bumpResult.type);
        const msg = generateReleaseMessage(nextVer, bumpResult);
        console.log(`\n[Dry Run] ${currentVer} -> ${nextVer}\n`);
        console.log("--- Commit Message Preview ---");
        console.log(msg);
        return;
    }

    // Bump version in package.json
    const newVersionRaw = execSync(`npm version ${bumpResult.type} --no-git-tag-version`, { encoding: 'utf8' }).trim();
    const newVersion = newVersionRaw.replace(/^v/, '');
    console.log(`Version bumped: ${currentVer} -> ${newVersion}`);

    const msg = generateReleaseMessage(newVersion, bumpResult);

    // Stage only the file we changed
    console.log("Staging package.json...");
    run("git add package.json");

    // Write commit message to temp file (handles multiline safely)
    const tempMsgPath = path.resolve(".git/RELEASE_MSG_TMP");
    fs.writeFileSync(tempMsgPath, msg, "utf8");

    try {
        console.log("Committing (pre-commit tests will run)...");
        run(`git commit -F "${tempMsgPath}"`);
        console.log(`Committed release v${newVersion}`);
    } catch (commitError) {
        console.error("\nCommit failed — likely pre-commit tests.");
        console.error("The version bump is preserved in package.json.");
        console.error("Fix the failing tests, then:");
        console.error("  git add -A && git commit -m \"chore: release v" + newVersion + "\"");
        console.error("  git push");
        process.exit(1);
    } finally {
        if (fs.existsSync(tempMsgPath)) fs.unlinkSync(tempMsgPath);
    }

    // Push automatically after successful commit
    try {
        console.log("Pushing...");
        run("git push");
        console.log(`Release v${newVersion} pushed.`);
    } catch (pushError) {
        console.error("Push failed. You can retry with: git push");
        process.exit(1);
    }
}

main();
