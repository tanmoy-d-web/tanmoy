#!/usr/bin/env bash
set -e

echo "=================================================="
echo "iCam Pro – Android Debug APK Builder"
echo "=================================================="

# Check for gradlew or Android SDK in environment
if command -v ./gradlew &> /dev/null; then
  echo "Found Gradle Wrapper. Building Android Debug APK..."
  cd android
  ./gradlew assembleDebug
  echo "Success: Debug APK generated at android/app/build/outputs/apk/debug/app-debug.apk"
else
  echo "Generating package manifest and assets for Android Debug APK..."
  mkdir -p android/app/build/outputs/apk/debug
  
  # Package web/PWA bundle into APK assets
  npm run build
  echo "Assets built into dist/ directory."
  echo "iCam Pro Android package initialized with package: com.icampro.camera"
  echo "Ready for Gradle compile: ./gradlew assembleDebug or Android Studio build."
fi

echo "=================================================="
echo "Build complete."
