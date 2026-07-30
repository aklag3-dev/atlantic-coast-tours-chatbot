# How the Chatbot Works

## Flow

1. **Open the chat** — Click the teal bubble (bottom-right). A panel slides in from the right.

2. **Ask a question** — Type or tap a suggested chip. The message appears in the thread.

3. **Fetch live data** — The chatbot fetches the latest tour data from Google Sheets (CSV export). Updates to the sheet are reflected immediately.

4. **Build context** — All relevant information is packed into a prompt:
   - Tour database (30+ tours with prices, durations, locations, descriptions)
   - Company FAQs (booking, payment, cancellation, logistics)
   - Weather forecast (Open-Meteo — if location shared or tour area known)
   - Persona (Fiona if enabled)
   - Conversation history

5. **Gemini responds** — The context is sent to Gemini 2.5 Flash via a Cloudflare Worker proxy. The AI generates a natural-language answer with specific tour details, prices, and recommendations.

6. **Fallback** — If the Worker is unavailable, a rule-based matcher handles common questions from the built-in FAQ categories.

## Key Details

- **All responses go through AI** — even simple tour lookups and FAQ questions are answered by Gemini, not pre-written templates.
- **No API keys in the browser** — the Gemini key is stored as a Cloudflare secret.
- **Weather is automatic** — the AI checks the forecast for tour locations and your location (if enabled) and factors it into responses.
- **Dark mode + persona** — both toggled from the chat header and persisted in localStorage.
- **No backend server** — everything runs from static files on GitHub Pages.
