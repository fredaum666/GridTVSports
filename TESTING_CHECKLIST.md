# 🧪 Testing Checklist - Cast to TV + Mobile Responsive

## Pre-Test Setup

### Required
- [ ] Server running on `http://localhost:3001`
- [ ] Chrome or Edge browser (for casting)
- [ ] Chromecast or Apple TV (for cast testing)
- [ ] Phone/tablet on same WiFi (for mobile testing)

### Optional
- [ ] Multiple devices for multi-device testing
- [ ] Different screen sizes (phone, tablet, desktop)
- [ ] Various browsers for compatibility testing

---

## 📱 MOBILE RESPONSIVE TESTING

### Phone Browser (Portrait) - 375px to 768px

#### Test Device: `_____________` (iPhone 12, Pixel 5, etc.)

**Visual Layout**
- [ ] Single column layout (games stacked vertically)
- [ ] No horizontal scrolling
- [ ] Cards fill full width
- [ ] Comfortable vertical scrolling

**Element Sizing**
- [ ] Sport logos visible (60px)
- [ ] Team logos clear (50px)
- [ ] Team names readable (1.8rem)
- [ ] Scores HUGE and readable (4rem)
- [ ] Status text clear (1.4rem)

**Touch Controls**
- [ ] Header buttons tap-able (8px padding)
- [ ] Cast button shows and works (if supported)
- [ ] Game dropdowns large enough to tap
- [ ] Scroll smooth and responsive
- [ ] No accidental taps

**Fullscreen Mode**
- [ ] Single column maintained in fullscreen
- [ ] Controls visible at top
- [ ] Exit button works
- [ ] Change layout button works
- [ ] Can select games via dropdown

**Portrait vs Landscape**
- [ ] Portrait: Single column ✅
- [ ] Landscape: Switches to 2 columns (expected)
- [ ] Rotation smooth, no breaking

---

### Tablet Browser (Landscape) - 769px to 1024px

#### Test Device: `_____________` (iPad, Galaxy Tab, etc.)

**Visual Layout**
- [ ] 2-column grid (even split 50/50)
- [ ] No wasted space
- [ ] Cards properly sized
- [ ] Comfortable viewing distance

**Element Sizing**
- [ ] Sport logos (70-85px depending on grid)
- [ ] Team logos (45-55px)
- [ ] Team names (1.6-1.8rem)
- [ ] Scores (3-3.5rem)

**Touch Controls**
- [ ] All buttons accessible
- [ ] Dropdowns work smoothly
- [ ] Scrolling if needed (6+ games)
- [ ] Hover effects work (if mouse connected)

**Grid Layouts**
- [ ] 2 games: 2x1 grid
- [ ] 4 games: 2x2 grid
- [ ] 6 games: 2x3 grid
- [ ] 8 games: 2x4 grid

---

### Desktop Browser - 1025px+

#### Test Device: `_____________` (Resolution: _________)

**Visual Layout**
- [ ] Full grid layouts (2x2, 3x3, 4x4)
- [ ] Original design preserved
- [ ] No mobile CSS interfering
- [ ] All features working

**Element Sizing**
- [ ] Sport logos (100px base, responsive)
- [ ] Team logos (80px base)
- [ ] Team names (3.5rem)
- [ ] Scores (6rem - massive!)

**Controls**
- [ ] Mouse hover works
- [ ] Dropdowns on hover
- [ ] All buttons clickable
- [ ] Layout switcher works

---

## 📺 CAST TO TV TESTING

### Pre-Cast Checks

**Browser Compatibility**
- [ ] Chrome/Edge browser
- [ ] DevTools console open (F12)
- [ ] No errors in console
- [ ] Cast button visible after fullscreen

**Network Setup**
- [ ] Device on WiFi: `_____________`
- [ ] TV/Chromecast on same WiFi
- [ ] Can ping TV from device
- [ ] No firewall blocking

---

### Cast Button Appearance

**Before Fullscreen**
- [ ] Cast button NOT visible (expected)

**After Launching Fullscreen**
- [ ] Cast button appears (📺 Cast to TV)
- [ ] Button in purple gradient
- [ ] Button NOT disabled
- [ ] Console shows: "✅ Cast devices available"

