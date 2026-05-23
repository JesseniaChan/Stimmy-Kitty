# Stimmy Kitty Chrome Extension

## Setup

1. Deploy the backend first using `stimmy-kitty-backend/README.md`.
2. Copy your Vercel deployment URL.
3. Open `stimmy-kitty-extension/popup.js` and replace the `BACKEND_URL` constant with your deployment URL, for example:

   ```js
   const BACKEND_URL = 'https://your-project.vercel.app/api/search';
   ```

## Install in Chrome

1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `stimmy-kitty-extension/` folder
5. The kitty should appear in your toolbar

## Update after edits

1. Save your changes.
2. Refresh the extension on `chrome://extensions`.
3. Reopen the popup.

## Image asset

The popup kitten image is a generated local cartoon PNG at `kitten.png`.
