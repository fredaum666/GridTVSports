# Stripe Azure Troubleshooting Guide

## 🔍 Required Environment Variables

Your application requires these Stripe environment variables in Azure:

1. **STRIPE_SECRET_KEY** - Your Stripe secret key (starts with `sk_live_` or `sk_test_`)
2. **STRIPE_PUBLISHABLE_KEY** - Your Stripe publishable key (starts with `pk_live_` or `pk_test_`)
3. **STRIPE_WEBHOOK_SECRET** - Your webhook signing secret (starts with `whsec_`)
4. **STRIPE_MONTHLY_PRICE_ID** - Monthly subscription price ID (starts with `price_`)
5. **STRIPE_YEARLY_PRICE_ID** - Yearly subscription price ID (starts with `price_`)

---

## 🚨 Common Issues & Solutions

### Issue 1: Azure Key Vault References Not Loading

**Symptom**: Stripe shows as "not configured" even though variables are set

**Problem**: Your code at line 47 checks:
```javascript
!process.env.STRIPE_SECRET_KEY.includes('@Microsoft.KeyVault')
```

This means if you're using Azure Key Vault references like:
```
@Microsoft.KeyVault(SecretUri=https://...)
```

The app will think Stripe is **NOT** configured!

**Solutions**:

#### Option A: Use Direct Values (Recommended for Testing)
1. In Azure Portal → App Service → Configuration → Application settings
2. For each Stripe variable, ensure the value is the **actual Stripe key**, not a Key Vault reference
3. Example:
   - ❌ `@Microsoft.KeyVault(SecretUri=https://...)`
   - ✅ `sk_test_51abc...` (actual key)

#### Option B: Update Code to Support Key Vault
Edit `server.js` around line 45-50 to remove the Key Vault check:

```javascript
const stripeConfigured = process.env.STRIPE_SECRET_KEY &&
  process.env.STRIPE_SECRET_KEY.length > 10 &&
  !process.env.STRIPE_SECRET_KEY.includes('your_stripe');
```

---

### Issue 2: Environment Variables Not Reloaded After Changes

**Symptom**: You set the variables but app still doesn't work

**Solution**: After changing environment variables in Azure:
1. Go to Azure Portal → App Service → Overview
2. Click **Restart**
3. Wait 1-2 minutes for full restart
4. Check logs: Azure Portal → App Service → Log stream

---

### Issue 3: Wrong Stripe Mode (Test vs Live)

**Symptom**: Works locally but not in production

**Problem**: Using test keys locally but live keys in production (or vice versa)

**Check**:
- Local `.env`: Should use `sk_test_...` and `pk_test_...`
- Azure Production: Should use `sk_live_...` and `pk_live_...`
- Both modes need their own Price IDs and Webhook secrets!

**Solution**:
1. In Stripe Dashboard, switch between Test/Live mode (top right)
2. Copy the correct keys for each environment
3. Ensure webhook endpoints are configured for the right mode

---

### Issue 4: Webhook Not Configured

**Symptom**: Subscriptions created but user status not updated

**Problem**: Stripe webhook not pointing to your Azure URL

