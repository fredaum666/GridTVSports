#!/bin/bash

# GridTV Sports iOS Build Script
# This script builds the iOS app using xcodebuild

set -e

echo "🍎 Building GridTV Sports iOS App..."

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ Error: This script must be run on macOS"
    exit 1
fi

# Check if Xcode is installed
if ! command -v xcodebuild &> /dev/null; then
    echo "❌ Error: Xcode command line tools are not installed"
    echo "Please install Xcode from the App Store"
    exit 1
fi

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="GridTVSports"
SCHEME="${PROJECT_NAME}"
CONFIGURATION="${1:-Debug}"  # Default to Debug, can pass Release as argument

echo "📁 Project directory: ${PROJECT_DIR}"
echo "🔧 Configuration: ${CONFIGURATION}"

cd "${PROJECT_DIR}"

# Clean build folder
echo "🧹 Cleaning build folder..."
xcodebuild clean \
    -project "${PROJECT_NAME}.xcodeproj" \
    -scheme "${SCHEME}" \
    -configuration "${CONFIGURATION}"

# Build for simulator (faster for testing)
echo "📱 Building for iOS Simulator..."
xcodebuild build \
    -project "${PROJECT_NAME}.xcodeproj" \
    -scheme "${SCHEME}" \
    -configuration "${CONFIGURATION}" \
    -sdk iphonesimulator \
    -destination 'platform=iOS Simulator,name=iPhone 15,OS=latest'

echo "✅ Build completed successfully!"
echo ""
echo "To run in simulator:"
echo "  1. Open Xcode"
echo "  2. Open ${PROJECT_NAME}.xcodeproj"
echo "  3. Select a simulator device"
echo "  4. Click the Run button (⌘+R)"
echo ""
echo "To build for device:"
echo "  1. Connect your iPhone via USB"
echo "  2. Open the project in Xcode"
echo "  3. Select your device from the device list"
echo "  4. Sign the app with your Apple ID in Signing & Capabilities"
echo "  5. Click Run (⌘+R)"
