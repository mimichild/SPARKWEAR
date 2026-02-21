# Heartsonfire Hybrid Setup

This project is prepared for Capacitor-based Android/iOS packaging.

## Current Status
- Web assets sync script is ready.
- Capacitor config is ready (`capacitor.config.json`).
- Android/iOS native targets are **not generated yet** because package install requires network access.

## Prerequisites
- Node.js + npm
- Android Studio (Android SDK)
- Xcode (for iOS, macOS only)
- Network access to install npm packages

## Install Dependencies
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
```

## Prepare Web Assets
```bash
npm run prepare:web
```

## Initialize Native Platforms
```bash
npx cap add android
npx cap add ios
```

## Sync Web + Open Native IDE
```bash
npm run cap:sync
npm run cap:open:android
npm run cap:open:ios
```

## Recommended Next Step
After native projects are created, implement the photo bridge plugin first:
1. `pickImages`
2. `saveImage`
3. `getImageSrc`
4. `deleteImage`
5. `getStorageStats`