**Solution**:
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-azure-app.azurewebsites.net/api/webhook/stripe`
3. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the **Signing secret** (starts with `whsec_`)
5. Add to Azure as `STRIPE_WEBHOOK_SECRET`

---

### Issue 5: Missing Price IDs

**Symptom**: Error when trying to subscribe

**Problem**: `STRIPE_MONTHLY_PRICE_ID` or `STRIPE_YEARLY_PRICE_ID` not set

**Solution**:
1. In Stripe Dashboard → Products
2. Find your subscription products
3. Click on each product → Copy the Price ID (starts with `price_`)
4. Add to Azure:
   - `STRIPE_MONTHLY_PRICE_ID` = `price_xxx...`
   - `STRIPE_YEARLY_PRICE_ID` = `price_yyy...`

---

### Issue 6: CORS Issues

**Symptom**: Stripe checkout redirects fail

**Problem**: `ALLOWED_ORIGIN` not set correctly

**Solution**:
Set in Azure Application Settings:
```
ALLOWED_ORIGIN = https://your-domain.com
```

Or for testing:
```
ALLOWED_ORIGIN = https://your-azure-app.azurewebsites.net
```

---

## 🔧 Diagnostic Endpoint

Add this temporary endpoint to check Stripe configuration (remove after testing):

```javascript
// Add to server.js for debugging (REMOVE IN PRODUCTION)
app.get('/api/debug/stripe-config', (req, res) => {
  if (process.env.NODE_ENV !== 'production') {
    res.json({
      stripeConfigured: !!stripe,
      hasSecretKey: !!process.env.STRIPE_SECRET_KEY,
      secretKeyPreview: process.env.STRIPE_SECRET_KEY ?
        process.env.STRIPE_SECRET_KEY.substring(0, 7) + '...' : 'missing',
      hasPublishableKey: !!process.env.STRIPE_PUBLISHABLE_KEY,
      publishableKeyPreview: process.env.STRIPE_PUBLISHABLE_KEY ?
        process.env.STRIPE_PUBLISHABLE_KEY.substring(0, 7) + '...' : 'missing',
      hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      hasMonthlyPrice: !!process.env.STRIPE_MONTHLY_PRICE_ID,
      hasYearlyPrice: !!process.env.STRIPE_YEARLY_PRICE_ID,
    });
  } else {
    res.status(403).json({ error: 'Debug endpoint disabled in production' });
  }
});
```

Then visit: `https://your-app.azurewebsites.net/api/debug/stripe-config`

---

## 📋 Checklist

Use this checklist to verify everything:

- [ ] All 5 Stripe environment variables are set in Azure Application Settings
- [ ] Values are actual Stripe keys (not Key Vault references)
- [ ] Keys match the environment (test keys for staging, live keys for production)
- [ ] App has been **restarted** after setting variables
- [ ] Stripe webhook is configured at `/api/webhook/stripe`
- [ ] Webhook secret matches `STRIPE_WEBHOOK_SECRET` in Azure
- [ ] `NODE_ENV=production` is set in Azure
- [ ] Checked Azure logs for Stripe initialization message
- [ ] Browser console shows no CORS errors
- [ ] Can access `/api/subscription/plans` endpoint

---

## 🔍 How to Check Azure Logs

1. Azure Portal → Your App Service → **Log stream**
2. Look for these messages on startup:
   ```
   ✅ Stripe initialized successfully
   ```

   OR

   ```
   ⚠️ Stripe not configured - subscription features disabled
   ```

3. If you see the warning, check:
   - Is `STRIPE_SECRET_KEY` actually set?
   - Does it contain `@Microsoft.KeyVault`?
   - Does it contain `your_stripe` (placeholder)?

---

## 🆘 Still Not Working?

1. **Check startup logs** in Azure Log Stream
2. **Test the config endpoint** (add diagnostic endpoint above)
3. **Verify webhook** is receiving events in Stripe Dashboard
4. **Check browser console** for JavaScript errors
5. **Test locally** with the EXACT same environment variables

---

## 💡 Quick Fix Script

Run this in Azure Cloud Shell or locally:

```bash
# Set all Stripe variables at once
az webapp config appsettings set \
  --name your-app-name \
  --resource-group your-resource-group \
  --settings \
    STRIPE_SECRET_KEY="sk_live_your_key" \
    STRIPE_PUBLISHABLE_KEY="pk_live_your_key" \
    STRIPE_WEBHOOK_SECRET="whsec_your_secret" \
    STRIPE_MONTHLY_PRICE_ID="price_your_monthly_id" \
    STRIPE_YEARLY_PRICE_ID="price_your_yearly_id"

# Restart the app
az webapp restart --name your-app-name --resource-group your-resource-group
```

Replace `your-app-name`, `your-resource-group`, and the actual Stripe values.
