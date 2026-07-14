---
description: Build Android release APK and install to connected device via ADB.
---

Build Android release APK and install it to the connected device.

## Environment setup (required every time — Bash tool does not inherit ~/.zprofile)

```
JAVA_HOME=/opt/homebrew/Cellar/openjdk@21/21.0.10/libexec/openjdk.jdk/Contents/Home
ADB=/Users/mimi/Library/Android/sdk/platform-tools/adb
APK=android/app/build/outputs/apk/release/app-release.apk
```

## Steps

1. Run the build in the background:
```bash
export JAVA_HOME="/opt/homebrew/Cellar/openjdk@21/21.0.10/libexec/openjdk.jdk/Contents/Home" && export PATH="$JAVA_HOME/bin:$PATH:/Users/mimi/Library/Android/sdk/platform-tools" && npx expo run:android --variant release 2>&1
```

2. Wait for build to complete.

3. Install to device:
```bash
export PATH="$PATH:/Users/mimi/Library/Android/sdk/platform-tools" && adb install -r android/app/build/outputs/apk/release/app-release.apk
```

## Notes
- Connected device ID: `39011FDJH00HUZ`
- If `jlink does not exist` error → wrong JAVA_HOME (do NOT use the VS Code JRE at `~/.antigravity/...`, it's JRE-only)
- If `adb: command not found` → PATH does not include platform-tools, add it explicitly
- APK output path: `android/app/build/outputs/apk/release/app-release.apk`
