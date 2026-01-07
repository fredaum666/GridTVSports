# App Store Submission Checklist for GridTV Sports

Use this checklist to ensure you have everything ready before submitting your app to the App Store.

## Pre-Submission Requirements

### 1. Apple Developer Account
- [ ] Active Apple Developer Program membership ($99/year)
- [ ] Signed in to App Store Connect (https://appstoreconnect.apple.com)
- [ ] Team Agent or Admin role (required to submit apps)

### 2. App Store Connect Setup
- [ ] Created App ID in Developer Portal
- [ ] Enabled necessary capabilities (Push Notifications, etc.)
- [ ] Created app in App Store Connect
- [ ] Filled in app information (name, subtitle, description)
- [ ] Set pricing and availability

### 3. App Configuration

#### Info.plist Requirements
- [ ] **CFBundleDisplayName** - App display name
- [ ] **CFBundleIdentifier** - Unique bundle identifier (e.g., com.gridtvsports.app)
- [ ] **CFBundleShortVersionString** - Version number (e.g., 1.0)
- [ ] **CFBundleVersion** - Build number (e.g., 1)
- [ ] **NSCameraUsageDescription** - If you use camera (doesn't appear to be needed)
- [ ] **NSPhotoLibraryUsageDescription** - If you access photos (doesn't appear to be needed)
- [ ] **NSUserTrackingUsageDescription** - Required for iOS 14.5+ (see below)
- [ ] **ITSAppUsesNonExemptEncryption** - Set to `false` for standard HTTPS
- [ ] **UIRequiresFullScreen** - Set to `false` to support split-screen on iPad (if supporting iPad)

#### Privacy Permissions
Add these to Info.plist with user-friendly descriptions:

```xml
<key>NSUserTrackingUsageDescription</key>
<string>We use tracking to provide personalized sports content and improve your experience.</string>

<key>ITSAppUsesNonExemptEncryption</key>
<false/>
```

#### App Transport Security (ATS)
Verify your Info.plist allows your domains:
- [ ] HTTPS is used for all network requests (recommended)
- [ ] If HTTP is needed, proper ATS exceptions are configured

### 4. Assets and Media

#### App Icon
- [ ] 1024x1024 PNG for App Store
- [ ] All required icon sizes in Assets.xcassets
- [ ] No transparency
- [ ] No rounded corners (added automatically)

#### Screenshots (REQUIRED)
You must provide screenshots for at least one device size:
- [ ] **6.7" Display** (iPhone 15 Pro Max, 14 Pro Max) - 1290x2796 pixels
- [ ] **6.5" Display** (iPhone 14 Plus, 11 Pro Max) - 1242x2688 pixels
- [ ] **5.5" Display** (iPhone 8 Plus) - 1242x2208 pixels [Optional]

If supporting iPad:
- [ ] **iPad Pro 12.9"** (6th gen) - 2048x2732 pixels
- [ ] **iPad Pro 11"** - 1668x2388 pixels

Screenshot tips:
- Take 3-5 screenshots showing key features
- Use the iOS Simulator to capture exact sizes
- Showcase: login screen, main screen, live streaming, notifications
- Consider adding text overlays to highlight features

#### App Preview Video (Optional but Recommended)
- [ ] 15-30 second video
- [ ] Same dimensions as screenshots
- [ ] Must use actual app footage (no simulations or mockups)
- [ ] Consider adding captions

### 5. Content and Descriptions

#### App Store Listing
- [ ] **App Name** (30 characters max)
- [ ] **Subtitle** (30 characters max)
- [ ] **Description** (up to 4000 characters) - See AppStore-Description.md
- [ ] **Keywords** (100 characters max, comma-separated)
- [ ] **Promotional Text** (170 characters max) - Can be updated without new submission
- [ ] **Support URL** (required)
- [ ] **Marketing URL** (optional)
- [ ] **Privacy Policy URL** (REQUIRED)

#### Version Information
- [ ] **What's New** - Description of this version (4000 characters max)
- [ ] **Version Number** - Must match CFBundleShortVersionString
- [ ] **Build Number** - Must match CFBundleVersion and be unique

### 6. Legal and Compliance

#### Privacy
- [ ] Privacy Policy created and hosted online - See AppStore-PrivacyPolicy.md
- [ ] Privacy Policy URL added to App Store Connect
- [ ] Privacy details filled out in App Store Connect:
  - [ ] Data collection practices
  - [ ] Data usage
  - [ ] Data sharing
  - [ ] User tracking (if applicable)

#### Content Rights
- [ ] You have rights to all content in the app
- [ ] You have rights to stream sports content
- [ ] All third-party libraries are properly licensed
- [ ] Trademark compliance verified

#### Export Compliance
- [ ] Export compliance information prepared - See AppStore-ExportCompliance.md
- [ ] ITSAppUsesNonExemptEncryption added to Info.plist

#### Age Rating
- [ ] Age rating questionnaire completed in App Store Connect
- [ ] For GridTV Sports, likely **4+** (No Objectionable Content)

### 7. Build Preparation

#### Code Signing
- [ ] Distribution certificate created in Developer Portal
- [ ] Distribution provisioning profile created
- [ ] Xcode configured with correct team and signing settings
- [ ] Automatic signing enabled (recommended) OR manual signing configured

#### Archive Settings
- [ ] Build configuration set to **Release**
- [ ] Architecture includes **arm64** (standard for iOS)
- [ ] Bitcode disabled (no longer required as of Xcode 14)
- [ ] Deployment target set appropriately (iOS 13.0+ based on your code)

#### Testing
- [ ] App tested on physical device (not just simulator)
- [ ] All features working correctly
- [ ] No crashes or major bugs
- [ ] Push notifications working
- [ ] Network connectivity handled gracefully
- [ ] Login/authentication working
- [ ] Video streaming working

### 8. Archive and Upload

#### Create Archive
1. [ ] Open Xcode
2. [ ] Select "Any iOS Device" or a real device (not simulator)
3. [ ] Product > Archive
4. [ ] Wait for archive to complete

#### Upload to App Store Connect
1. [ ] Window > Organizer
2. [ ] Select your archive
3. [ ] Click "Distribute App"
4. [ ] Choose "App Store Connect"
5. [ ] Select distribution options:
   - [ ] Upload symbols (recommended)
   - [ ] Manage version and build number (recommended)
6. [ ] Click "Upload"
7. [ ] Wait for upload and processing (can take 15-60 minutes)

#### Alternative: Upload via Transporter
- [ ] Export .ipa from Xcode Organizer
- [ ] Use Transporter app to upload
- [ ] Verify upload in App Store Connect

### 9. App Store Connect Final Steps

#### Build Selection
- [ ] Wait for build to finish processing (check email)
- [ ] Go to App Store Connect
- [ ] Select your app
- [ ] Go to "App Store" tab
- [ ] Click "+" next to "Build"
- [ ] Select your uploaded build

#### Final Review
- [ ] All required fields filled out
- [ ] Screenshots uploaded for required device sizes
- [ ] Privacy policy URL working
- [ ] Support URL working
- [ ] Export compliance answered (or configured in Info.plist)

#### Submit for Review
- [ ] Click "Add for Review" or "Submit for Review"
- [ ] Answer any additional questions
- [ ] Provide demo account credentials if login is required
- [ ] Add review notes if needed (e.g., how to test features)

### 10. Review Notes for Apple

When submitting, include notes for the review team:

```
Demo Account:
Username: demo@gridtvsports.com
Password: [provide test password]

Testing Instructions:
1. Log in with the provided credentials
2. Navigate to the sports schedule
3. Select any live game to view streaming
4. Test push notifications (if possible during review)

Additional Notes:
- Internet connection required for all features
- Content is streamed from our servers at gridtvsports.com
- Push notifications require user permission
```

## Post-Submission

### During Review
- [ ] Monitor email for updates from App Store Connect
- [ ] Respond quickly to any questions from Apple
- [ ] App status: "Waiting for Review" → "In Review" → "Pending Developer Release" or "Ready for Sale"

### Review Timeline
- Typical review time: 24-48 hours
- Can be longer during holidays or busy periods
- Check status at: https://developer.apple.com/app-store/review/

### If Rejected
- [ ] Read rejection reason carefully
- [ ] Address all issues mentioned
- [ ] Make necessary changes
- [ ] Upload new build if code changes needed
- [ ] Resubmit with explanation of changes

### If Approved
- [ ] Choose automatic or manual release
- [ ] App appears on App Store within 24 hours of approval
- [ ] Celebrate! 🎉

## Common Rejection Reasons to Avoid

1. **Missing Privacy Policy** - Must be accessible and specific to your app
2. **Demo Account Issues** - Provide working credentials if login is required
3. **Broken Links** - All URLs must work
4. **Crashes** - Test thoroughly before submitting
5. **Missing Functionality** - App must be complete
6. **Misleading Metadata** - Screenshots and description must match actual app
7. **Content Rights** - Must prove you have rights to stream content
8. **IPV6 Compatibility** - Ensure app works on IPv6-only networks
9. **User Tracking** - Must include NSUserTrackingUsageDescription for iOS 14.5+
10. **Push Notification Permission** - Must explain why you need notifications

## Helpful Commands

### Check your app's Info.plist
```bash
# Navigate to your app target
plutil -p YourApp/Info.plist
```

### Verify bundle identifier
```bash
# Check what bundle ID is used
xcodebuild -showBuildSettings -scheme YourScheme | grep PRODUCT_BUNDLE_IDENTIFIER
```

### List available provisioning profiles
```bash
security find-identity -v -p codesigning
```

## Resources

- **App Store Connect:** https://appstoreconnect.apple.com
- **Developer Portal:** https://developer.apple.com/account
- **App Store Review Guidelines:** https://developer.apple.com/app-store/review/guidelines/
- **Human Interface Guidelines:** https://developer.apple.com/design/human-interface-guidelines/
- **App Store Connect Help:** https://help.apple.com/app-store-connect/

---

**Good luck with your submission! 🚀**

If you encounter any issues, check the Apple Developer Forums or contact Apple Developer Support.
