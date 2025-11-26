# Stripe Payment Integration - Setup Guide
## GridTV Sports Subscription System

This guide will walk you through setting up Stripe payments for GridTV Sports.

---

## Prerequisites

- Stripe account (free to create at [stripe.com](https://stripe.com))
- GridTV Sports application running locally or on a server

---

## Step 1: Create a Stripe Account

1. Go to [https://stripe.com](https://stripe.com)
2. Click **Sign up**
3. Complete the registration process
4. You'll be placed in **Test Mode** by default (perfect for development)

---

## Step 2: Get Your API Keys

### 2.1 Navigate to API Keys
1. Log into your Stripe Dashboard
2. Click **Developers** in the left sidebar
3. Click **API keys**

### 2.2 Copy Your Keys
You'll see two keys in **Test mode**:

- **Publishable key** (starts with `pk_test_`)
- **Secret key** (starts with `sk_test_`) - Click **Reveal test key**

**Important:** Keep your secret key private! Never commit it to git.

---

## Step 3: Create Subscription Products

### 3.1 Create Monthly Plan
1. In Stripe Dashboard, click **Products** in the left sidebar
2. Click **+ Add product**
3. Fill in the details:
   - **Name:** `GridTV Sports Monthly`
   - **Description:** `Monthly subscription to GridTV Sports - All live sports coverage`
   - **Pricing model:** `Recurring`
   - **Price:** `$9.99`
   - **Billing period:** `Monthly`
4. Click **Add product**
5. **Copy the Price ID** (starts with `price_`) - you'll need this!

### 3.2 Create Yearly Plan
1. Click **+ Add product** again
2. Fill in the details:
   - **Name:** `GridTV Sports Yearly`
   - **Description:** `Yearly subscription to GridTV Sports - Save 17%!`
   - **Pricing model:** `Recurring`
   - **Price:** `$99.99`
   - **Billing period:** `Yearly`
3. Click **Add product**
4. **Copy the Price ID** (starts with `price_`) - you'll need this!

---

## Step 4: Set Up Webhook

### 4.1 Create Webhook Endpoint
1. In Stripe Dashboard, click **Developers** → **Webhooks**
2. Click **+ Add endpoint**
3. Enter your endpoint URL:
   - **Local development:** `https://your-ngrok-url.ngrok.io/api/webhook/stripe`
   - **Production:** `https://your-domain.com/api/webhook/stripe`

### 4.2 Select Events to Listen To
Select these events (or select **Select all events** for simplicity):
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

### 4.3 Get Webhook Secret
1. After creating the webhook, click on it
2. Click **Reveal** next to **Signing secret**
3. Copy the webhook secret (starts with `whsec_`)

**Note for Local Development:**
To test webhooks locally, you'll need to use the [Stripe CLI](https://stripe.com/docs/stripe-cli) or a tunneling service like [ngrok](https://ngrok.com/).

---

## Step 5: Update Your .env File

Open your `.env` file and replace the placeholder values:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_YOUR_ACTUAL_SECRET_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_ACTUAL_PUBLISHABLE_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_ACTUAL_WEBHOOK_SECRET_HERE

# Subscription Price IDs (from Step 3)
STRIPE_MONTHLY_PRICE_ID=price_YOUR_MONTHLY_PRICE_ID_HERE
STRIPE_YEARLY_PRICE_ID=price_YOUR_YEARLY_PRICE_ID_HERE
```

**Example with real values:**
```env
STRIPE_SECRET_KEY=sk_test_51MabcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ
STRIPE_PUBLISHABLE_KEY=pk_test_51Mabcdefghijklmnopqrstuvwxyz
STRIPE_WEBHOOK_SECRET=whsec_abcdefghijklmnopqrstuvwxyz1234567890
STRIPE_MONTHLY_PRICE_ID=price_1MabcdefghijklmnopqrstuV
STRIPE_YEARLY_PRICE_ID=price_1MzyxwvutsrqponmlkjihgfE
```

---

## Step 6: Restart Your Server

After updating the `.env` file, restart your Node.js server:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
node server.js
```

You should see:
```
✅ Stripe initialized
```

If you see:
```
⚠️ Stripe not configured - subscription features disabled
```
Then check your `.env` file for typos or missing values.

---

## Step 7: Test the Integration

### 7.1 Create a Test User
1. Navigate to `http://localhost:3000/login`
2. Register a new account (or use an existing test account)

### 7.2 Access Pricing Page
1. Navigate to `http://localhost:3000/pricing`
2. You should see two subscription plans (Monthly and Yearly)

### 7.3 Test Checkout Flow
1. Click **Subscribe Monthly** or **Subscribe Yearly**
2. You'll be redirected to Stripe Checkout
3. Use Stripe's test card numbers:
   - **Success:** `4242 4242 4242 4242`
   - **Decline:** `4000 0000 0000 0002`
   - **Future date:** Any future date (e.g., 12/34)
   - **CVC:** Any 3 digits (e.g., 123)
   - **ZIP:** Any 5 digits (e.g., 12345)

### 7.4 Complete Payment
1. Enter test card details
2. Click **Subscribe**
3. You should be redirected back to `/subscription?success=true`
4. Your subscription status should show as **Active**

### 7.5 Test Customer Portal
1. On the subscription page, click **Manage Billing**
2. You'll be redirected to Stripe Customer Portal
3. Here you can:
   - Update payment method
   - Cancel subscription
   - View invoices

---

## Step 8: Verify Webhook Events

### 8.1 Check Stripe Dashboard
1. Go to **Developers** → **Webhooks**
2. Click on your webhook endpoint
3. You should see events listed (e.g., `checkout.session.completed`)

### 8.2 Check Server Logs
Your Node.js server should log webhook events:
```
💳 Webhook received: checkout.session.completed
✅ Subscription created for user 123
```

---

## Step 9: Go Live (Production)

### 9.1 Activate Your Stripe Account
1. Complete Stripe's account verification
2. Switch from **Test mode** to **Live mode** in the dashboard

### 9.2 Get Live API Keys
1. In **Live mode**, go to **Developers** → **API keys**
2. Copy your **live keys** (start with `pk_live_` and `sk_live_`)

### 9.3 Create Live Products
Repeat Step 3 in **Live mode** to create your production products

### 9.4 Update Production .env
Update your production `.env` file with **live** keys and price IDs

### 9.5 Configure Live Webhook
1. In **Live mode**, go to **Developers** → **Webhooks**
2. Add your production webhook endpoint
3. Copy the **live** webhook secret

---

## Troubleshooting

### Issue: "Stripe not configured" message

**Solution:**
- Check that `.env` file has valid Stripe keys
- Ensure keys don't contain placeholder text like `your_stripe_`
- Restart the server after updating `.env`

### Issue: Checkout button does nothing

**Solution:**
- Check browser console for errors
- Verify publishable key is correct in `/api/subscription/config`
- Ensure user is logged in

### Issue: Webhook events not received

**Solution:**
- For local development, use Stripe CLI or ngrok
- Verify webhook URL is publicly accessible
- Check webhook secret is correct in `.env`
- Ensure events are selected in Stripe Dashboard

### Issue: Payment succeeds but subscription not created

**Solution:**
- Check server logs for errors
- Verify database connection is working
- Ensure `subscriptions` table exists (run SQL schema)
- Check webhook handler in server.js for errors

---

## Database Schema

Ensure these tables exist in your PostgreSQL database:

```sql
-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  stripe_subscription_id VARCHAR(255) UNIQUE,
  status VARCHAR(50),
  plan VARCHAR(50),
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  stripe_payment_intent_id VARCHAR(255),
  amount INTEGER,
  currency VARCHAR(3),
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  stripe_invoice_id VARCHAR(255) UNIQUE,
  amount_paid INTEGER,
  amount_due INTEGER,
  currency VARCHAR(3),
  status VARCHAR(50),
  invoice_pdf VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add Stripe customer ID to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255) UNIQUE;
```

---

## Testing Checklist

- [ ] Stripe API keys configured in `.env`
- [ ] Monthly and Yearly products created in Stripe
- [ ] Price IDs added to `.env`
- [ ] Webhook endpoint created
- [ ] Webhook secret added to `.env`
- [ ] Server shows "✅ Stripe initialized"
- [ ] Pricing page loads successfully
- [ ] Can initiate checkout flow
- [ ] Test payment completes successfully
- [ ] Subscription shows as "Active" after payment
- [ ] Customer portal opens correctly
- [ ] Webhooks appear in Stripe Dashboard
- [ ] Database subscriptions table updated

---

## Security Best Practices

1. **Never commit API keys to git**
   - Add `.env` to `.gitignore`
   - Use environment variables in production

2. **Use HTTPS in production**
   - Stripe requires HTTPS for webhooks
   - Obtain SSL certificate for your domain

3. **Validate webhook signatures**
   - Already implemented in `server.js`
   - Prevents unauthorized webhook calls

4. **Secure your database**
   - Use strong passwords
   - Limit database access
   - Regular backups

5. **Monitor failed payments**
   - Set up email notifications
   - Handle dunning (retry failed payments)

---

## Additional Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Testing Cards](https://stripe.com/docs/testing)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [Webhooks Guide](https://stripe.com/docs/webhooks)
- [Customer Portal](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)

---

## Support

If you encounter issues:
1. Check server logs for errors
2. Review Stripe Dashboard for webhook delivery status
3. Verify all environment variables are set correctly
4. Consult Stripe documentation
5. Contact Stripe support (excellent support team!)

---

**Your Stripe integration is now complete!** 🎉

Users can subscribe via `/pricing` and manage their subscription via `/subscription`.
