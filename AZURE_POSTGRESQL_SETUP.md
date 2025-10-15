# 🔧 Azure PostgreSQL Connection Guide

## Common Azure PostgreSQL Connection Issues & Solutions

### Issue 1: **Firewall Rules** (Most Common!)
Azure PostgreSQL blocks all connections by default.

**Solution**:
1. Go to Azure Portal → Your PostgreSQL Server
2. Click **"Connection security"** or **"Networking"**
3. Add firewall rule:
   - **Rule name**: `AllowMyIP` or `AllowAll`
   - **Start IP**: Your current IP or `0.0.0.0` (allow all - dev only!)
   - **End IP**: Your current IP or `255.255.255.255` (allow all - dev only!)
4. Check **"Allow access to Azure services"** = ON
5. Click **Save**

**Security Note**: For production, only allow specific IPs!

---

### Issue 2: **SSL/TLS Required**
Azure PostgreSQL requires SSL connections by default.

**Solution**: Add `?sslmode=require` to connection string

---

### Issue 3: **Wrong Connection String Format**
Azure uses a specific format for PostgreSQL connections.

**Correct Format**:
```
postgresql://username@servername:password@servername.postgres.database.azure.com:5432/databasename?sslmode=require
```

**Example**:
```
postgresql://gridtvadmin@gridtvsports:MyP@ssw0rd@gridtvsports.postgres.database.azure.com:5432/gridtvdb?sslmode=require
```

---

### Issue 4: **Username Format**
Azure requires `username@servername` format (not just `username`).

**Wrong**: `gridtvadmin`  
**Correct**: `gridtvadmin@gridtvsports`

---

## 📋 Step-by-Step Connection Setup

### Step 1: Get Your Connection Details from Azure

Go to Azure Portal → PostgreSQL Server → **Overview**:
- **Server name**: `yourserver.postgres.database.azure.com`
- **Server admin login**: `username@servername`
- **Database**: Your database name (e.g., `postgres` or custom)

### Step 2: Create `.env` File

Create `.env` in your project root:

```bash
# Azure PostgreSQL Connection
DATABASE_URL=postgresql://username@servername:password@servername.postgres.database.azure.com:5432/databasename?sslmode=require

# Example:
# DATABASE_URL=postgresql://gridtvadmin@gridtvsports:MySecureP@ss123@gridtvsports.postgres.database.azure.com:5432/gridtvdb?sslmode=require

# Server Port
PORT=3001
```

**Important**: Replace:
- `username@servername` with your actual username and server name
- `password` with your actual password
- `servername.postgres.database.azure.com` with your server URL
- `databasename` with your database name

### Step 3: Install PostgreSQL Package

```bash
npm install pg dotenv
```

### Step 4: Test Connection

Create `test-db.js`:

```javascript
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // For Azure
  }
});

async function testConnection() {
  try {
    console.log('🔄 Testing Azure PostgreSQL connection...');
    console.log('Connection string:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@')); // Hide password
    
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as version');
    
    console.log('✅ Connection successful!');
    console.log('📅 Server time:', result.rows[0].current_time);
    console.log('🔧 PostgreSQL version:', result.rows[0].version);
    
    client.release();
    await pool.end();
  } catch (error) {
    console.error('❌ Connection failed!');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    // Specific error help
    if (error.code === 'ENOTFOUND') {
      console.log('\n💡 Tip: Check your server name in connection string');
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      console.log('\n💡 Tip: Check Azure firewall rules - add your IP address');
    } else if (error.message.includes('password authentication failed')) {
      console.log('\n💡 Tip: Check username format (should be username@servername) and password');
    } else if (error.message.includes('SSL')) {
      console.log('\n💡 Tip: Add ?sslmode=require to connection string');
    }
    
    process.exit(1);
  }
}

testConnection();
```

Run it:
```bash
node test-db.js
```

---

## 🔍 Troubleshooting Checklist

### ✅ Checklist Before Running:
- [ ] Created PostgreSQL server in Azure
- [ ] Created database (or using default `postgres`)
- [ ] Added firewall rule with your IP
- [ ] Enabled "Allow access to Azure services"
- [ ] Connection string includes `?sslmode=require`
- [ ] Username format is `username@servername`
- [ ] Password is correct (no special URL characters)
- [ ] Created `.env` file with DATABASE_URL
- [ ] Installed `pg` and `dotenv` packages

---

## 🚨 Common Error Messages & Fixes

### Error: `ENOTFOUND`
```
Error: getaddrinfo ENOTFOUND yourserver.postgres.database.azure.com
```
**Fix**: Server name is wrong. Check Azure Portal for correct URL.

---

### Error: `ETIMEDOUT` or `ECONNREFUSED`
```
Error: connect ETIMEDOUT
Error: connect ECONNREFUSED
```
**Fix**: Firewall is blocking you. Add your IP to Azure firewall rules.

