# 🔒 Azure PostgreSQL Private Access (VNet) - Connection Guide

## Your Current Setup

**Configuration**: Network with private access (virtual network integration)  
**Issue**: Cannot connect from local development machine  
**Why**: Database only accepts connections from within Azure VNet  

---

## 🎯 Solutions (Choose One)

### **Option 1: Enable Public Access** (Recommended for Development)

The easiest solution - change your database to allow public connections.

#### Steps:
1. Go to **Azure Portal** → Your PostgreSQL Server
2. Click **"Networking"** in left menu
3. Look for **"Public access"** tab at the top
4. **If you see it**: Switch to "Public access" mode
5. **If you DON'T see it**: You need to recreate the database (see Option 3)

**After enabling**:
- Add firewall rule: `0.0.0.0` to `255.255.255.255` (dev only)
- Test connection with `node test-db.js`

**Pros**: ✅ Simple, works from anywhere  
**Cons**: ⚠️ Need to recreate if option not available

---

### **Option 2: Use Azure VPN Gateway** (Enterprise Solution)

Connect your local machine to Azure VNet via VPN.

#### Steps:
1. **Create VPN Gateway** in your VNet
2. **Download VPN client** from Azure Portal
3. **Install and connect** on your local machine
4. **Test connection** with `node test-db.js`

**Cost**: ~$140/month for VPN Gateway  
**Pros**: ✅ Secure, production-ready  
**Cons**: ⚠️ Expensive, complex setup

---

### **Option 3: Recreate Database with Public Access** (Quick Fix)

If you can't switch to public access, recreate the database.

#### Steps to Recreate:

**1. Export existing data (if any)**:
```bash
# From Azure Cloud Shell or local with VPN
pg_dump -h yourserver.postgres.database.azure.com -U username dbname > backup.sql
```

**2. Delete current database server**:
- Go to Azure Portal → PostgreSQL Server
- Click "Delete"
- Confirm deletion

**3. Create NEW PostgreSQL server with Public Access**:

**Via Azure Portal**:
1. Create Resource → Azure Database for PostgreSQL
2. Choose **"Flexible Server"**
3. Fill basics (server name, username, password)
4. **CRITICAL**: In **"Networking"** tab:
   - Select **"Public access (allowed IP addresses)"**
   - ✅ Check "Allow public access from any Azure service"
   - Add your IP address
5. Create server
6. Get new connection string

**Via Azure CLI**:
```bash
# Create resource group (if needed)
az group create --name GridTVSportsRG --location eastus

# Create PostgreSQL with PUBLIC access
az postgres flexible-server create \
  --resource-group GridTVSportsRG \
  --name gridtvsports-public \
  --location eastus \
  --admin-user gridtvadmin \
  --admin-password "YourStrongP@ssw0rd123" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --version 14 \
  --storage-size 32 \
  --public-access 0.0.0.0-255.255.255.255
```

**4. Update your `.env` file** with new connection string

**5. Test connection**:
```bash
node test-db.js
```

**Pros**: ✅ Full control, no VPN needed  
**Cons**: ⚠️ Lose existing data (unless backed up)

---

### **Option 4: Deploy App to Azure** (Production Approach)

Run your Node.js app in Azure so it's inside the VNet.

#### Steps:
1. **Create Azure App Service** (or Container Instance)
2. **Connect App Service to same VNet** as PostgreSQL
3. **Deploy your app** to Azure
4. **App can now connect** to private PostgreSQL

**Cost**: ~$13/month (Basic App Service)  
**Pros**: ✅ Production-ready, secure  
**Cons**: ⚠️ Can't run locally for development

---

### **Option 5: Temporary Solution - Azure Cloud Shell** (Quick Test)

Use Azure Cloud Shell to test database from within Azure.

#### Steps:
1. Go to **Azure Portal**
2. Click **Cloud Shell** icon (>_) at top
3. Choose **Bash**
4. Install Node.js:
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
```
5. Clone your repo or create test file:
```bash
cat > test.js << 'EOF'
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'YOUR_CONNECTION_STRING_HERE',
  ssl: { rejectUnauthorized: false }
});

pool.query('SELECT NOW()', (err, res) => {
  console.log(err ? err : res.rows);
  pool.end();
});
EOF

