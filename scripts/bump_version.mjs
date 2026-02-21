#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const PKG_PATH = path.join(ROOT, "package.json");
const APP_JS_PATH = path.join(ROOT, "app.js");
const ANDROID_GRADLE_PATH = path.join(ROOT, "android", "app", "build.gradle");

function bumpPatch(version) {
  const m = String(version || "").match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!m) throw new Error(`Invalid semver version: ${version}`);
  const major = Number(m[1]);
  const minor = Number(m[2]);
  const patch = Number(m[3]) + 1;
  return `${major}.${minor}.${patch}`;
}

async function main() {
  const pkgRaw = await fs.readFile(PKG_PATH, "utf8");
  const pkg = JSON.parse(pkgRaw);
  const nextVersion = bumpPatch(pkg.version);
  pkg.version = nextVersion;
  await fs.writeFile(PKG_PATH, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");

  const gradleRaw = await fs.readFile(ANDROID_GRADLE_PATH, "utf8");
  const versionCodeMatch = gradleRaw.match(/versionCode\s+(\d+)/);
  if (!versionCodeMatch) throw new Error("versionCode not found in android/app/build.gradle");
  const nextCode = Number(versionCodeMatch[1]) + 1;
  const gradleUpdated = gradleRaw
    .replace(/versionCode\s+\d+/, `versionCode ${nextCode}`)
    .replace(/versionName\s+"[^"]+"/, `versionName "${nextVersion}"`);
  await fs.writeFile(ANDROID_GRADLE_PATH, gradleUpdated, "utf8");

  const appJsRaw = await fs.readFile(APP_JS_PATH, "utf8");
  const nextLabel = `v${nextVersion}+${nextCode}`;
  const appJsUpdated = appJsRaw.replace(
    /const APP_VERSION_LABEL = "[^"]+";/,
    `const APP_VERSION_LABEL = "${nextLabel}";`
  );
  await fs.writeFile(APP_JS_PATH, appJsUpdated, "utf8");

  console.log(`Version bumped: ${nextLabel}`);
}

main().catch((err) => {
  console.error("bump_version failed:", err.message || err);
  process.exit(1);
});
