// Writes version.json at the repo root so a deploy can be verified after the fact.
//
// This site has no build step (Cloudflare Pages just serves the checked-out
// root as static files), so there's no "prebuild" hook to wire this into.
// Run it by hand as the last step before committing a deploy:
//
//   node write-version.mjs && git add version.json
//
// See "Confirming a deploy landed" in CLAUDE.md.
import { writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

function git(cmd, fallback) {
  try {
    return execSync(cmd, { encoding: "utf8" }).trim();
  } catch {
    return fallback;
  }
}

const commit = git("git rev-parse HEAD", "unknown");
const branch = git("git rev-parse --abbrev-ref HEAD", "unknown");

const version = {
  commit,
  shortCommit: commit === "unknown" ? "unknown" : commit.slice(0, 7),
  branch,
  builtAt: new Date().toISOString(),
};

writeFileSync("version.json", JSON.stringify(version, null, 2) + "\n");
console.log(`[write-version] version.json -> ${version.shortCommit} (${version.branch})`);
