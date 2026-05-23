# Stimmy Kitty Backend

This folder contains the Vercel edge function proxy for Gemini. The server reads the Gemini API key from `process.env.GEMINI_API_KEY` and never exposes it to the browser.

## Deploy

1. Install Vercel globally if needed:

   ```bash
   npm i -g vercel
   ```

2. Deploy the backend:

   ```bash
   vercel deploy
   ```

3. In the Vercel dashboard, go to Settings → Environment Variables and add:

   - `GEMINI_API_KEY` with your Gemini API key

4. After deploy, copy the deployment URL and paste it into the extension's `BACKEND_URL` constant in `stimmy-kitty-extension/popup.js`.
