# Atlantic Coast Tours — Chatbot Assistant

Customer-support chat bot for Atlantic Coast Tours. Answers questions about tours, prices, booking, and the Wild Atlantic Way.

## Architecture

- **Rule-based matching** for tour data and company FAQs
- **Live data** fetched from Google Sheets CSV export on every question
- **Gemini AI fallback** via Cloudflare Worker for out-of-scope questions

## Data Source

Tour data: Google Sheets (`/export?format=csv&gid=120683740`)

## Deploy

### GitHub Pages

```bash
# Push to GitHub
git remote add origin git@github.com:aklag3-dev/atlantic-coast-tours-chatbot.git
git push -u origin main
# Enable Pages in repo Settings → Pages → Deploy from main branch, root folder
```

### Cloudflare Worker (AI fallback)

```bash
cd worker
npm install
npx wrangler login
npx wrangler secret put GEMINI_API_KEY   # paste your Gemini API key
npm run deploy
```

Update `PROXY_URL` in `js/gemini.js` with the Worker URL output from `deploy`.

Build: none (pure static HTML/CSS/JS).
