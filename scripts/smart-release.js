import { execSync } from "child_process";

console.log("🔍 Smart Release: Analyzing commits...");

try {
    // 1. Get the latest tag
    let lastTag;
    try {
        lastTag = execSync("git describe --tags --abbrev=0").toString().trim();
    } catch (e) {
        console.log("⚠️ No tags found. Defaulting to initial commit setup.");
        // If no tags, we can't really diff, so we default to PATCH or check all history
        lastTag = "";
    }

    // 2. Get commit messages since last tag
    const range = lastTag ? `${lastTag}..HEAD` : "HEAD";
    const logs = execSync(`git log ${range} --pretty=format:%s`).toString();

    // 3. Determine Bump Type
    let type = "patch";
    if (logs.includes("BREAKING CHANGE")) {
        type = "major";
        console.log("💥 BEDROCK SHATTERED! (Breaking Change detected -> MAJOR)");
    } else if (logs.match(/feat:|feat\(/)) {
        type = "minor";
        console.log("✨ Shiny new features! (feat detected -> MINOR)");
    } else {
        console.log("🐛 Just squashing bugs. (Default -> PATCH)");
    }

    // 4. Bump Version
    console.log(`🚀 Bumping version (${type})...`);
    execSync(`npm version ${type} -m "chore(release): %s"`, { stdio: "inherit" });

    // 5. Push (New Version)
    console.log("📤 Pushing to remote...");
    execSync("git push --no-verify --follow-tags", { stdio: "inherit" });

    console.log("✅ Smart Release Complete!");

    // 6. Kill original push
    console.log("🛑 Cancelling original push (replaced by new push). This error is EXPECTED.");
    process.exit(1);

} catch (error) {
    // If anything failed in our script, let the original push proceed? 
    // Or fail it?
    // Safest is to fail and let user inspect.
    console.error("❌ Smart Release Failed:", error.message);
    process.exit(1);
}
