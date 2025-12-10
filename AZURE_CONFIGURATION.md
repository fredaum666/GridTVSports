# How to Configure Environment Variables in Azure

Since your local `.env` file is not uploaded to the cloud (for security), you must manually add these settings to your Azure App Service.

## Steps

1.  Log in to the **[Azure Portal](https://portal.azure.com/)**.
2.  Navigate to **App Services** and select your application (`GridTV Sports`).
3.  In the left sidebar, look under the **Settings** section.
    *   Click on **Environment variables** (sometimes labeled **Configuration**).
4.  Click the **+ Add** (or **+ New application setting**) button.
5.  Add the following settings one by one (copy values from your local `.env` file):

| Name | Value |
| :--- | :--- |
| `SMTP_HOST` | `smtp-mail.outlook.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `noreply@gridtvsports.com` |
| `SMTP_PASS` | *(Your App Password)* |
| `SMTP_SECURE` | `false` |
| `APP_URL` | `https://your-app-name.azurewebsites.net` |

6.  Click **Apply** or **OK** for each one.
7.  **IMPORTANT:** Click the **Save** button at the top of the page.
8.  The app will restart automatically. Once restarted, email sending will work.
