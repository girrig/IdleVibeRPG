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

    for (const commit of commits) {
        const msg = commit.message.toLowerCase();
        const body = commit.body.toLowerCase();

        if (body.includes("breaking change") || msg.includes("breaking change")) {
            return "major";
        }

        if (msg.startsWith("feat")) {
            type = "minor";
        }
    }

    return type;
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

    const bumpType = determineBump(commits);
    console.log(`Recommended bump: ${bumpType.toUpperCase()}`);

    const args = process.argv.slice(2);
    const isDryRun = args.includes("--dry-run");

    if (isDryRun) {
        console.log("[Dry Run] Would run:");
        console.log(`> npm version ${bumpType} --no-git-tag-version`);
    } else {
        // Run the npm version command
        try {
            console.log(`Executing: npm version ${bumpType} --no-git-tag-version`);
            execSync(`npm version ${bumpType} --no-git-tag-version`, { stdio: 'inherit' });
        } catch (e) {
            console.error("Failed to bump version.");
            process.exit(1);
        }
    }
}

main();
