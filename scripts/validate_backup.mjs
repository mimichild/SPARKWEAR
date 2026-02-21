#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";

function usage() {
  console.log("Usage: node scripts/validate_backup.mjs <backup.zip>");
}

async function main() {
  const file = process.argv[2];
  if (!file || file === "--help" || file === "-h") {
    usage();
    process.exit(file ? 0 : 1);
  }

  const abs = path.resolve(file);
  const zip = await JSZip.loadAsync(await fs.readFile(abs));
  const manifestEntry = zip.file("manifest.json");
  if (!manifestEntry) throw new Error("manifest.json missing");
  const manifest = JSON.parse(await manifestEntry.async("string"));

  const itemCount = Array.isArray(manifest?.data?.items) ? manifest.data.items.length : 0;
  const logCount = Array.isArray(manifest?.data?.dailyLogs) ? manifest.data.dailyLogs.length : 0;
  const photos = Array.isArray(manifest?.media?.photos) ? manifest.media.photos : [];

  let missing = 0;
  for (const p of photos) {
    const f = String(p?.file || "");
    if (!f || !zip.file(f)) missing += 1;
  }

  const failReasons = [];
  if (manifest?.version !== 2) failReasons.push(`unexpected manifest version: ${manifest?.version}`);
  if (missing > 0) failReasons.push(`missing media files: ${missing}`);

  console.log(`Backup: ${abs}`);
  console.log(`Version: ${manifest?.version}`);
  console.log(`Items: ${itemCount}`);
  console.log(`Outfits: ${logCount}`);
  console.log(`Media refs: ${photos.length}`);
  console.log(`Missing files: ${missing}`);

  if (failReasons.length) {
    console.error(`Validation failed: ${failReasons.join("; ")}`);
    process.exit(2);
  }
  console.log("Validation passed.");
}

main().catch((err) => {
  console.error("validate_backup failed:", err.message || err);
  process.exit(1);
});