---

### Error: `password authentication failed`
```
error: password authentication failed for user "username@servername"
```
**Fix**: 
1. Check username format: `username@servername` (not just `username`)
2. Verify password is correct
3. Check if user exists in database

---

### Error: `SSL connection required`
```
Error: SSL connection is required
```
**Fix**: Add `?sslmode=require` to end of connection string.

---

### Error: `database "xyz" does not exist`
```
error: database "xyz" does not exist
```
**Fix**: Create database in Azure or use default `postgres` database.

---

## 🎯 Quick Azure PostgreSQL Setup

### Option 1: Azure Portal (Web UI)

1. **Create PostgreSQL Server**:
   - Go to Azure Portal
   - Create Resource → Databases → Azure Database for PostgreSQL
   - Choose "Flexible Server" (recommended) or "Single Server"
   - Fill in:
     - Server name: `gridtvsports` (must be unique)
     - Admin username: `gridtvadmin`
     - Password: Strong password
     - Region: Choose closest to you
     - Compute + Storage: Basic (cheapest for dev)

2. **Configure Firewall**:
   - Go to server → Networking/Connection security
   - Add rule: Start IP = `0.0.0.0`, End IP = `255.255.255.255` (dev only!)
   - Check "Allow access to Azure services"
   - Save

3. **Get Connection String**:
   - Go to server → Connection strings
   - Copy the Node.js connection string
   - Replace `{your_password}` with your actual password

### Option 2: Azure CLI (Command Line)

```bash
# Login
az login

# Create resource group
az group create --name GridTVSportsRG --location eastus

# Create PostgreSQL server
az postgres server create \
  --resource-group GridTVSportsRG \
  --name gridtvsports \
  --location eastus \
  --admin-user gridtvadmin \
  --admin-password "YourStrongP@ssw0rd123" \
  --sku-name B_Gen5_1 \
  --version 11

# Add firewall rule (allow all - dev only)
az postgres server firewall-rule create \
  --resource-group GridTVSportsRG \
  --server-name gridtvsports \
  --name AllowAll \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 255.255.255.255

# Get connection string
az postgres server show-connection-string \
  --server-name gridtvsports \
  --database-name postgres \
  --admin-user gridtvadmin \
  --admin-password "YourStrongP@ssw0rd123"
```

---

## 🔐 Connection String Examples

### Format 1: Full URL (Recommended)
```
postgresql://gridtvadmin@gridtvsports:MyP@ss123@gridtvsports.postgres.database.azure.com:5432/postgres?sslmode=require
```

### Format 2: Object (Alternative)
```javascript
const config = {
  host: 'gridtvsports.postgres.database.azure.com',
  port: 5432,
  database: 'postgres',
  user: 'gridtvadmin@gridtvsports',
  password: 'MyP@ss123',
  ssl: {
    rejectUnauthorized: false
  }
};
```

---

## 📊 Once Connected - Create Tables

```sql
-- Create games table
CREATE TABLE IF NOT EXISTS games (
  id VARCHAR(50) PRIMARY KEY,
  sport VARCHAR(10) NOT NULL,
  game_date DATE NOT NULL,
  week_number INT,
  season INT NOT NULL,
  status VARCHAR(20) NOT NULL,
  home_team VARCHAR(100),
  away_team VARCHAR(100),
  home_score INT,
  away_score INT,
  raw_data JSONB,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sport_date ON games(sport, game_date);
CREATE INDEX idx_status ON games(status);
CREATE INDEX idx_game_date ON games(game_date);

-- Test insert
INSERT INTO games (id, sport, game_date, season, status, home_team, away_team, home_score, away_score)
VALUES ('test-1', 'NFL', '2024-10-14', 2024, 'completed', 'Cowboys', 'Eagles', 28, 24);

-- Verify
SELECT * FROM games;
```

---

## 💡 Pro Tips

### 1. Use Connection Pooling
```javascript
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20, // Max connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### 2. Handle Connection Errors
```javascript
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});
```

### 3. Graceful Shutdown
```javascript
process.on('SIGTERM', async () => {
  await pool.end();
  console.log('Database pool closed');
});
```

---

## 🎬 Next Steps After Connection Works

1. ✅ Test connection with `node test-db.js`
2. ✅ Create tables (run SQL above)
3. ✅ Integrate with server.js
4. ✅ Start caching completed games
5. ✅ Enjoy 70% fewer API calls!

---

## 🆘 Still Having Issues?

Share these details:
1. Error message (full text)
2. Error code (e.g., ENOTFOUND, ETIMEDOUT)
3. Your connection string (hide password!)
4. Azure PostgreSQL version (Flexible/Single Server)
5. Have you added firewall rules?

I'll help debug! 🚀
