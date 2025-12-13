# GridTV Sports - LG webOS TV App

A WebView wrapper for LG Smart TVs (2014+).

## Prerequisites

- webOS TV SDK: https://webostv.developer.lge.com/sdk/installation/
- LG Developer Account: https://webostv.developer.lge.com/
- LG TV in Developer Mode

## Enable Developer Mode on LG TV

1. Install "Developer Mode" app from LG Content Store
2. Sign in with your LG Developer account
3. Enable Developer Mode
4. Note the displayed IP address

## Project Setup

1. Install webOS TV CLI: `npm install -g @webosose/ares-cli`
2. Set up device: `ares-setup-device`
3. Add your TV with its IP

## Building & Running

```bash
# Package the app
ares-package .

# Install on TV
ares-install -d <TV_NAME> com.gridtvsports.tv_1.0.0_all.ipk

# Launch
ares-launch -d <TV_NAME> com.gridtvsports.tv
```

## Debugging

```bash
ares-inspect -d <TV_NAME> com.gridtvsports.tv
```

## Publishing

Submit to LG Content Store:
https://seller.lgappstv.com/
