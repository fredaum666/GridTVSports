const fs = require('fs');

const responsiveCSS = `
    /* HEIGHT-BASED RESPONSIVE - HORIZONTAL LAYOUT FOR SHORT SCREENS */
    @media (max-height: 800px) {
      .fullscreen-game-card {
        display: flex !important;
        flex-direction: row !important;
        flex-wrap: wrap !important;
        padding: clamp(8px, 1.2vh, 15px) !important;
        gap: clamp(6px, 1vh, 12px) !important;
        align-items: center !important;
        justify-content: center !important;
      }

      .fullscreen-quarter {
        width: 100% !important;
        order: -1 !important;
        font-size: clamp(14px, 2.2vh, 22px) !important;
        margin-bottom: 0 !important;
      }

      .fullscreen-team {
        flex: 1 !important;
        min-width: 35% !important;
        max-width: 45% !important;
        margin-bottom: 0 !important;
        gap: clamp(4px, 0.8vh, 8px) !important;
      }

      .fullscreen-vs {
        flex: 0 0 auto !important;
        width: auto !important;
        margin: 0 clamp(6px, 1.2vw, 15px) !important;
        font-size: clamp(11px, 1.7vh, 17px) !important;
      }

      .fullscreen-team-logo {
        width: clamp(28px, 5vh, 55px) !important;
        height: clamp(28px, 5vh, 55px) !important;
      }

      .fullscreen-team-name {
        font-size: clamp(14px, 2.5vh, 26px) !important;
      }

      .fullscreen-team-record {
        font-size: clamp(10px, 1.5vh, 15px) !important;
      }

      .fullscreen-score {
        font-size: clamp(28px, 6vh, 60px) !important;
      }

      .fullscreen-team-header {
        gap: clamp(6px, 1.2vh, 12px) !important;
        margin-bottom: clamp(3px, 0.6vh, 6px) !important;
      }

      .sport-logo-indicator {
        width: clamp(40px, 7vh, 70px) !important;
        height: clamp(40px, 7vh, 70px) !important;
      }

      .fullscreen-down-distance {
        width: 100% !important;
        margin-top: 0 !important;
        font-size: clamp(10px, 1.5vh, 14px) !important;
      }
    }
`;

const files = ['nba.html', 'mlb.html', 'nhl.html'];

files.forEach(file => {
  const filePath = `./public/${file}`;
  try {
    let content = fs.readFileSync(filePath, 'utf8');

    // Check if already added
    if (content.includes('HEIGHT-BASED RESPONSIVE')) {
      console.log(`⏭️  ${file} - Already has responsive CSS`);
      return;
    }

    // Find the insertion point (before "/* Main Container */")
    const insertPoint = content.indexOf('/* Main Container */');
    if (insertPoint === -1) {
      console.log(`❌ ${file} - Could not find insertion point`);
      return;
    }

    // Insert the CSS
    content = content.slice(0, insertPoint) + responsiveCSS + '\n\n    ' + content.slice(insertPoint);

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${file} - Horizontal layout CSS added`);
  } catch (error) {
    console.error(`❌ ${file} - Error:`, error.message);
  }
});

console.log('\n✅ Done! Refresh your browser to see horizontal layout on short screens.');
