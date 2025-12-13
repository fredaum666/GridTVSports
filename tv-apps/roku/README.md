# GridTV Sports - Roku Channel

A simple Roku channel that displays the TV receiver page.

## Prerequisites

- Roku device in Developer Mode (https://developer.roku.com/docs/developer-program/getting-started/developer-setup.md)
- Roku account

## Enable Developer Mode on Roku

1. On your Roku, go to Home
2. Press: Home 3x, Up 2x, Right, Left, Right, Left, Right
3. Note the IP address shown
4. Set a development password

## Project Structure

```
roku/
├── manifest           # App metadata
├── source/
│   └── main.brs      # Main BrightScript code
└── images/
    ├── icon_hd.png   # 336x210
    └── splash_hd.png # 1920x1080
```

## Deploying

1. Zip the contents (manifest, source/, images/)
2. Open http://<ROKU_IP> in browser
3. Login with rokudev / <your_password>
4. Upload the zip file

## Publishing

Submit to Roku Channel Store:
https://developer.roku.com/docs/developer-program/publishing/channel-publishing.md
