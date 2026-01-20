# Adding specialized Resort Email Sender

Follow these steps to authorize `honeymoonhavenresort.lc@gmail.com` for sending system emails.

## Step 1: Generate an App Password
Since the application uses Gmail servers securely, you cannot use your standard login password. You must generate a specific "App Password".

1.  **Log in** to the Gmail account for `honeymoonhavenresort.lc@gmail.com`.
2.  Go to **Manage your Google Account** > **Security**.
3.  Under "How you sign in to Google", ensure **2-Step Verification** is turned **ON**. (This is required to use App Passwords).
4.  In the search bar at the top, search for **"App Passwords"** (or look under 2-Step Verification settings).
5.  Create a new App Password:
    *   **App name**: Enter "Honeymoon Haven App"
    *   Click **Create**.
6.  **Copy the 16-character password** shown on screen. You will need this for the next step.

## Step 2: Configure Firebase Secrets
You need to save these credentials securely in the Firebase backend so the server can use them.

Open your terminal in the project directory (`/Users/bryanhudson/dev/honeymoon-haven`) and run the following commands.

### 1. Set the Email Address
Run this command and when prompted, enter: `honeymoonhavenresort.lc@gmail.com`
```bash
firebase functions:secrets:set RESORT_EMAIL
```

### 2. Set the App Password
Run this command and when prompted, paste the **16-character App Password** you generated in Step 1 (spaces are ignored, but try to paste it as one block).
```bash
firebase functions:secrets:set RESORT_APP_PASSWORD
```

## Step 3: Notify Me
Once you have successfully run the commands above, reply to me with:
**"Credentials set"**

I will then update the code to enable the new sender options without breaking the deployment.
