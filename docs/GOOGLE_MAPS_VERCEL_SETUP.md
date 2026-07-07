# Google Maps API & Vercel Setup

This file contains exact steps and copy-paste values to configure your Google Maps API key and Vercel environment so the maps load in the `caller` app.

IMPORTANT: I cannot access your Google Cloud or Vercel accounts from this workspace. Follow these steps, or grant me temporary access (not recommended) so I can apply them for you.

## 1) Get your production domain from Vercel
- Open your project on Vercel: https://vercel.com
- Project → Deployments → open the Production deployment → copy the `Domain` value (example: `nemds-caller.vercel.app`).

## 2) Google Cloud — enable API & add referrers
1. Open Google Cloud Console → select the project that owns the API key.
2. APIs & Services → Library → search `Maps JavaScript API` → click → `Enable` (if not already enabled).
3. APIs & Services → Credentials → find your API key (compare last 4 chars if needed).
4. Click the key → Edit.
5. Under **Application restrictions** select **HTTP referrers (web sites)** and add these entries (replace `<your-domain>` with the domain you copied from Vercel):

```
https://<your-domain>/*
https://<your-domain>/caller/*
http://localhost:5173/*
http://localhost:3000/*
```

Notes:
- If your site uses a custom domain, replace `<your-domain>` with that custom domain.
- Use wildcards `/*` to allow all app paths.

6. (Optional but recommended) Under **API restrictions** select **Restrict key** and choose **Maps JavaScript API**.
7. Save. Wait 1–2 minutes for propagation.

## 3) Vercel — set environment variable
1. Open Vercel → Project → Settings → Environment Variables.
2. Add a new environment variable:

- **Name:** `VITE_GOOGLE_MAPS_API_KEY`
- **Value:** (paste your API key here — the value you supplied earlier)
- **Environment:** `Production` (also add `Preview` or `Development` if desired)

3. Save and trigger a redeploy (Redeploy button on the latest deployment or push a trivial commit).

## 4) Quick local test
1. Create `apps/caller/.env.local` with:

```
VITE_GOOGLE_MAPS_API_KEY=YOUR_API_KEY_HERE
```

2. From repo root run:

```bash
cd apps/caller
npm install
npm run dev
```

Open `http://localhost:5173` and verify the map loads.

## 5) If you still see `ApiTargetBlockedMapError`
- Confirm you pasted the exact Vercel domain (copy/paste from the Vercel dashboard).
- Temporarily set **Application restrictions** to `None` for the key to verify the key works; if map loads, re-add correct referrers.
- Ensure Billing is enabled in the Google Cloud project.

## 6) Advanced markers (optional)
- Advanced markers require a Map ID and additional Google Cloud configuration; leave that for later once the map is rendering.

---
If you want, paste the exact production `Domain` value here and I will produce the exact strings ready to paste into Google Cloud and Vercel, or I can guide you step-by-step while you click.
