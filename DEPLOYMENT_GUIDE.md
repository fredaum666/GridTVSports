# 🚀 GridTV Sports - Deployment Guide

## 📋 Application Overview

**GridTV Sports** is a Node.js backend application with static HTML/CSS/JS frontend that displays live games for NFL, NBA, MLB, and NHL with real-time updates and sport-specific animations.

---

## 🏗️ Architecture

- **Backend**: Node.js + Express.js (port 3001)
- **Frontend**: Static HTML files served by Express
- **API**: ESPN Sports API (free, unlimited)
- **Database**: PostgreSQL (Azure Flexible Server)
- **Caching**: In-memory Map + PostgreSQL persistence

---

## 📦 Build Configuration

### **package.json Scripts**

```json
{
  "scripts": {
    "dev": "nodemon server.js",
    "build": "echo 'No build step needed - using static HTML files'",
    "start": "node server.js",
    "setup-db": "node setup-db.js",
    "test-db": "node test-db.js"
  }
}
```

### **Dependencies (Production)**
```json
{
  "axios": "^1.12.2",        // HTTP client for ESPN API
  "cors": "^2.8.5",          // CORS middleware
  "dotenv": "^16.6.1",       // Environment variables
  "express": "^4.21.2",      // Web server
  "node-cron": "^3.0.3",     // Scheduled tasks
  "pg": "^8.16.3"            // PostgreSQL client
}
```

### **No Build Step Required**
This application uses **static HTML files** - no bundling, transpiling, or building needed!
- ✅ Frontend files are served directly from `/public` folder
- ✅ No Vite, Webpack, or React involved
- ✅ Just install dependencies and run `node server.js`

---

## 🌐 Deployment Options

### **Option 1: Azure App Service (Recommended)**

#### **Step 1: Create App Service**
1. Go to Azure Portal → Create Resource → Web App
2. **Settings**:
   - Runtime: Node 18 LTS or Node 20 LTS
   - Region: Same as your PostgreSQL server
   - Pricing: Free (F1) or Basic (B1)

#### **Step 2: Configure Environment Variables**
In Azure Portal → App Service → Configuration → Application Settings:

```bash
DATABASE_URL=postgresql://Fredaum666:FM|031188@gridtvsport.postgres.database.azure.com:5432/postgres?sslmode=require
NODE_ENV=production
PORT=3001
```

#### **Step 3: Deploy via GitHub Actions**
The repository already has `.github/workflows/main_gridtvsports.yml` configured!

**Deployment happens automatically when you push to GitHub:**
```bash
git push origin main
```

**What happens:**
1. GitHub Actions runs `npm install`
2. Runs `npm run build` (echoes "No build needed")
3. Deploys to Azure App Service
4. Restarts the application

#### **Step 4: Initialize Database (One-Time)**
SSH into your Azure App Service and run:
```bash
npm run setup-db
```

Or use Azure CLI:
```bash
az webapp ssh --resource-group <your-resource-group> --name gridtvsports
cd /home/site/wwwroot
npm run setup-db
```

---

### **Option 2: Azure Container Instances**

#### **Create Dockerfile** (if not exists):
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["node", "server.js"]
```

#### **Build and Deploy**:
```bash
# Build image
docker build -t gridtvsports .

# Push to Azure Container Registry
az acr build --registry <your-registry> --image gridtvsports:latest .

# Create container instance
az container create \
  --resource-group <resource-group> \
  --name gridtvsports \
  --image <your-registry>.azurecr.io/gridtvsports:latest \
  --dns-name-label gridtvsports \
  --ports 3001 \
  --environment-variables \
    DATABASE_URL="<your-connection-string>" \
    NODE_ENV=production
```

---

### **Option 3: Traditional VM/VPS**

#### **Requirements**:
- Ubuntu 20.04+ or Windows Server
- Node.js 18+ installed
- PostgreSQL connection (Azure or local)

#### **Setup Steps**:
```bash
# 1. Clone repository
git clone https://github.com/fredaum666/GridTVSports.git
cd GridTVSports

# 2. Install dependencies
npm install --production

# 3. Create .env file
echo "DATABASE_URL=your_connection_string" > .env

# 4. Initialize database
npm run setup-db

# 5. Start server (production)
NODE_ENV=production node server.js

# 6. Or use PM2 for process management
npm install -g pm2
pm2 start server.js --name gridtvsports
pm2 save
pm2 startup
```

#### **Nginx Reverse Proxy** (recommended):
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🔧 Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgresql://user:pass@host:5432/db?sslmode=require` |
| `PORT` | No | Server port (default: 3001) | `3001` |
| `NODE_ENV` | No | Environment mode | `production` |

---

## 🚦 Health Checks

### **API Endpoints**
- `GET /` - Homepage (sport selection)
- `GET /api/nfl/scoreboard` - NFL games
- `GET /api/nba/scoreboard` - NBA games
- `GET /api/mlb/scoreboard` - MLB games
- `GET /api/nhl/scoreboard` - NHL games

### **Test Deployment**
```bash
# Check if server is running
curl http://your-domain.com/api/nfl/scoreboard

# Should return JSON with games data
```

---

## 📊 Performance

### **Caching Strategy**
- **Live games**: 15 seconds in-memory cache
- **Completed games**: Permanent PostgreSQL storage
- **API calls**: ~1,590/day (71% reduction with database)

### **Resource Requirements**
- **CPU**: 1 vCPU minimum
- **RAM**: 512 MB minimum (1 GB recommended)
- **Storage**: 1 GB minimum
- **Database**: PostgreSQL (Azure Flexible Server Basic tier sufficient)

---

## 🐛 Troubleshooting

### **Build Fails with "vite: Permission denied"**
✅ **FIXED!** Updated `package.json` to remove Vite dependency.

### **Database Connection Error**
```bash
# Test database connection
npm run test-db

# Reinitialize database tables
npm run setup-db
```

### **Application Won't Start**
```bash
# Check logs
npm start

# Common issues:
# 1. Missing DATABASE_URL in .env
# 2. Wrong port (default is 3001)
# 3. Database not initialized
```

### **Games Not Displaying**
- Check ESPN API is accessible
- Verify date format is correct (YYYYMMDD for NBA/MLB/NHL)
- Check browser console for errors

---

## 📝 Post-Deployment Checklist

- ✅ Database initialized (`npm run setup-db`)
- ✅ Environment variables configured
- ✅ Server starts without errors
- ✅ All 4 sport pages load correctly
- ✅ Games display with live data
- ✅ Animations working
- ✅ Sports Bar Mode functional
- ✅ Database saving completed games

---

## 🎯 Next Steps After Deployment

1. **Test Each Sport Page**:
   - http://your-domain.com/nfl.html
   - http://your-domain.com/nba.html
   - http://your-domain.com/mlb.html
   - http://your-domain.com/nhl.html

2. **Verify Database Integration**:
   - Wait for games to complete
   - Check database for saved records
   - Verify completed games load from DB (not API)

3. **Monitor Performance**:
   - Check API call count
   - Monitor response times
   - Review database query performance

---

## 📚 Additional Resources

- **Repository**: https://github.com/fredaum666/GridTVSports
- **Database Setup**: See `DB_SETUP_README.md`
- **Animations**: See `ANIMATIONS_GUIDE.md`
- **Database Strategy**: See `DATABASE_STRATEGY.md`

---

**Deployment successful?** You should see all 4 sports loading with live games! 🎉
