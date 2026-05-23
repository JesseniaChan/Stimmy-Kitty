# Stimmy Kitty

Stimmy Kitty is a Chrome extension with two modes:

- **Stim mode:** tap the cartoon kitty for sparkles.
- **AI search mode:** search for recommendations, then tap the kitty to pop one new speech-bubble recommendation at a time. Previous recommendations stay in the list at the bottom.

The extension talks to a small Vercel backend so your Gemini API key never goes inside the browser extension.

## Project structure

```text
Stimmy-Kitty/
  stimmy-kitty-extension/   Chrome extension popup UI
  stimmy-kitty-backend/     Vercel API route that calls Gemini
```

## Backend setup

1. Go to `stimmy-kitty-backend`.
2. Add your Gemini API key in Vercel:

   ```text
   GEMINI_API_KEY=your_real_key
   ```

3. Optional model override:

   ```text
   GEMINI_MODEL=gemini-2.5-flash
   ```

4. Deploy:

   ```bash
   vercel deploy --prod
   ```

5. Use the stable aliased URL with `/api/search`, for example:

   ```js
   const BACKEND_URL = 'https://stimmy-kitty-backend.vercel.app/api/search';
   ```

Do not put the Gemini API key in the extension. Only the backend should have it.

## Extension setup

1. Open `stimmy-kitty-extension/popup.js`.
2. Set `BACKEND_URL` to your Vercel backend URL ending in `/api/search`.
3. Open `chrome://extensions`.
4. Enable **Developer mode**.
5. Click **Load unpacked**.
6. Select the `stimmy-kitty-extension` folder.

After code edits, refresh the extension from `chrome://extensions`, then reopen the popup.

## Recommendation settings

In `stimmy-kitty-extension/popup.js`:

```js
const INITIAL_RESULT_COUNT = 1;
const FRESH_RESULT_COUNT = 1;
```

- `INITIAL_RESULT_COUNT` controls how many recommendations appear after the first search.
- `FRESH_RESULT_COUNT` controls how many new recommendations each kitty tap requests.

The current setup shows one bubble at a time. The extension sends already-shown names to the backend as `excludeNames` so taps ask for fresh places instead of looping the same list.

## Troubleshooting

If you see `Unexpected token 'T'`, the extension is probably receiving a Vercel web page instead of JSON. Check that `BACKEND_URL`:

- is not the placeholder URL
- uses your Vercel backend domain
- ends with `/api/search`

If you see `Missing GEMINI_API_KEY on the backend`, add `GEMINI_API_KEY` to Vercel Environment Variables and redeploy.

If recommendations repeat, keep the result count low and make the search more specific, such as `vegetarian restaurants in Seattle` instead of only `restaurants`.
