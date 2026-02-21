# Cross-Platform Backup Validation

This checklist verifies backup portability with real devices:
- Android export -> iOS import
- iOS export -> Android import

## Test Environment
- Date:
- Tester:
- Android device / OS:
- iOS device / OS:
- App build version:

## Dataset Requirements
- At least 100 photos total
- Include portrait + landscape
- Include mixed sources (camera + gallery)
- Include at least 3 categories and 10 outfit logs

## Case A: Android Export -> iOS Import
1. On Android, create/update dataset and ensure photos are visible.
2. Export backup zip from Home -> `匯出資料`.
3. Move zip file to iOS device.
4. On iOS, import zip from Home -> `匯入資料`.
5. Verify:
   - All item photos visible
   - All outfit photos visible
   - No crash during import
   - Missing-photo alert count is 0

Result:
- Pass/Fail:
- Missing count:
- Notes:

## Case B: iOS Export -> Android Import
1. On iOS, create/update dataset and ensure photos are visible.
2. Export backup zip from Home -> `匯出資料`.
3. Move zip file to Android device.
4. On Android, import zip from Home -> `匯入資料`.
5. Verify:
   - All item photos visible
   - All outfit photos visible
   - No crash during import
   - Missing-photo alert count is 0

Result:
- Pass/Fail:
- Missing count:
- Notes:

## Compression Sampling (100 Photos / Platform)
For each platform, export backup zip and run:

```bash
node scripts/backup_report.mjs /path/to/backup.zip --out reports
```

Record:
- Avg bytes
- P95 bytes
- Max bytes
- Missing files

Android Metrics:
- Avg bytes:
- P95 bytes:
- Max bytes:
- Missing files:

iOS Metrics:
- Avg bytes:
- P95 bytes:
- Max bytes:
- Missing files:

## Exit Criteria
- Android -> iOS import: PASS
- iOS -> Android import: PASS
- Missing files: 0 for both cases
- No crash during import
- Compression stats produced for both platforms
