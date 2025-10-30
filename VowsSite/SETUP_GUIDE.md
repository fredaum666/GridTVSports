# VowsSite Quick Setup Guide

## ⚠️ Important: The errors you're seeing are because the API server isn't running yet!

Follow these steps to get VowsSite working:

---

## Step 1: Create the Database

You need to create a **separate database** for VowsSite on your PostgreSQL server.

### Option A: Using Azure Portal (if using Azure PostgreSQL)
1. Go to your Azure PostgreSQL server
2. Create a new database named `vows_wedding`
3. Note: Keep your existing `postgres` database for GridTVSports

### Option B: Using psql Command Line
```bash
psql -h gridtvsport.postgres.database.azure.com -U Fredaum666 -d postgres
```

Then run:
```sql
CREATE DATABASE vows_wedding;
\q
```

### Option C: Using pgAdmin or Other GUI Tool
1. Connect to your PostgreSQL server
2. Right-click "Databases" → "Create" → "Database"
3. Name it: `vows_wedding`
4. Click "Save"

---

## Step 2: Verify Environment Variables

The `.env` file in the root directory has already been updated with:

```env
VOWS_DATABASE_URL=postgresql://Fredaum666:FM|031188@gridtvsport.postgres.database.azure.com:5432/vows_wedding?sslmode=require
VOWS_API_PORT=3001
```

✅ This is already configured!

---

## Step 3: Install Dependencies

Open a terminal in the VowsSite folder:

```bash
cd VowsSite
npm install
```

This will install:
- express (API server)
- pg (PostgreSQL client)
- cors (CORS support)
- dotenv (environment variables)

---

## Step 4: Initialize Database Tables

Run this command to create the vows tables:

```bash
npm run init-db
```

This will create three tables:
- ✅ `vows` - Stores wedding vows in both languages
- ✅ `unlock_status` - Tracks visibility status
- ✅ `admin_settings` - Stores admin password

---

## Step 5: Start the Server

### Option A: Using the Batch File (Easy!)
Double-click: `start-vows-server.bat`

### Option B: Using npm
```bash
npm start
```

### Option C: Using Node directly
```bash
node vows-api.js
```

---

## Step 6: Access the Application

Once the server is running, you'll see:

```
✅ VowsSite Database connected successfully
🔧 Initializing VowsSite database tables...
✅ VowsSite database tables initialized successfully
🌐 VowsSite API server running on http://localhost:3001
📝 Admin panel: http://localhost:3001/admin
👀 Vows display: http://localhost:3001/
```

Now you can:
- **Open Admin Panel**: http://localhost:3001/admin
- **View Guest Display**: http://localhost:3001/

---

## Troubleshooting

### Error: "VOWS_DATABASE_URL is not set"
- Make sure `.env` file exists in the **root GridTVSports folder** (not in VowsSite folder)
- Check that `VOWS_DATABASE_URL` is defined in `.env`

### Error: "database vows_wedding does not exist"
- You need to create the `vows_wedding` database first (see Step 1)
- Run: `CREATE DATABASE vows_wedding;` in your PostgreSQL server

### Error: "relation vows does not exist"
- You need to run the database initialization (see Step 4)
- Run: `npm run init-db`

### Error: "Port 3001 is already in use"
- Another application is using port 3001
- Change the port in `.env`: `VOWS_API_PORT=3002`
- Update the API_URL in admin.html and script.js to use the new port

### 404 Errors in Browser Console
- The API server isn't running!
- Start the server using one of the methods in Step 5

---

## Testing the Setup

1. **Start the server** (Step 5)
2. **Open admin panel**: http://localhost:3001/admin
3. **Check unlock status** - You should see "🔒 Vows are currently LOCKED"
4. **Go to Edit Vows tab**
5. **Click 🇺🇸 English flag** and enter test data:
   - Groom's Name: John
   - Groom's Vows: My dear bride...
6. **Click 🇧🇷 Português flag** and enter test data:
   - Groom's Name: João
   - Groom's Vows: Minha querida noiva...
7. Repeat for bride
8. **Click Save Vows** and enter password: `wedding2024`
9. You should see: "✓ Vows saved successfully to database!"

---

## Default Admin Password

**Password**: `wedding2024`

To change it, update the database:
```sql
UPDATE admin_settings
SET setting_value = 'your_new_password'
WHERE setting_key = 'admin_password';
```

---

## Need Help?

Check these logs for errors:
- **Browser Console**: F12 → Console tab
- **Server Terminal**: Look for error messages in the terminal where you started the server
- **Database Connection**: Verify your PostgreSQL credentials are correct

---

## Summary

✅ Create `vows_wedding` database
✅ Run `npm install`
✅ Run `npm run init-db`
✅ Run `npm start` or `start-vows-server.bat`
✅ Open http://localhost:3001/admin

That's it! 🎉
