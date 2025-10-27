const fs = require('fs');

const improvedCSS = `    /* HEIGHT-BASED RESPONSIVE - HORIZONTAL LAYOUT FOR SHORT SCREENS */
    @media (max-height: 900px) {
      .fullscreen-game-card {
        display: flex !important;
        flex-direction: row !important;
        flex-wrap: wrap !important;
        padding: clamp(10px, 1.5vh, 20px) !important;
        gap: clamp(8px, 1.2vh, 15px) !important;
        align-items: stretch !important;
        justify-content: space-between !important;
      }

      .fullscreen-quarter {
        width: 100% !important;
        order: -1 !important;
        font-size: clamp(14px, 2.2vh, 24px) !important;
        margin-bottom: clamp(6px, 1vh, 12px) !important;
        padding-bottom: clamp(6px, 1vh, 10px) !important;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
      }

      .fullscreen-team {
        flex: 1 !important;
        min-width: 38% !important;
        max-width: 42% !important;
        margin-bottom: 0 !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        gap: clamp(6px, 1vh, 10px) !important;
      }

      .fullscreen-vs {
        flex: 0 0 auto !important;
        width: auto !important;
        margin: 0 !important;
        padding: 0 clamp(8px, 1.5vw, 20px) !important;
        font-size: clamp(12px, 1.8vh, 20px) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        align-self: center !important;
        opacity: 0.6 !important;
      }

      .fullscreen-team-header {
        display: flex !important;
        flex-direction: row !important;
        align-items: center !important;
        justify-content: center !important;
        gap: clamp(8px, 1.2vh, 12px) !important;
        margin-bottom: 0 !important;
        width: 100% !important;
      }

      .fullscreen-team-record {
        font-size: clamp(10px, 1.4vh, 14px) !important;
        opacity: 0.8 !important;
        order: -1 !important;
      }

      .fullscreen-team-logo {
        width: clamp(32px, 5.5vh, 60px) !important;
        height: clamp(32px, 5.5vh, 60px) !important;
        order: 0 !important;
      }

      .fullscreen-team-name {
        font-size: clamp(15px, 2.8vh, 28px) !important;
        font-weight: 700 !important;
        order: 1 !important;
        white-space: nowrap !important;
      }

      .fullscreen-possession {
        margin-left: 4px !important;
      }

      .fullscreen-timeouts {
        display: flex !important;
        gap: clamp(4px, 0.6vh, 8px) !important;
        justify-content: center !important;
      }

      .timeout-bar {
        width: clamp(16px, 2.5vh, 24px) !important;
        height: clamp(4px, 0.6vh, 6px) !important;
      }

      .fullscreen-score {
        font-size: clamp(36px, 7vh, 70px) !important;
        font-weight: 800 !important;
        line-height: 1 !important;
      }

      .sport-logo-indicator {
        width: clamp(45px, 7vh, 75px) !important;
        height: clamp(45px, 7vh, 75px) !important;
        top: clamp(8px, 1.2vh, 15px) !important;
        left: clamp(8px, 1.2vh, 15px) !important;
      }

      .fullscreen-down-distance {
        width: 100% !important;
        order: 999 !important;
        margin-top: clamp(6px, 1vh, 10px) !important;
        padding-top: clamp(6px, 1vh, 10px) !important;
        border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
        font-size: clamp(11px, 1.6vh, 16px) !important;
        text-align: center !important;
      }
    }`;

const files = ['nba.html', 'mlb.html', 'nhl.html'];

files.forEach(file => {
  const filePath = `./public/${file}`;
  try {
    let content = fs.readFileSync(filePath, 'utf8');

    // Find and replace the old responsive CSS block
    const startMarker = '/* HEIGHT-BASED RESPONSIVE - HORIZONTAL LAYOUT FOR SHORT SCREENS */';
    const endMarker = '/* Main Container */';

    const startIdx = content.indexOf(startMarker);
    const endIdx = content.indexOf(endMarker);

    if (startIdx !== -1 && endIdx !== -1) {
      // Replace the entire block
      content = content.slice(0, startIdx) + improvedCSS + '\n\n    ' + content.slice(endIdx);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ ${file} - Updated horizontal layout`);
    } else {
      console.log(`❌ ${file} - Could not find CSS block to replace`);
    }
  } catch (error) {
    console.error(`❌ ${file} - Error:`, error.message);
  }
});

console.log('\n✅ Done! Refresh to see improved positioning.');
