#!/usr/bin/env bash
set -e

# Detect local Wi-Fi IPv4 address on macOS / Linux
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)

if [ -z "$LOCAL_IP" ]; then
  echo "⚠️  Could not automatically detect Wi-Fi IP. Defaulting to 10.0.2.2 (Android Emulator)."
  LOCAL_IP="10.0.2.2"
else
  echo "✅ Detected Local Network IP: $LOCAL_IP"
fi

# Update frontend/.env
echo "VITE_API_BASE_URL=http://${LOCAL_IP}:5001/api" > frontend/.env
echo "VITE_API_URL=http://${LOCAL_IP}:5001/api" >> frontend/.env
echo "📝 Updated frontend/.env with VITE_API_BASE_URL=http://${LOCAL_IP}:5001/api"

# 1. Build frontend
echo "🔨 Building frontend web assets..."
cd frontend
npm run build

# 2. Sync Capacitor
echo "🔄 Syncing Capacitor Android assets..."
npx cap sync android

# 3. Compile APK
echo "📱 Compiling Android debug APK..."
cd android
./gradlew assembleDebug

echo ""
echo "🎉 SUCCESS: Debug APK compiled successfully!"
echo "📍 APK Location: frontend/android/app/build/outputs/apk/debug/app-debug.apk"
