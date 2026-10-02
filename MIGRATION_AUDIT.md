# Migration audit

## Source
Private repository: sushilraey/sushil-s-secure-connect
Head audited: 8c5e7c7b93a93cfc418ddcacdef22f46d4600f00

## Source facts
- The source is a Vite React + TypeScript + Capacitor application.
- Core persistence is local-first and uses localStorage keys prefixed with mml.v1.
- The source defines transactions, categories, payment methods, income sources, tags, parties, loans, repayments and settings.
- Backup schema is v4 and includes a future-proof extras section.
- App lock is biometric/device-credential based and is triggered after the app has been in the background for at least 15 seconds.
- Savings is a dedicated income source with id src-savings.
- Savings-paid expenses are marked fromSavings=true and are excluded from regular income/expense totals.
- Loan net is remaining given minus remaining taken.
- Category-specific tags are preserved.

## New implementation
This repository is a fresh React Native + TypeScript application using Expo. The presentation layer is intentionally new: dark aurora background, translucent glass surfaces, blur, larger touch targets and native Android interaction patterns.

The old repository is not modified by this project.

## Data compatibility
The JSON backup shape and mml.v1 key naming are preserved as the migration contract. Direct localStorage-to-AsyncStorage migration is not automatic because Android apps have different storage containers; import the v4 JSON backup to migrate user data between builds.

## Build
Pushing to main runs the Android debug APK workflow and uploads app-debug.apk as a GitHub Actions artifact.
