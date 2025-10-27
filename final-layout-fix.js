const fs = require('fs');

const finalCSS = `    /* HEIGHT-BASED RESPONSIVE - HORIZONTAL LAYOUT FOR SHORT SCREENS */
    @media (max-height: 900px) {
      .fullscreen-game-card {
        display: flex !important;
        flex-direction: row !important;
        flex-wrap: wrap !important;
        padding: clamp(12px, 2vh, 24px) !important;
        gap: clamp(10px, 1.5vh, 18px) !important;
        align-items: center !important;
        justify-content: center !important;
      }

      .fullscreen-quarter {
        width: 100% !important;
        order: -1 !important;
        font-size: clamp(15px, 2.5vh, 26px) !important;
        font-weight: 700 !important;
        margin-bottom: clamp(8px, 1.2vh, 14px) !important;
        padding-bottom: clamp(8px, 1.2vh, 12px) !important;
        border-bottom: 2px solid rgba(255, 255, 255, 0.15) !important;
        text-align: center !important;
      }

      .fullscreen-team {
        flex: 1 1 40% !important;
        max-width: 45% !important;
        min-width: 35% !important;
        margin-bottom: 0 !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        gap: clamp(5px, 1vh, 12px) !important;
      }

      .fullscreen-vs {
        flex: 0 0 auto !important;
        width: auto !important;
        margin: 0 clamp(10px, 2vw, 24px) !important;
        padding: 0 !important;
        font-size: clamp(14px, 2vh, 22px) !important;
        font-weight: 600 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        align-self: center !important;
        opacity: 0.5 !important;
      }

      .fullscreen-team-header {
        display: flex !important;
        flex-direction: row !important;
        align-items: center !important;
        justify-content: center !important;
        flex-wrap: wrap !important;
        gap: clamp(6px, 1vh, 10px) !important;
        margin-bottom: clamp(4px, 0.6vh, 8px) !important;
        width: 100% !important;
      }

      .fullscreen-team-record {
        font-size: clamp(11px, 1.6vh, 16px) !important;
        font-weight: 500 !important;
        opacity: 0.7 !important;
        width: 100% !important;
        text-align: center !important;
        order: -1 !important;
      }

      .fullscreen-team-logo {
        width: clamp(40px, 7vh, 70px) !important;
        height: clamp(40px, 7vh, 70px) !important;
        flex-shrink: 0 !important;
      }

      .fullscreen-team-name {
        font-size: clamp(16px, 3vh, 30px) !important;
        font-weight: 700 !important;
        text-align: center !important;
        line-height: 1.2 !important;
        display: inline-block !important;
        max-width: 100% !important;
        visibility: visible !important;
      }

      .fullscreen-possession {
        font-size: clamp(14px, 2.5vh, 24px) !important;
        margin-left: 6px !important;
        display: inline !important;
        visibility: visible !important;
      }

      .fullscreen-timeouts {
        display: flex !important;
        gap: clamp(5px, 0.8vh, 10px) !important;
        justify-content: center !important;
        width: 100% !important;
        margin: clamp(4px, 0.6vh, 8px) 0 !important;
      }

      .timeout-bar {
        width: clamp(20px, 3.5vh, 32px) !important;
        height: clamp(6px, 1vh, 10px) !important;
        border-radius: 2px !important;
      }

      .fullscreen-score {
        font-size: clamp(48px, 9vh, 90px) !important;
        font-weight: 800 !important;
        line-height: 1 !important;
        width: 100% !important;
        text-align: center !important;
        margin-top: clamp(6px, 1vh, 12px) !important;
      }

      .sport-logo-indicator {
        width: clamp(50px, 8vh, 80px) !important;
        height: clamp(50px, 8vh, 80px) !important;
        top: clamp(10px, 1.5vh, 18px) !important;
        left: clamp(10px, 1.5vh, 18px) !important;
      }

      .fullscreen-down-distance {
        width: 100% !important;
        order: 999 !important;
        margin-top: clamp(8px, 1.2vh, 14px) !important;
        padding-top: clamp(8px, 1.2vh, 12px) !important;
        border-top: 2px solid rgba(255, 255, 255, 0.15) !important;
        font-size: clamp(12px, 1.8vh, 18px) !important;
        font-weight: 600 !important;
        text-align: center !important;
      }
    }`;

const files = ['nba.html', 'mlb.html', 'nhl.html'];

files.forEach(file => {
  const filePath = `./public/${file}`;
  try {
    let content = fs.readFileSync(filePath, 'utf8');

    const startMarker = '/* HEIGHT-BASED RESPONSIVE - HORIZONTAL LAYOUT FOR SHORT SCREENS */';
    const endMarker = '/* Main Container */';

    const startIdx = content.indexOf(startMarker);
    const endIdx = content.indexOf(endMarker);

    if (startIdx !== -1 && endIdx !== -1) {
      content = content.slice(0, startIdx) + finalCSS + '\n\n    ' + content.slice(endIdx);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ ${file} - Applied final layout fix`);
    } else {
      console.log(`❌ ${file} - Could not find markers`);
    }
  } catch (error) {
    console.error(`❌ ${file} - Error:`, error.message);
  }
});

console.log('\n✅ Done! Team names and possession indicators should now be visible.');
