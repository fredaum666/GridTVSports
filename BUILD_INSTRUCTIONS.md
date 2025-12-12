# Build Instructions - Code Obfuscation

This project uses **webpack + Terser** to obfuscate the `sportsBarMode.js` file in production to protect the paywall implementation.

## 📋 Overview

- **Development**: Uses original, readable source code with source maps
- **Production**: Uses obfuscated, minified code without console logs

## 🛠️ Available Commands

### Development (Local)
```bash
# Start development server (no obfuscation)
npm run dev

# Build development bundle (with source maps, no obfuscation)
npm run build:dev
npm run start:dev
```

### Production (Deployment)
```bash
# Build production bundle (obfuscated, minified)
npm run build:prod

# Build and start production server
npm run start:prod
```

## 📁 File Structure

```
GridTVSports/
├── public/
│   ├── sportsBarMode.js          # Original source file (used in dev)
│   └── dist/
│       └── sportsBarMode.min.js  # Built file (obfuscated in prod)
├── webpack.config.js              # Webpack configuration
└── server.js                      # Serves correct file based on NODE_ENV
```

## 🔧 How It Works

### 1. **Webpack Configuration** (`webpack.config.js`)
- **Development mode**: Creates readable output with source maps
- **Production mode**:
  - Removes all `console.log` statements
  - Mangles variable names (makes them unreadable like `a`, `b`, `c`)
  - Removes comments
  - Minifies code
  - Keeps public API names: `initSportsBarMode`, `SportsBarMode`, `sportsBarMode`

### 2. **Server Middleware** (`server.js:1971-1981`)
```javascript
app.get('/sportsBarMode.js', (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const filePath = isProduction
    ? path.join(__dirname, 'public/dist/sportsBarMode.min.js')  // Obfuscated
    : path.join(__dirname, 'public/sportsBarMode.js');           // Original

  res.sendFile(filePath);
});
```

### 3. **Environment Variable**
The `NODE_ENV` environment variable controls which file is served:
- `NODE_ENV=production` → Obfuscated file
- Not set or `development` → Original file

## 🚀 Deployment to Production

### Option 1: Azure App Service (Recommended)
1. Build the production bundle locally:
   ```bash
   npm run build:prod
   ```

2. Commit the `public/dist/` folder to git (temporary):
   ```bash
   git add public/dist/sportsBarMode.min.js -f
   git commit -m "Add production build"
   ```

3. Push to Azure:
   ```bash
   git push azure main
   ```

4. Ensure Azure sets `NODE_ENV=production`:
   - Go to Azure Portal → Your App Service → Configuration
   - Add application setting: `NODE_ENV` = `production`

### Option 2: Build on Server
If you prefer building on the server:

1. Add build step to Azure deployment:
   - Create `.deployment` file:
     ```
     [config]
     command = deploy.cmd
     ```

2. Create `deploy.cmd`:
   ```cmd
   npm install
   npm run build:prod
   node server.js
   ```

3. **Remove** `public/dist/` from `.gitignore` temporarily OR use Azure's build process

## 🔍 Verifying Obfuscation

### Check file size:
```bash
# Original file (~31.5 KB)
ls -lh public/sportsBarMode.js

# Production build (~0.8 KB - heavily compressed!)
ls -lh public/dist/sportsBarMode.min.js
```

### Compare files:
```bash
# View original (readable)
head -n 20 public/sportsBarMode.js

# View obfuscated (unreadable)
head -n 20 public/dist/sportsBarMode.min.js
```

### Test in browser:
1. Start production server: `npm run start:prod`
2. Open DevTools → Network tab
3. Reload page
4. Click on `sportsBarMode.js` request
5. Check Response tab - should show obfuscated code

## 🔒 Security Benefits

**Before obfuscation:**
```javascript
async enterFullscreen() {
  const response = await fetch('/api/subscription/validate-grid', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gridSize: this.gridLayout })
  });
  // ... easily readable code
}
```

**After obfuscation:**
```javascript
async a(){const b=await fetch("/api/subscription/validate-grid",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({gridSize:this.c})});
// ... unreadable minified code
```

## ⚠️ Important Notes

1. **Git Ignore**: `public/dist/` is in `.gitignore` by default
   - For production deployments, either:
     - Build on server (recommended)
     - Temporarily commit built files
     - Use CI/CD pipeline to build

2. **Source Maps**: Only generated in development mode
   - Makes debugging easier locally
   - Not included in production for security

3. **API Names Preserved**: Public API names are kept intact:
   - `initSportsBarMode()`
   - `sportsBarMode.openModal()`
   - `new SportsBarMode()`

4. **Development Workflow**:
   - Edit `public/sportsBarMode.js` (original file)
   - Run `npm run build:prod` before deploying
   - Never edit `public/dist/sportsBarMode.min.js` directly

## 🐛 Troubleshooting

### Issue: Server serves original file in production
**Solution**: Ensure `NODE_ENV=production` is set
```bash
# Windows
set NODE_ENV=production && node server.js

# Linux/Mac
NODE_ENV=production node server.js
```

### Issue: Obfuscated file not found (404)
**Solution**: Build the production bundle first
```bash
npm run build:prod
```

### Issue: Code breaks after obfuscation
**Solution**: Check `webpack.config.js` reserved names
- Add any function names that break to the `reserved` array
- Example: `reserved: ['initSportsBarMode', 'SportsBarMode', 'yourFunctionName']`

## 📚 Additional Resources

- [Webpack Documentation](https://webpack.js.org/)
- [Terser Plugin Options](https://github.com/webpack-contrib/terser-webpack-plugin)
- [Node.js Environment Variables](https://nodejs.org/en/learn/command-line/how-to-read-environment-variables-from-nodejs)
