# Email Configuration Guide

The Password Reset functionality is fully implemented in the backend. To enable email sending, you need to configure the following environment variables in your `.env` file.

## Required Variables

Open the `.env` file in the root of your project and add/update these lines:

```env
# Email Configuration (SMTP)
# You can use services like Gmail, SendGrid, Mailgun, etc.
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_email_password
SMTP_SECURE=false # Set to true if using port 465
```

## Testing

If these variables are NOT set, the application runs in **Development Mode**:
- Password reset emails are **NOT** sent.
- Instead, the reset link is logged to the **server console**.
- You can manually copy the link from the console to reset the password.

## Verification

The system functionality has been verified:
1.  **Frontend**: The "Forgot Password" form correctly calls the API.
2.  **Backend**: The server generates a secure token and attempts to send an email (or logs to console).
3.  **Reset**: The "Reset Password" page correctly verifies the token and updates the user's password.
