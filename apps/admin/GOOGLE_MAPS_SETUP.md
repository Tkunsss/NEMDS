# Google Maps API Setup for Admin App

## Error: ApiTargetBlockedMapError

This error means the Google Maps JavaScript API is blocked. Here's how to fix it:

### Step 1: Check Your API Key in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (tkunsss-projects)
3. Navigate to **APIs & Services** > **Credentials**
4. Find the API key (should be `AIzaSyCnJ5oNZyDu-b5QVm60kzrK5x4Z2kR7vzU`)

### Step 2: Verify Maps JavaScript API is Enabled

1. Go to **APIs & Services** > **Enabled APIs & services**
2. Look for **"Maps JavaScript API"**
3. If NOT listed, click **"Enable APIs and Services"** and search for "Maps JavaScript API"
4. Click it and press **"Enable"**

### Step 3: Check Domain Restrictions

In the API key settings:

1. Click on your API key to edit it
2. Under **Application restrictions**, set to **HTTP referrers (web sites)**
3. Add these domains:
   - `localhost:3000`
   - `localhost:5173` (Vite dev server)
   - `localhost:*` (to allow any port)
   - Your production domain (e.g., `admin.your-domain.com`)

### Step 4: Verify Environment Variables

Confirm `.env` file has:
```
VITE_GOOGLE_MAPS_API_KEY=AIzaSyCnJ5oNZyDu-b5QVm60kzrK5x4Z2kR7vzU
```

### Step 5: Restart Dev Server

After making changes:
```bash
npm run dev
```

## Testing

Once configured:
1. Go to Admin > Hospitals
2. Click "Search real hospitals"
3. The map should load and allow you to click to search

## Fallback: Text Search

If map still doesn't work, you can use the **text search** option below the map instead.

## Need Help?

Check browser console (F12) for more error details. The error message should tell you which API isn't enabled or what domain is being blocked.
