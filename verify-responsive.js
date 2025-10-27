/**
 * Verification Script for Responsive Fullscreen Cards
 * Run this in browser console (F12) when viewing fullscreen mode
 */

console.log('🔍 RESPONSIVE FULLSCREEN VERIFICATION\n');

// 1. Check if responsive-grid.css is loaded
const stylesheets = Array.from(document.styleSheets);
const responsiveGridLoaded = stylesheets.some(sheet =>
  sheet.href && sheet.href.includes('responsive-grid.css')
);
console.log(`✓ responsive-grid.css loaded: ${responsiveGridLoaded ? '✅ YES' : '❌ NO'}`);

// 2. Check viewport dimensions
const vw = window.innerWidth;
const vh = window.innerHeight;
console.log(`\n📐 VIEWPORT SIZE:`);
console.log(`  Width: ${vw}px`);
console.log(`  Height: ${vh}px`);
console.log(`  Aspect Ratio: ${(vw/vh).toFixed(2)}`);

// 3. Check for fullscreen cards
const fullscreenCards = document.querySelectorAll('.fullscreen-card');
console.log(`\n🎴 FULLSCREEN CARDS:`);
console.log(`  Found: ${fullscreenCards.length} cards`);

if (fullscreenCards.length > 0) {
  const sampleCard = fullscreenCards[0];
  const cardRect = sampleCard.getBoundingClientRect();

  console.log(`\n📊 SAMPLE CARD DIMENSIONS:`);
  console.log(`  Card Width: ${cardRect.width.toFixed(2)}px`);
  console.log(`  Card Height: ${cardRect.height.toFixed(2)}px`);

  // Check if card fits in viewport
  const fitsWidth = cardRect.right <= vw;
  const fitsHeight = cardRect.bottom <= vh;
  console.log(`  Fits in viewport: ${fitsWidth && fitsHeight ? '✅ YES' : '❌ NO'}`);

  // Check for overflow
  const overflow = window.getComputedStyle(sampleCard).overflow;
  console.log(`  Overflow: ${overflow === 'hidden' ? '✅ hidden' : overflow}`);

  // Check specific elements
  const score = sampleCard.querySelector('.fs-score');
  const teamName = sampleCard.querySelector('.fs-team-name');
  const teamLogo = sampleCard.querySelector('.fs-team-logo');

  console.log(`\n🔤 ELEMENT FONT SIZES:`);
  if (score) {
    const scoreFontSize = window.getComputedStyle(score).fontSize;
    console.log(`  Score: ${scoreFontSize}`);
  }
  if (teamName) {
    const teamNameFontSize = window.getComputedStyle(teamName).fontSize;
    console.log(`  Team Name: ${teamNameFontSize}`);
  }
  if (teamLogo) {
    const logoWidth = window.getComputedStyle(teamLogo).width;
    const logoHeight = window.getComputedStyle(teamLogo).height;
    console.log(`  Team Logo: ${logoWidth} x ${logoHeight}`);
  }

  // Check for clipping
  console.log(`\n✂️ CLIPPING CHECK:`);
  fullscreenCards.forEach((card, index) => {
    const elements = card.querySelectorAll('.fs-score, .fs-team-name, .fs-team-logo, .fs-record');
    let hasClipping = false;

    elements.forEach(el => {
      const rect = el.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();

      if (rect.bottom > cardRect.bottom || rect.right > cardRect.right) {
        hasClipping = true;
        console.log(`  ❌ Card ${index + 1}: Element clipped (${el.className})`);
      }
    });

    if (!hasClipping) {
      console.log(`  ✅ Card ${index + 1}: All elements visible`);
    }
  });
}

// 4. Check for scrollbars
const hasHorizontalScroll = document.documentElement.scrollWidth > vw;
const hasVerticalScroll = document.documentElement.scrollHeight > vh;
console.log(`\n📜 SCROLLBARS:`);
console.log(`  Horizontal: ${hasHorizontalScroll ? '❌ YES (unwanted)' : '✅ NO'}`);
console.log(`  Vertical: ${hasVerticalScroll ? '❌ YES (unwanted)' : '✅ NO'}`);

// 5. Media query matching
console.log(`\n📱 ACTIVE MEDIA QUERIES:`);
const queries = {
  'Mobile (max-width: 567px)': window.matchMedia('(max-width: 567px)').matches,
  'Tablet (max-width: 1023px)': window.matchMedia('(max-width: 1023px)').matches,
  'Small Height (max-height: 600px)': window.matchMedia('(max-height: 600px)').matches,
  'Tiny Height (max-height: 400px)': window.matchMedia('(max-height: 400px)').matches,
  'Combined Small (max-width: 768px and max-height: 768px)': window.matchMedia('(max-width: 768px) and (max-height: 768px)').matches
};

Object.entries(queries).forEach(([name, matches]) => {
  if (matches) {
    console.log(`  ✅ ${name}`);
  }
});

// 6. Check grid layout
const gridContainer = document.querySelector('.fullscreen-grid');
if (gridContainer) {
  const gridClass = Array.from(gridContainer.classList).find(c => c.startsWith('grid-'));
  console.log(`\n📐 GRID LAYOUT:`);
  console.log(`  Layout: ${gridClass || 'Unknown'}`);
  console.log(`  Cards in grid: ${gridContainer.querySelectorAll('.fullscreen-card').length}`);
}

console.log('\n✅ VERIFICATION COMPLETE\n');
console.log('💡 TIP: If elements are clipped, try:');
console.log('   1. Hard refresh: Ctrl + Shift + R');
console.log('   2. Clear cache and reload');
console.log('   3. Check browser zoom is at 100%');
