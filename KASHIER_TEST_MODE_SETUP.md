# Kashier Payment Integration - Test Mode Setup

## 📋 Overview
This guide explains how to set up Kashier payment gateway in **test mode** for the SmartLine wallet deposit feature.

## 🔑 Environment Variables Required

Add these to your `.env` file in `smartline-backend`:

```env
# Kashier Payment Gateway (Test Mode)
KASHIER_MERCHANT_ID=your_test_merchant_id
KASHIER_API_KEY=your_test_api_key
KASHIER_WEBHOOK_SECRET=your_test_webhook_secret
KASHIER_MODE=test
KASHIER_CURRENCY=EGP
```

## 🧪 Getting Test Credentials

1. **Sign up for Kashier Test Account**:
   - Visit: https://merchant.kashier.io/
   - Create an account or log in
   - Navigate to **Settings** → **API Keys**

2. **Get Your Test Credentials**:
   - **Merchant ID**: Found in your dashboard (e.g., `MID-123-456`)
   - **API Key**: Generate from API Keys section
   - **Webhook Secret**: Generate from Webhooks section

## 🧪 Test Card Numbers

Use these test cards in Kashier test mode:

### Successful Payment
```
Card Number: 4111 1111 1111 1111
CVV: Any 3 digits (e.g., 123)
Expiry: Any future date (e.g., 12/25)
Name: Any name
```

### Failed Payment (for testing)
```
Card Number: 4000 0000 0000 0002
CVV: 123
Expiry: 12/25
```

## 🔄 How It Works

1. **Driver initiates deposit**:
   - Opens wallet screen
   - Clicks "Deposit"
   - Enters amount (e.g., 200 EGP)
   - Clicks "Pay with Kashier"

2. **Payment flow**:
   - Backend creates pending transaction
   - Generates secure payment URL
   - Opens Kashier payment page in browser
   - Driver completes payment with test card

3. **Callback handling**:
   - Kashier sends callback to `/api/payment/callback`
   - Backend validates signature
   - Updates user balance
   - Marks transaction as completed

4. **Balance update**:
   - Wallet automatically refreshes after 3 seconds
   - Driver sees updated balance
   - Transaction appears in history

## 🌐 Ngrok Setup (for local testing)

Since Kashier needs to send callbacks to your backend, you need a public URL:

1. **Install Ngrok**:
   ```bash
   # Download from https://ngrok.com/download
   # Or use npm
   npm install -g ngrok
   ```

2. **Start Ngrok**:
   ```bash
   ngrok http 3000
   ```

3. **Update Callback URL**:
   - Ngrok will give you a URL like: `https://abc123.ngrok.io`
   - The backend automatically uses this for callbacks
   - Make sure your backend is running on port 3000

## ✅ Testing Checklist

- [ ] Environment variables configured in `.env`
- [ ] Backend server running (`npm run dev`)
- [ ] Ngrok tunnel active (if testing locally)
- [ ] Driver app connected to backend
- [ ] Test card numbers ready

## 🎯 Test Scenarios

### Scenario 1: Successful Deposit
1. Open wallet in driver app
2. Click "Deposit"
3. Enter amount: 200
4. Click "Pay with Kashier"
5. Browser opens with Kashier page
6. Enter test card: 4111 1111 1111 1111
7. Complete payment
8. See success message
9. Return to app
10. Wallet balance updated (+200 EGP)

### Scenario 2: Failed Payment
1. Same steps as above
2. Use failed test card: 4000 0000 0000 0002
3. See failure message
4. Balance remains unchanged
5. Transaction marked as "failed" in history

## 🐛 Troubleshooting

### Issue: "Invalid environment variables"
- **Solution**: Check all KASHIER_* variables are set in `.env`

### Issue: Payment page doesn't open
- **Solution**: Check backend logs for payment URL generation errors

### Issue: Balance not updating after payment
- **Solution**: 
  - Check Ngrok is running
  - Verify callback URL is accessible
  - Check backend logs for callback errors

### Issue: "Invalid signature" error
- **Solution**: Verify KASHIER_WEBHOOK_SECRET matches your dashboard

## 📱 Mobile Testing Notes

- Payment opens in device browser (not in-app)
- After payment, user manually returns to app
- Wallet auto-refreshes after 3 seconds
- Pull-to-refresh available for manual refresh

## 🚀 Going Live

When ready for production:

1. Get production credentials from Kashier
2. Update `.env`:
   ```env
   KASHIER_MODE=live
   KASHIER_MERCHANT_ID=your_live_merchant_id
   KASHIER_API_KEY=your_live_api_key
   KASHIER_WEBHOOK_SECRET=your_live_webhook_secret
   ```
3. Deploy backend with public HTTPS URL
4. Update callback URLs in Kashier dashboard
5. Test with real cards (small amounts first)

## 📞 Support

- Kashier Docs: https://developers.kashier.io/
- Kashier Support: support@kashier.io
- Test Mode Dashboard: https://merchant.kashier.io/

---

**Note**: Always test thoroughly in test mode before going live!
