const fs = require('fs');
const files = ['./public/nfl.html', './public/nba.html', './public/mlb.html', './public/nhl.html', './public/LiveGames.html'];
const newTimestamp = Date.now();

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(
    /responsive-grid\.css\?v=\d+/g,
    `responsive-grid.css?v=${newTimestamp}`
  );
  fs.writeFileSync(file, content, 'utf8');
  console.log(`✅ Updated ${file}`);
});

console.log(`\n✅ New timestamp: ${newTimestamp}`);
console.log('🔄 Hard refresh your browser: Ctrl + Shift + R');
