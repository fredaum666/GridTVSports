# GridTV Sports - Samsung Tizen TV App

WebView-based wrapper app for Samsung Smart TVs running Tizen OS.

## Requirements

- **Tizen Studio** (latest version)
- Samsung Developer Account
- Samsung TV for testing (or Tizen TV Emulator)

## Project Structure

```
samsung-tizen/
├── config.xml      # App configuration and permissions
├── index.html      # Main app wrapper (loads web app in iframe)
├── icon.png        # App icon (512x512 recommended)
└── README.md
```

## Setup Instructions

### 1. Install Tizen Studio

Download from: https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/installing-tv-sdk.html

### 2. Create App Icon

Create a `icon.png` file (512x512 pixels) with the GridTV Sports logo.

### 3. Import Project

1. Open Tizen Studio
2. File > Import > Tizen > Tizen Project
3. Select this folder as the project directory
4. Choose "TV" as the profile

### 4. Configure Signing

1. Tools > Certificate Manager
2. Create a Samsung Certificate (requires Samsung Developer account)
3. Create an Author Certificate
4. Create a Distributor Certificate

### 5. Build the App

1. Right-click project > Build Signed Package
2. This creates a `.wgt` file for distribution

## Testing

### On TV Emulator
1. Tools > Emulator Manager
2. Create a TV emulator
3. Run > Run As > Tizen TV Application

### On Physical TV
1. Enable Developer Mode on your Samsung TV:
   - Go to Apps
   - Enter "12345" on the remote
   - Enable Developer Mode
   - Set your PC's IP address
2. Device Manager > Add Device
3. Run > Run As > Tizen TV Application

## Samsung Seller Office Submission

### 1. Create Seller Account
https://seller.samsungapps.com/

### 2. Prepare Assets
- App icon (512x512 PNG)
- Screenshots (1920x1080)
- App description
- Privacy policy URL

### 3. Submit App
1. Log into Samsung Seller Office
2. Add New Application > TV
3. Upload .wgt file
4. Fill in app details
5. Submit for review

## Remote Control Keys

The app handles these Samsung TV remote keys:
- **RETURN (10009)**: Back navigation / Exit on error screen
- **EXIT (10182)**: Exit app
- **Arrow keys**: D-pad navigation (handled by web app)
- **Enter**: Select (handled by web app)

## Troubleshooting

### App not loading
- Check internet connection on TV
- Verify `gridtvsports.com` is accessible
- Check browser console in Tizen Studio

### Remote not working
- Ensure keys are registered in `initTizenAPI()`
- Check if iframe has focus

### Build errors
- Verify certificate is valid
- Check config.xml syntax
- Ensure all privileges are correct
