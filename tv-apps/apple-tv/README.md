# GridTV Sports - Apple TV (tvOS) App

A WKWebView wrapper for Apple TV.

## Prerequisites

- Mac with Xcode 15+
- Apple Developer Account ($99/year): https://developer.apple.com/
- Apple TV for testing (or use Simulator)

## Project Setup

1. Open Xcode on your Mac
2. Create New Project > tvOS > App
3. Configure:
   - Product Name: GridTV Sports
   - Bundle Identifier: com.gridtvsports.tv
   - Language: Swift
   - Interface: SwiftUI

4. Copy the Swift files from this folder

## Building & Running

1. Open `GridTVSports.xcodeproj` in Xcode
2. Select Apple TV Simulator or your connected Apple TV
3. Press Cmd+R to build and run

## Key Files

- `ContentView.swift` - Main SwiftUI view with WebView
- `WebView.swift` - WKWebView wrapper for SwiftUI
- `Info.plist` - App permissions and configuration

## Publishing

1. Archive: Product > Archive
2. Distribute App > App Store Connect
3. Submit for review in App Store Connect

https://developer.apple.com/tvos/submit/
