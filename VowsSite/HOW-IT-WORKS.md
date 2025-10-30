# How the Wedding Vows System Works

## Quick Start

1. **Open [test-guide.html](test-guide.html)** - Interactive testing guide with buttons to test everything
2. **Open [admin.html](admin.html)** - Edit and format your vows, then unlock them
3. **Open [index.html](index.html)** - Main page guests will see (via QR code)

---

## Complete Flow

### Step 1: Create and Format Vows

1. Open **[admin.html](admin.html)** in your browser
2. Click the **"Edit Vows"** tab
3. Enter names for both bride and groom
4. Use the rich text editor to write and format vows:
   - Type your vows in the editor boxes
   - Select text and click **B** for bold, **I** for italic, **U** for underline
   - Use the **Size** dropdown to change font size
   - Click the **color picker** to change text color
   - Use alignment buttons: ⬅ (left), ↔ (center), ➡ (right)
5. Click **"Save Vows"** button
6. You should see: "Vows saved successfully!" in green

### Step 2: Test Your Vows

1. Open **[index.html](index.html)** in a new tab
2. You should see a **locked screen** with:
   - 🔒 Lock icon
   - "Our Wedding Vows" title
   - "The vows will be available during the ceremony" message

### Step 3: Unlock During Ceremony

1. Go back to **[admin.html](admin.html)**
2. Click **"Unlock Control"** tab
3. Enter password: `wedding2024` (change this before your wedding!)
4. Click **"Unlock Vows"** button
5. Status should change to: "🔓 Vows are currently UNLOCKED"

### Step 4: Guests See Formatted Vows

1. Refresh **[index.html](index.html)** (or wait 5 seconds for auto-refresh)
2. The locked screen disappears
3. Your beautifully formatted vows appear with:
   - Custom names for bride and groom
   - All text formatting (bold, colors, sizes, alignment)
   - Professional, elegant layout

---

## Technical Details

### Data Storage

All data is stored in the browser's **localStorage**:

```javascript
// Vows content
localStorage.setItem('weddingVows', JSON.stringify({
    groomName: "John",
    groomVows: "<p>Formatted HTML here...</p>",
    brideName: "Jane",
    brideVows: "<p>Formatted HTML here...</p>"
}));

// Unlock status
localStorage.setItem('vowsUnlocked', 'true');
```

### How Formatting is Preserved

1. **In Admin Panel** ([admin.html](admin.html)):
   - Uses `contenteditable` divs as rich text editors
   - `document.execCommand()` applies formatting (bold, italic, colors, etc.)
   - HTML is saved directly: `editor.innerHTML` → localStorage

2. **On Main Page** ([index.html](index.html)):
   - Loads HTML from localStorage
   - Displays using `element.innerHTML = vowsData.groomVows`
   - All formatting is preserved automatically

### Auto-Refresh

The main page ([index.html](index.html)) checks for changes every 5 seconds:

```javascript
setInterval(() => {
    checkVowsAccess();  // Check if unlocked
    loadVowsContent();  // Load latest vows
}, 5000);
```

This means:
- Guests' phones update automatically when you unlock
- No manual refresh needed
- Real-time updates across all devices

---

## Files Explained

### [admin.html](admin.html) - Admin Control Panel
- **Edit Vows Tab**: Rich text editor with formatting toolbar
- **Unlock Control Tab**: Password-protected unlock button
- Saves to localStorage
- 2 tabs for easy navigation

### [index.html](index.html) - Guest View
- Shows locked screen by default
- Displays formatted vows when unlocked
- Auto-refreshes every 5 seconds
- Mobile-optimized design
- This is what you'll link in your QR code

### [script.js](script.js) - Main Page Logic
- Loads vows from localStorage
- Checks unlock status
- Auto-refresh functionality
- Updates display in real-time

### [styles.css](styles.css) - Styling
- Elegant, romantic design
- Gold accent color (#d4a574)
- Responsive for all devices
- Clean typography

### [test-guide.html](test-guide.html) - Testing Tool
- Interactive testing interface
- Check saved data
- Quick unlock/lock buttons
- View current status
- Debug tool for development

---

## Common Questions

### Q: Do I need to edit HTML code?
**A:** No! Use the rich text editor in [admin.html](admin.html) - just click and type.

### Q: Will formatting work on mobile phones?
**A:** Yes! All formatting (bold, colors, sizes, alignment) displays perfectly on all devices.

### Q: What happens if I save new vows?
**A:** The main page will load the new content automatically within 5 seconds, or immediately on refresh.

### Q: Can I preview before unlocking?
**A:** Yes! After saving in admin.html, you can temporarily unlock, check index.html, then lock again.

### Q: Where is the data stored?
**A:** In your browser's localStorage - it persists even when you close the browser.

### Q: Is it secure?
**A:** For a one-time wedding event, yes. The password is basic but sufficient. Don't use this for sensitive data.

---

## Troubleshooting

### Vows not showing on main page:
1. Open [test-guide.html](test-guide.html)
2. Click "Check Saved Vows" - verify data exists
3. Make sure you clicked "Save Vows" in admin panel
4. Try clearing cache and reloading

### Formatting not preserved:
- The HTML should be saved directly from the editor
- Check [test-guide.html](test-guide.html) → "Check Saved Vows" → "Show HTML Content"
- You should see HTML tags like `<b>`, `<font>`, etc.

### Can't unlock:
- Default password: `wedding2024`
- Password is in [admin.html](admin.html) line 161
- Or use [test-guide.html](test-guide.html) quick unlock button

---

## Before Your Wedding

1. ✅ Write and format your vows in [admin.html](admin.html)
2. ✅ Change the admin password (line 161 in admin.html)
3. ✅ Test everything with [test-guide.html](test-guide.html)
4. ✅ Upload all files to your web host
5. ✅ Create QR code pointing to your index.html URL
6. ✅ Test QR code with your phone
7. ✅ Keep admin.html URL bookmarked for ceremony day

---

## Wedding Day Checklist

- [ ] Ensure website is accessible online
- [ ] Have admin.html bookmarked
- [ ] Phone is charged
- [ ] Test QR code one more time
- [ ] When it's time: Open admin.html → Unlock Control → Enter password → Unlock
- [ ] Guests' phones will update within 5 seconds!

---

Congratulations on your wedding! 💕