**If Button Disabled**
- [ ] Console shows: "⚠️ No cast devices found"
- [ ] Check WiFi connection
- [ ] Restart Chromecast/TV
- [ ] Try again

---

### Casting Process

**Step 1: Initiate Cast**
- [ ] Click "📺 Cast to TV" button
- [ ] Device picker appears
- [ ] See your TV/Chromecast in list
- [ ] TV name correct: `_____________`

**Step 2: Connect**
- [ ] Select TV from list
- [ ] Connection starts
- [ ] Button changes to "📺 Casting..."
- [ ] Button turns green with pulse animation
- [ ] Console shows: "🎬 Casting started to: [ID]"

**Step 3: TV Display**
- [ ] TV shows fullscreen games
- [ ] NO controls visible on TV
- [ ] Sport logos visible
- [ ] Team logos visible
- [ ] Scores displaying
- [ ] Game layout matches selection

**Step 4: Controller Display**
- [ ] Your device still shows controls
- [ ] Can see game dropdowns
- [ ] Change layout button visible
- [ ] Exit button visible
- [ ] Cast button shows "Casting..."

---

### State Synchronization

**Change Games While Casting**
- [ ] Hover over card on controller
- [ ] Select different game from dropdown
- [ ] TV updates instantly
- [ ] New game appears on TV
- [ ] No lag or delay
- [ ] Console shows: "📤 Sent state to TV"

**Change Layout While Casting**
- [ ] Click "🔄 Change Layout" on controller
- [ ] Exit fullscreen mode
- [ ] Select different layout (e.g., 6 games)
- [ ] Launch fullscreen again
- [ ] TV reflects new layout
- [ ] All games sync correctly

**Auto-Refresh While Casting**
- [ ] Wait 15 seconds
- [ ] Scores update on controller
- [ ] Scores update on TV simultaneously
- [ ] Both displays stay in sync
- [ ] No disconnection

---

### Disconnect Process

**Stop Casting**
- [ ] Click "📺 Casting..." button again
- [ ] Connection terminates
- [ ] TV goes blank or returns to home
- [ ] Button resets to "📺 Cast to TV"
- [ ] Button returns to purple gradient
- [ ] Console shows: "🛑 Presentation terminated"

**Exit Fullscreen**
- [ ] Click "✕ Exit" while casting
- [ ] Fullscreen mode exits
- [ ] Casting also stops
- [ ] TV disconnects
- [ ] Return to selection screen

---

### Reconnection Testing

**Connection Drop Simulation**
- [ ] Start casting
- [ ] Turn off WiFi on TV/Chromecast
- [ ] Wait 5-10 seconds
- [ ] Turn WiFi back on
- [ ] Connection re-establishes (or shows error)
- [ ] If error, can restart casting

**Browser Refresh While Casting**
- [ ] Start casting
- [ ] Refresh browser (F5) on controller
- [ ] Casting stops (expected)
- [ ] Can restart casting after reload

---

## 🔄 CROSS-DEVICE TESTING

### Phone Casting to TV

**Setup**
- [ ] Open LiveGames.html on phone (Chrome)
- [ ] Select games (2-4 recommended)
- [ ] Launch fullscreen
- [ ] Phone shows single column

**Cast from Phone**
- [ ] Tap "📺 Cast to TV" button
- [ ] Select TV from list
- [ ] TV shows games in selected layout
- [ ] Phone keeps controls
- [ ] Can change games from phone
- [ ] TV updates when phone changes games

**Mobile-Specific**
- [ ] Phone doesn't overheat
- [ ] Battery drain acceptable
- [ ] Touch controls work while casting
- [ ] Can lock phone screen (casting might stop)

---

### Tablet Casting to TV

**Setup**
- [ ] Open LiveGames.html on tablet
- [ ] Select 4-6 games
- [ ] Launch fullscreen
- [ ] Tablet shows 2-column grid

**Cast from Tablet**
- [ ] Tap "📺 Cast to TV" button
- [ ] TV shows games
- [ ] Tablet shows controls
- [ ] 2-column layout maintained on tablet
- [ ] TV shows selected grid layout

