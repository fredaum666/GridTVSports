#!/bin/bash

# Helper script to find your Mac's IP address for iOS local testing
# Run this to get the IP you need to put in ViewController.swift

echo "🔍 Finding your Mac's IP address for iOS testing..."
echo ""

# Get the active network interface
if command -v ifconfig &> /dev/null; then
    # Get all non-localhost IPs
    IPS=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}')

    if [ -z "$IPS" ]; then
        echo "❌ No network connection found"
        echo ""
        echo "Make sure your Mac is connected to WiFi or Ethernet"
        exit 1
    fi

    echo "✅ Found IP address(es):"
    echo ""
    echo "$IPS" | while read ip; do
        echo "   📍 $ip"
    done

    # Get the first (usually WiFi)
    MAIN_IP=$(echo "$IPS" | head -n 1)

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📝 NEXT STEPS:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "1. Open: GridTVSports/ViewController.swift"
    echo ""
    echo "2. Find line 24 and change it to:"
    echo ""
    echo "   private let localServerIP = \"$MAIN_IP\""
    echo ""
    echo "3. Make sure your iPhone is on the same WiFi network"
    echo ""
    echo "4. Make sure your local server is running:"
    echo "   cd ../../   # Go to main project"
    echo "   npm start"
    echo ""
    echo "5. Build and run in Xcode on your iPhone"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
else
    echo "❌ ifconfig command not found"
    echo ""
    echo "Alternative: Check System Settings > Network"
    echo "Look for your WiFi or Ethernet IP address"
fi
