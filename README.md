# Sushil Money Log

A fresh React Native + TypeScript implementation of the Money Log application.

## Source of truth

The private reference application is:
https://github.com/sushilraey/sushil-s-secure-connect

The source repository is the functional and data reference. The new repository deliberately uses a different presentation layer.

## Technology

- React Native 0.86
- Expo SDK 57
- TypeScript
- AsyncStorage for local-first persistence
- Expo Blur for the glass UI
- Expo Local Authentication for app lock
- Expo Contacts for loan contact picking
- Expo Document Picker, File System and Sharing for JSON backup and restore

## Core contract

The app keeps the source application's mml.v1 storage namespace and backup schema v4 concepts so the business/data model remains stable.

## Local development

Run npm install, then npx expo prebuild, then npm run typecheck and npx expo run:android.

## APK

Every push to main runs the Android debug APK workflow. The resulting app-debug.apk is uploaded as a GitHub Actions artifact.

## Design

The UI is intentionally rebuilt as a dark iOS-inspired glass system with translucent cards, blur, aurora background layers, modern spacing, and large touch targets. It is not a visual copy of the source app.
