/**
 * Force CSS Refresh - Bust browser cache
 * Run this script to add cache-busting to CSS files
 */

const fs = require('fs');
const path = require('path');

const files = [
  './public/nfl.html',
  './public/nba.html',
  './public/mlb.html',
  './public/nhl.html',
  './public/LiveGames.html'
];

const timestamp = Date.now();

console.log('🔄 Adding cache-busting timestamp to CSS links...\n');

files.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf8');

    // Replace responsive-grid.css link with timestamp
    const oldLink = '<link rel="stylesheet" href="/styles/responsive-grid.css">';
    const newLink = `<link rel="stylesheet" href="/styles/responsive-grid.css?v=${timestamp}">`;

    if (content.includes(oldLink)) {
      content = content.replace(
        /href="\/styles\/responsive-grid\.css(\?v=\d+)?">/g,
        `href="/styles/responsive-grid.css?v=${timestamp}">`
      );

      fs.writeFileSync(file, content, 'utf8');
      console.log(`✅ ${path.basename(file)} - Cache-busted`);
    } else {
      console.log(`⚠️  ${path.basename(file)} - No responsive-grid.css link found`);
    }
  } catch (error) {
    console.error(`❌ ${path.basename(file)} - Error:`, error.message);
  }
});

console.log(`\n✅ Done! Timestamp: ${timestamp}`);
console.log('\n📋 Next steps:');
console.log('   1. Refresh your browser (Ctrl + Shift + R)');
console.log('   2. Or close and reopen the browser tab');
console.log('   3. Check DevTools Console for verification');
