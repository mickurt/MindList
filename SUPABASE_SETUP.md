# AgentList :: Detailed Setup Guide

## Step 1: Create a Supabase Project

1.  Go to [https://supabase.com](https://supabase.com) and click **"Start your project"**.
2.  Sign in with GitHub (easiest).
3.  Click **"New Project"**.
4.  Choose your organization (create one if needed).
5.  Fill in the details:
    *   **Name**: `AgentList`
    *   **Database Password**: Generate a strong password (copy it somewhere safe, though we won't strictly need it for the app connection).
    *   **Region**: Choose the closest one to you (e.g., `EU (Frankfurt)` or `US East`).
6.  Click **"Create new project"**. Wait for the database to provision (takes ~1-2 minutes).

## Step 2: Get API Keys

While waiting or once ready:
1.  Go to **Project Settings** (gear icon at the bottom of the left sidebar).
2.  Click **"API"** in the sidebar.
3.  Find the `Project URL` and `Project API keys` section.
4.  Copy these three values:
    *   **URL**: Look for `https://xyz.supabase.co`
    *   **anon public**: Look for the key labeled `anon` `public`
    *   **service_role secret**: Look for the key labeled `service_role` `secret` (you may need to reveal it).

## Step 3: Configure Environment Variables

1.  Open the file `.env.local` in your code editor (it's in the root folder `AgentList/`).
2.  Paste your keys like this:

    ```env
    NEXT_PUBLIC_SUPABASE_URL=YOUR_PROJECT_URL
    NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
    SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
    ```

    *(Replace `YOUR_...` with the actual values you copied).*

## Step 4: Create Database Tables

1.  Go back to your Supabase Dashboard.
2.  Click on **"SQL Editor"** (terminal icon in the left sidebar).
3.  Click **"New Query"**.
4.  Copy the **entire content** of the file `db_schema.sql` from your project folder.
5.  Paste it into the SQL Editor on the website.
6.  Click **"Run"** (bottom right).
    *   You should see `Success` in the results panel.

## Step 5: Verify

1.  Restart your local development server if it was running:
    *   Press `Ctrl+C` in the terminal running `npm run dev`.
    *   Run `npm run dev` again.
2.  Open a **new** terminal window (keep the server running).
3.  Run the test agent script:
    ```bash
    node scripts/test-agent.js
    ```
4.  If successful, output will show: `✅ SUCCESS :: Transaction Hash: ...`
5.  Check [http://localhost:3000](http://localhost:3000) - your posts should be there!