---

## 🌐 BROWSER COMPATIBILITY

### Chrome (Recommended)
- [ ] Desktop casting works
- [ ] Mobile casting works
- [ ] All features functional
- [ ] Console no errors

### Edge (Recommended)
- [ ] Desktop casting works
- [ ] Mobile casting works
- [ ] Same as Chrome experience
- [ ] Console no errors

### Safari (Limited)
- [ ] Mobile responsive works
- [ ] AirPlay might work (Apple TV only)
- [ ] Cast button may not appear
- [ ] Other features work

### Firefox (No Casting)
- [ ] Mobile responsive works
- [ ] Cast button hidden (expected)
- [ ] All other features work
- [ ] Fullscreen works

---

## 🐛 TROUBLESHOOTING TESTS

### Issue: Cast Button Not Showing
**Test:**
- [ ] Check browser (use Chrome/Edge)
- [ ] Check console for errors
- [ ] Verify in fullscreen mode
- [ ] Try incognito/private mode

### Issue: No Devices Found
**Test:**
- [ ] Verify WiFi network
- [ ] Ping TV/Chromecast
- [ ] Restart TV
- [ ] Restart browser

### Issue: Connection Drops
**Test:**
- [ ] Check WiFi signal strength
- [ ] Move closer to router
- [ ] Reduce network congestion
- [ ] Try wired connection for TV

### Issue: TV Shows Controls
**Test:**
- [ ] Verify presentation mode active
- [ ] Check CSS media query
- [ ] Restart connection
- [ ] Clear browser cache

### Issue: Sync Lag
**Test:**
- [ ] Check network latency
- [ ] Close other apps
- [ ] Reduce number of games
- [ ] Restart casting

---

## 📊 PERFORMANCE TESTING

### Load Time
- [ ] Page loads in < 3 seconds
- [ ] Games load in < 5 seconds
- [ ] Fullscreen launches instantly
- [ ] Cast connects in < 5 seconds

### Responsiveness
- [ ] Layout changes instant
- [ ] Game selection responsive
- [ ] Scroll smooth (60fps)
- [ ] No lag or stuttering

### Memory/CPU
- [ ] Check DevTools Performance tab
- [ ] CPU usage reasonable (< 30%)
- [ ] Memory stable (< 500MB)
- [ ] No memory leaks over time

### Battery (Mobile)
- [ ] Monitor battery drain
- [ ] Acceptable for 1 hour use
- [ ] Not excessive heating
- [ ] Can optimize if needed

---

## ✅ FINAL VERIFICATION

### Desktop Experience
- [ ] All grids work (2/4/6/8)
- [ ] Original design preserved
- [ ] Casting works perfectly
- [ ] No regression bugs

### Mobile Experience
- [ ] Phone layout optimized
- [ ] Tablet layout optimized
- [ ] Touch controls work
- [ ] Can cast from mobile

### Casting Experience
- [ ] Connects reliably
- [ ] Syncs state perfectly
- [ ] Auto-refresh works
- [ ] Clean TV display
- [ ] Easy disconnect

### Overall Quality
- [ ] No console errors
- [ ] Smooth performance
- [ ] Intuitive UX
- [ ] Professional appearance
- [ ] Ready for production

---

## 📝 TEST RESULTS

**Date:** `_______________`  
**Tester:** `_______________`  
**Environment:** `_______________`

**Devices Tested:**
- Desktop: `_______________`
- Phone: `_______________`
- Tablet: `_______________`
- TV/Chromecast: `_______________`

**Pass Rate:** `_____ / _____ tests passed`

**Issues Found:**
1. `_______________`
2. `_______________`
3. `_______________`

**Overall Status:**
- [ ] ✅ Ready for production
- [ ] ⚠️ Minor issues, acceptable
- [ ] ❌ Major issues, needs fixes

**Notes:**
```
_______________________________________________________
_______________________________________________________
_______________________________________________________
```

---

🎉 **Happy Testing!** 🏈🏀⚾🏒📺📱
