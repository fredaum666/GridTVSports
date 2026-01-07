#!/bin/bash

# iOS App Icon Generator
# Generates all required iOS app icon sizes from source image

set -e

# Configuration
SOURCE_ICON="../../public/assets/icon-512.png"
OUTPUT_DIR="GridTVSports/Assets.xcassets/AppIcon.appiconset"

echo "🎨 Generating iOS App Icons..."

# Check if source exists
if [ ! -f "$SOURCE_ICON" ]; then
    echo "❌ Source icon not found: $SOURCE_ICON"
    echo "Looking for alternative..."
    SOURCE_ICON="../../public/assets/icon-192.png"
    if [ ! -f "$SOURCE_ICON" ]; then
        echo "❌ No source icon found!"
        exit 1
    fi
fi

echo "📁 Source: $SOURCE_ICON"
echo "📁 Output: $OUTPUT_DIR"
echo ""

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Function to generate an icon
generate_icon() {
    local size=$1
    local filename=$2
    local output_path="$OUTPUT_DIR/$filename"

    echo "  Creating ${size}x${size} → $filename"
    sips -z "$size" "$size" "$SOURCE_ICON" --out "$output_path" > /dev/null 2>&1

    if [ $? -eq 0 ]; then
        echo "    ✅ Generated"
    else
        echo "    ❌ Failed"
    fi
}

# Generate all required sizes

# iPhone Notification (iOS 7-15)
generate_icon 40 "icon-20@2x.png"
generate_icon 60 "icon-20@3x.png"

# iPhone Settings (iOS 7-15)
generate_icon 58 "icon-29@2x.png"
generate_icon 87 "icon-29@3x.png"

# iPhone Spotlight (iOS 7-15)
generate_icon 80 "icon-40@2x.png"
generate_icon 120 "icon-40@3x.png"

# iPhone App (iOS 7-15)
generate_icon 120 "icon-60@2x.png"
generate_icon 180 "icon-60@3x.png"

# iPad Notifications (iOS 7-15)
generate_icon 20 "icon-20.png"
generate_icon 40 "icon-20@2x-ipad.png"

# iPad Settings (iOS 7-15)
generate_icon 29 "icon-29.png"
generate_icon 58 "icon-29@2x-ipad.png"

# iPad Spotlight (iOS 7-15)
generate_icon 40 "icon-40.png"
generate_icon 80 "icon-40@2x-ipad.png"

# iPad App (iOS 7-15)
generate_icon 76 "icon-76.png"
generate_icon 152 "icon-76@2x.png"

# iPad Pro App (iOS 9-15)
generate_icon 167 "icon-83.5@2x.png"

# App Store
generate_icon 1024 "icon-1024.png"

echo ""
echo "✨ Icon generation complete!"
echo ""
echo "📊 Generated sizes:"
echo "  • 20x20 (1x, 2x, 3x) - Notifications"
echo "  • 29x29 (1x, 2x, 3x) - Settings"
echo "  • 40x40 (1x, 2x, 3x) - Spotlight"
echo "  • 60x60 (2x, 3x) - iPhone App"
echo "  • 76x76 (1x, 2x) - iPad App"
echo "  • 83.5x83.5 (2x) - iPad Pro"
echo "  • 1024x1024 - App Store"
echo ""
echo "📋 Next steps:"
echo "  1. Open Xcode project"
echo "  2. Select Assets.xcassets in the project navigator"
echo "  3. Select AppIcon"
echo "  4. Icons should be automatically detected"
echo "  5. Clean build folder (⇧⌘K) and rebuild"
