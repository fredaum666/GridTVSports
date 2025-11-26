# Stripe Integration - Quick Start Checklist

## ✅ What's Already Done

Your Stripe integration is **fully implemented** in the codebase:

### Backend (server.js)
- ✅ Stripe initialization with API keys
- ✅ `/api/subscription/config` - Get publishable key
- ✅ `/api/subscription/plans` - Get available plans
- ✅ `/api/subscription/status` - Get user subscription status
- ✅ `/api/subscription/create-checkout` - Create Stripe checkout session
- ✅ `/api/subscription/portal` - Open billing portal
- ✅ `/api/webhook/stripe` - Handle Stripe webhooks
- ✅ Complete webhook event handlers (checkout, subscription updates, payments)

### Frontend
- ✅ `/pricing` - Beautiful pricing page with Monthly ($9.99) and Yearly ($99.99) plans
- ✅ `/subscription` - Subscription management page
- ✅ Stripe.js integration for checkout
- ✅ Success/cancel redirect handling
- ✅ Customer portal integration

### Database
- ✅ `subscriptions` table
- ✅ `payment_history` table
- ✅ `subscription_plans` table
- ✅ User subscription status fields

---

## 🚀 What You Need to Do

### 1. Get Stripe Account (5 minutes)
- [ ] Sign up at [stripe.com](https://stripe.com) (free)
- [ ] Complete registration (stay in Test mode)

### 2. Get API Keys (2 minutes)
- [ ] Go to Stripe Dashboard → **Developers** → **API keys**
- [ ] Copy **Publishable key** (starts with `pk_test_`)
- [ ] Click **Reveal test key** and copy **Secret key** (starts with `sk_test_`)

### 3. Create Products (5 minutes)
- [ ] Go to **Products** → **+ Add product**
- [ ] Create **Monthly Plan**: Name: "GridTV Sports Monthly", Price: $9.99, Billing: Monthly
- [ ] Copy the **Price ID** (starts with `price_`)
- [ ] Create **Yearly Plan**: Name: "GridTV Sports Yearly", Price: $99.99, Billing: Yearly
- [ ] Copy the **Price ID**

### 4. Set Up Webhook (3 minutes)

**For Local Testing (using Stripe CLI):**
```bash
# Install Stripe CLI
# Windows: scoop install stripe
# Mac: brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhook/stripe
```
This will give you a **webhook secret** (starts with `whsec_`)

**For Production:**
- [ ] Go to **Developers** → **Webhooks** → **+ Add endpoint**
- [ ] Enter URL: `https://your-domain.com/api/webhook/stripe`
- [ ] Select events or choose **Select all events**
- [ ] Copy the **Signing secret** (starts with `whsec_`)

### 5. Update .env File (2 minutes)

Open `.env` and replace these values:

```env
# Replace these with your actual Stripe keys:
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET

# Replace with your actual Price IDs from Step 3:
STRIPE_MONTHLY_PRICE_ID=price_YOUR_MONTHLY_PRICE_ID
STRIPE_YEARLY_PRICE_ID=price_YOUR_YEARLY_PRICE_ID
```

### 6. Restart Server (30 seconds)
```bash
# Stop server (Ctrl+C) and restart
node server.js
```

**You should see:** `✅ Stripe initialized`

---

## 🧪 Test It (5 minutes)

### Step 1: Open Pricing Page
```
http://localhost:3000/pricing
```

### Step 2: Subscribe
1. Click **Subscribe Monthly** or **Subscribe Yearly**
2. You'll be redirected to Stripe Checkout

### Step 3: Use Test Card
- **Card:** `4242 4242 4242 4242`
- **Expiry:** Any future date (e.g., `12/34`)
- **CVC:** Any 3 digits (e.g., `123`)
- **ZIP:** Any 5 digits (e.g., `12345`)

### Step 4: Complete Payment
- Click **Subscribe**
- You'll be redirected to `/subscription?success=true`
- Status should show: **Active**

### Step 5: Test Customer Portal
- Click **Manage Billing**
- You can update payment method or cancel subscription

---

## 🔍 Verify Everything Works

### Check Stripe Dashboard
- Go to **Customers** - You should see your test customer
- Go to **Subscriptions** - You should see active subscription
- Go to **Developers** → **Webhooks** - You should see webhook events

### Check Server Logs
You should see:
```
✅ Stripe initialized
💳 Webhook received: checkout.session.completed
✅ Subscription created for user 1
```

### Check Database
```sql
-- Check subscriptions table
SELECT * FROM subscriptions;

-- Check payment history
SELECT * FROM payment_history;

-- Check user subscription status
SELECT id, email, subscription_status, subscription_plan FROM users;
```

---

## 📱 User Flow

### New User Journey
1. User registers → Gets **10-day free trial**
2. User can access all features during trial
3. User visits `/pricing` to subscribe
4. User selects Monthly or Yearly plan
5. Stripe Checkout opens
6. User enters payment info
7. Payment succeeds → Subscription activated
8. User can manage subscription at `/subscription`

### Existing User Journey
1. User logs in
2. If trial expired → Prompted to subscribe
3. If subscribed → Full access to all features
4. User can manage/cancel at `/subscription`

---

## 🎯 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| "Stripe not configured" | Check `.env` file has valid keys (no placeholders) |
| Checkout button does nothing | Open browser console for errors, verify user is logged in |
| Webhook not received | Use Stripe CLI for local testing: `stripe listen --forward-to localhost:3000/api/webhook/stripe` |
| Payment succeeds but subscription not created | Check server logs, verify webhook secret is correct |

---

## 🎉 You're Done!

Total setup time: **~20 minutes**

Your subscription system is now fully functional with:
- ✅ Two pricing tiers (Monthly & Yearly)
- ✅ 10-day free trial for new users
- ✅ Secure payment processing via Stripe
- ✅ Self-service customer portal
- ✅ Automatic subscription management
- ✅ Payment history tracking

---

## 📚 Next Steps

1. **Test thoroughly** with different scenarios
2. **Customize pricing** in server.js if needed
3. **Add navigation links** to pricing page from your main app
4. **Set up email notifications** for subscription events
5. **Go live** when ready (see full guide for production setup)

---

## 🔗 Quick Links

- [Full Setup Guide](STRIPE_SETUP_GUIDE.md) - Detailed step-by-step instructions
- [Stripe Dashboard](https://dashboard.stripe.com)
- [Stripe Test Cards](https://stripe.com/docs/testing)
- [Stripe Documentation](https://stripe.com/docs)

---

**Need help?** Check the [STRIPE_SETUP_GUIDE.md](STRIPE_SETUP_GUIDE.md) for detailed troubleshooting.