npm install pg
node test.js
```

**Pros**: ✅ Free, quick test  
**Cons**: ⚠️ Can't develop locally

---

## 🎯 My Recommendation for You

### **For Local Development:**
**→ Option 3: Recreate with Public Access**

**Why**: 
- ✅ You can develop locally
- ✅ Simple connection setup
- ✅ No additional costs
- ✅ Easy to add firewall rules
- ✅ Works with `node test-db.js`

**Steps**:
1. Take note of current server details
2. Delete current private VNet database
3. Create new one with "Public access (allowed IP addresses)"
4. Add firewall rule: `0.0.0.0` to `255.255.255.255`
5. Update `.env` with new connection string
6. Run `node test-db.js` - should work!

---

### **For Production Deployment:**
**→ Option 4: Deploy to Azure + VNet**

**Why**:
- ✅ Maximum security
- ✅ Production best practice
- ✅ No public internet exposure
- ✅ Scalable

---

## 📝 Quick Create New PostgreSQL (Public Access)

### **Portal Method** (5 minutes):

1. **Delete old one** (if no critical data):
   - Azure Portal → PostgreSQL Server → Delete

2. **Create new one**:
   - Create Resource → **Azure Database for PostgreSQL flexible servers**
   - **Basics**:
     - Server name: `gridtvsports`
     - Admin username: `gridtvadmin`
     - Password: (strong password)
     - Location: (nearest region)
   - **Networking** tab:
     - ✅ **Select "Public access (allowed IP addresses)"**
     - ✅ Check "Allow public access from any Azure service"
     - Click "Add current client IP address"
     - Or add rule: `0.0.0.0` - `255.255.255.255`
   - Review + Create

3. **Get connection string**:
   - Go to server → Connect
   - Copy connection string
   - Format: 
   ```
   postgresql://gridtvadmin:PASSWORD@gridtvsports.postgres.database.azure.com:5432/postgres?sslmode=require
   ```

4. **Update .env**:
   ```bash
   DATABASE_URL=postgresql://gridtvadmin:YourPassword@gridtvsports.postgres.database.azure.com:5432/postgres?sslmode=require
   ```

5. **Test**:
   ```bash
   node test-db.js
   ```

---

## 🔧 If You MUST Keep VNet (Advanced)

### **Temporary Local Access via SSH Tunnel**:

1. **Create Azure VM in same VNet**:
   - Small VM (B1s, ~$10/month)
   - Must be in same VNet as PostgreSQL

2. **SSH into VM and create tunnel**:
   ```bash
   ssh -L 5432:your-postgres-server.postgres.database.azure.com:5432 user@vm-ip
   ```

3. **Connect to localhost**:
   ```bash
   DATABASE_URL=postgresql://username:password@localhost:5432/dbname
   ```

4. **Test**:
   ```bash
   node test-db.js
   ```

**Pros**: ✅ Keep VNet security  
**Cons**: ⚠️ Extra VM cost, complex setup

---

## ✅ Recommended Action Plan

### **Right Now (Development)**:
1. ✅ Create NEW PostgreSQL with **Public Access**
2. ✅ Add firewall rule allowing your IP
3. ✅ Update `.env` with new connection string
4. ✅ Test with `node test-db.js`
5. ✅ Start building your app!

### **Later (Production)**:
1. ✅ Create production database with **VNet**
2. ✅ Deploy app to Azure App Service
3. ✅ Connect App Service to VNet
4. ✅ Maximum security!

---

## 🎬 Quick Commands

### **Create Public PostgreSQL via CLI**:
```bash
# Login to Azure
az login

# Create resource group
az group create --name GridTVSportsRG --location eastus

# Create PUBLIC PostgreSQL Flexible Server
az postgres flexible-server create \
  --name gridtvsports \
  --resource-group GridTVSportsRG \
  --location eastus \
  --admin-user gridtvadmin \
  --admin-password "StrongP@ssw0rd123!" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --public-access 0.0.0.0 \
  --version 14

# Get connection string
az postgres flexible-server show-connection-string \
  --server-name gridtvsports \
  --database-name postgres \
  --admin-user gridtvadmin \
  --admin-password "StrongP@ssw0rd123!"
```

### **Test Connection**:
```bash
# Create .env file
echo "DATABASE_URL=postgresql://gridtvadmin:StrongP@ssw0rd123!@gridtvsports.postgres.database.azure.com:5432/postgres?sslmode=require" > .env

# Test
node test-db.js
```

---

## 💡 Summary

**Your Issue**: Database has Private VNet access only  
**Solution**: Create new database with Public Access  
**Time**: 10 minutes  
**Cost**: Same price, just different network config  
**Result**: Can connect from local machine! ✅

---

## 🆘 Need Help?

If you want to:
- **Keep VNet**: Use Option 2 (VPN) or Option 5 (Cloud Shell)
- **Develop locally**: Use Option 3 (Recreate with public access) ← **RECOMMENDED**
- **Production ready**: Use Option 4 (Deploy to Azure)

Let me know which option you want and I'll help you set it up! 🚀
