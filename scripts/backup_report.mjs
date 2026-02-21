#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";

function usage() {
  console.log(
    "Usage: node scripts/backup_report.mjs <backup.zip> [--out reports]\n" +
    "Example: node scripts/backup_report.mjs ./spark-wear-backup-2026-02-21.zip --out ./reports"
  );
}

function parseArgs(argv) {
  const args = [...argv];
  if (!args.length || args.includes("--help") || args.includes("-h")) return { help: true };
  const zipPath = args[0];
  let outDir = "reports";
  const outIdx = args.indexOf("--out");
  if (outIdx >= 0 && args[outIdx + 1]) outDir = args[outIdx + 1];
  return { zipPath, outDir };
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

function toCsvRow(values) {
  return values
    .map((v) => {
      const s = String(v ?? "");
      if (!/[",\n]/.test(s)) return s;
      return `"${s.replaceAll('"', '""')}"`;
    })
    .join(",");
}

async function main() {
  const { help, zipPath, outDir } = parseArgs(process.argv.slice(2));
  if (help || !zipPath) {
    usage();
    process.exit(help ? 0 : 1);
  }

  const absZipPath = path.resolve(zipPath);
  const zipRaw = await fs.readFile(absZipPath);
  const zip = await JSZip.loadAsync(zipRaw);

  const manifestEntry = zip.file("manifest.json");
  if (!manifestEntry) {
    throw new Error("manifest.json not found in backup zip");
  }
  const manifest = JSON.parse(await manifestEntry.async("string"));
  const photos = Array.isArray(manifest?.media?.photos) ? manifest.media.photos : [];

  const rows = [];
  let missingFiles = 0;
  for (const photo of photos) {
    const fileName = String(photo?.file || "");
    const entry = fileName ? zip.file(fileName) : null;
    if (!entry) {
      missingFiles += 1;
      rows.push({
        key: String(photo?.key || ""),
        profile: String(photo?.profile || ""),
        mimeType: String(photo?.mimeType || ""),
        file: fileName,
        bytes: 0,
        missing: true,
      });
      continue;
    }
    const u8 = await entry.async("uint8array");
    rows.push({
      key: String(photo?.key || ""),
      profile: String(photo?.profile || ""),
      mimeType: String(photo?.mimeType || ""),
      file: fileName,
      bytes: u8.byteLength,
      missing: false,
    });
  }

  const validSizes = rows.filter((r) => !r.missing).map((r) => r.bytes).sort((a, b) => a - b);
  const totalBytes = validSizes.reduce((a, b) => a + b, 0);
  const avgBytes = validSizes.length ? Math.round(totalBytes / validSizes.length) : 0;
  const p95Bytes = percentile(validSizes, 95);
  const maxBytes = validSizes.length ? validSizes[validSizes.length - 1] : 0;
  const minBytes = validSizes.length ? validSizes[0] : 0;

  const profileStats = new Map();
  for (const row of rows) {
    const k = row.profile || "unknown";
    if (!profileStats.has(k)) profileStats.set(k, { count: 0, bytes: 0 });
    const s = profileStats.get(k);
    s.count += 1;
    s.bytes += row.bytes;
  }

  const outPath = path.resolve(outDir);
  await fs.mkdir(outPath, { recursive: true });
  const stamp = new Date().toISOString().replaceAll(":", "-");
  const csvPath = path.join(outPath, `backup-photo-report-${stamp}.csv`);
  const mdPath = path.join(outPath, `backup-photo-report-${stamp}.md`);

  const csvLines = [
    toCsvRow(["key", "profile", "mime_type", "file", "bytes", "missing"]),
    ...rows.map((r) => toCsvRow([r.key, r.profile, r.mimeType, r.file, r.bytes, r.missing ? "yes" : "no"])),
  ];
  await fs.writeFile(csvPath, `${csvLines.join("\n")}\n`, "utf8");

  const profileLines = Array.from(profileStats.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([profile, s]) => `- ${profile}: ${s.count} 張, ${(s.bytes / 1024).toFixed(1)} KB`)
    .join("\n");

  const md = [
    "# Backup Photo Report",
    "",
    `- Backup: \`${absZipPath}\``,
    `- Exported At: ${manifest?.exportedAt || "N/A"}`,
    `- Total Photo Refs: ${rows.length}`,
    `- Missing Files: ${missingFiles}`,
    `- Valid Files: ${validSizes.length}`,
    `- Total Bytes: ${totalBytes}`,
    `- Avg Bytes: ${avgBytes}`,
    `- P95 Bytes: ${p95Bytes}`,
    `- Min Bytes: ${minBytes}`,
    `- Max Bytes: ${maxBytes}`,
    "",
    "## Profile Breakdown",
    profileLines || "- (no data)",
    "",
    "## Output Files",
    `- CSV: \`${csvPath}\``,
    `- Markdown: \`${mdPath}\``,
    "",
  ].join("\n");

  await fs.writeFile(mdPath, md, "utf8");
  console.log(md);
}

main().catch((err) => {
  console.error("backup_report failed:", err.message || err);
  process.exit(1);
});
