/**
 * Android TV App Icon Setup Script
 *
 * This script copies the logo.png and creates the necessary icon files
 * for the Android TV app.
 *
 * Prerequisites: npm install sharp
 * Run: node setup-icons.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SOURCE_LOGO = path.join(__dirname, '../../public/assets/logo.png');
const RES_DIR = path.join(__dirname, 'app/src/main/res');

// Android mipmap sizes for launcher icons
const MIPMAP_SIZES = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192
};

// Banner size for Android TV (320x180 dp, using xxhdpi = 3x)
const BANNER_WIDTH = 320 * 3;  // 960px
const BANNER_HEIGHT = 180 * 3; // 540px

async function setupIcons() {
    console.log('Setting up Android TV app icons...\n');

    // Check if source logo exists
    if (!fs.existsSync(SOURCE_LOGO)) {
        console.error('ERROR: Source logo not found at:', SOURCE_LOGO);
        process.exit(1);
    }

    // Create mipmap folders if they don't exist
    for (const folder of Object.keys(MIPMAP_SIZES)) {
        const folderPath = path.join(RES_DIR, folder);
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }
    }

    // Create drawable folder if it doesn't exist
    const drawableFolder = path.join(RES_DIR, 'drawable-xhdpi');
    if (!fs.existsSync(drawableFolder)) {
        fs.mkdirSync(drawableFolder, { recursive: true });
    }

    try {
        // Generate launcher icons for each density
        console.log('Generating launcher icons:');
        for (const [folder, size] of Object.entries(MIPMAP_SIZES)) {
            const outputPath = path.join(RES_DIR, folder, 'ic_launcher.png');

            await sharp(SOURCE_LOGO)
                .resize(size, size, {
                    fit: 'contain',
                    background: { r: 26, g: 26, b: 46, alpha: 1 } // #1a1a2e
                })
                .png()
                .toFile(outputPath);

            console.log(`  - ${folder}/ic_launcher.png (${size}x${size})`);
        }

        // Generate TV banner (320x180 dp)
        console.log('\nGenerating TV banner:');
        const bannerPath = path.join(RES_DIR, 'drawable-xhdpi', 'banner.png');

        // Create banner with logo centered
        const logoBuffer = await sharp(SOURCE_LOGO)
            .resize(Math.floor(BANNER_HEIGHT * 0.7), Math.floor(BANNER_HEIGHT * 0.7), {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .toBuffer();

        await sharp({
            create: {
                width: BANNER_WIDTH,
                height: BANNER_HEIGHT,
                channels: 4,
                background: { r: 26, g: 26, b: 46, alpha: 1 } // #1a1a2e
            }
        })
        .composite([
            {
                input: logoBuffer,
                top: Math.floor((BANNER_HEIGHT - BANNER_HEIGHT * 0.7) / 2),
                left: 60
            }
        ])
        .png()
        .toFile(bannerPath);

        console.log(`  - drawable-xhdpi/banner.png (${BANNER_WIDTH}x${BANNER_HEIGHT})`);

        // Also create a simple drawable banner for fallback
        const drawablePath = path.join(RES_DIR, 'drawable', 'banner.png');
        await sharp(SOURCE_LOGO)
            .resize(320, 180, {
                fit: 'contain',
                background: { r: 26, g: 26, b: 46, alpha: 1 }
            })
            .png()
            .toFile(drawablePath);
        console.log(`  - drawable/banner.png (320x180)`);

        console.log('\n✅ Icons generated successfully!');
        console.log('\nNext steps:');
        console.log('1. Update AndroidManifest.xml to use @mipmap/ic_launcher');
        console.log('2. Remove or update the mipmap-anydpi-v26/ic_launcher.xml if it overrides PNG');
        console.log('3. Rebuild the APK: ./gradlew assembleDebug');

    } catch (error) {
        console.error('Error generating icons:', error);
        process.exit(1);
    }
}

setupIcons();
