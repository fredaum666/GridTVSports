const fs = require('fs');

// Add meta tag to prevent caching
const metaTag = '<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">';

const files = ['nfl.html', 'nba.html', 'mlb.html', 'nhl.html'];

files.forEach(file => {
  const filePath = `./public/${file}`;
  try {
    let content = fs.readFileSync(filePath, 'utf8');

    // Check if meta tag already exists
    if (!content.includes('Cache-Control')) {
      // Add after the first <meta> tag or in <head>
      const headMatch = content.indexOf('</head>');
      if (headMatch > -1) {
        content = content.slice(0, headMatch) + `  ${metaTag}\n  ` + content.slice(headMatch);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ ${file} - Added no-cache meta tag`);
      }
    } else {
      console.log(`⏭️  ${file} - Already has cache control`);
    }
  } catch (error) {
    console.error(`❌ ${file} - Error:`, error.message);
  }
});

console.log('\n✅ Done! Now close ALL browser tabs and reopen to bypass cache.');
