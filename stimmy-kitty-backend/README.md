# Stimmy Kitty Backend

This folder contains the Vercel edge function proxy for Gemini. The server reads the Gemini API key from `process.env.GEMINI_API_KEY` and never exposes it to the browser.

## Add your API key

For local development, copy `.env.example` to `.env` and replace the placeholder:

```bash
GEMINI_API_KEY=your_real_key_here
GEMINI_MODEL=gemini-2.5-flash
```

On Vercel, add the same values in **Settings -> Environment Variables**. `GEMINI_MODEL` is optional; the backend defaults to `gemini-2.5-flash`.

## Best setup path

The cleanest setup is to keep the API key only in Vercel and point the Chrome extension at your deployed Vercel function:

1. Create a Gemini API key.
2. In Vercel, import or deploy this `stimmy-kitty-backend` folder.
3. Add `GEMINI_API_KEY` in Vercel's Environment Variables.
4. Deploy.
5. Open the deployed URL plus `/api/search`.

For example, if Vercel gives you:

```text
https://stimmy-kitty-backend.vercel.app
```

then the extension backend URL must be:

```js
const BACKEND_URL = 'https://stimmy-kitty-backend.vercel.app/api/search';
```

If you see `Unexpected token 'T'` or a message about a web page instead of JSON, the extension is probably hitting the wrong URL, a Vercel 404 page, or the placeholder `https://YOUR-PROJECT.vercel.app/api/search`.

## Local development

Install the Vercel CLI, create `.env`, then run:

```bash
npm run dev
```

The local backend URL will usually be:

```js
const BACKEND_URL = 'http://localhost:3000/api/search';
```

Chrome extension host permissions may need to include `http://localhost:3000/*` while testing locally.

## Deploy

1. Install Vercel globally if needed:

   ```bash
   npm i -g vercel
   ```

2. Deploy the backend:

   ```bash
   vercel deploy
   ```

3. In the Vercel dashboard, go to Settings -> Environment Variables and add:

   - `GEMINI_API_KEY` with your Gemini API key
   - optional: `GEMINI_MODEL` if you want a different Gemini model

4. After deploy, copy the deployment URL and paste it into the extension's `BACKEND_URL` constant in `stimmy-kitty-extension/popup.js`.
