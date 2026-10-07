# Dynamic lines

A standalone, responsive stock showcase with six rolling prices and an animated comparison chart. No build step, dependencies, external fonts, or CDN is required.

From the repository root:

```sh
python3 -m http.server 8000
```

Open <http://localhost:8000/dynamic-lines/>. After the GitHub Pages workflow publishes the repository, the site is available at <https://delen0828.github.io/Interact4Trust-showcase/dynamic-lines/>.

## Prices and motion

The default showcase uses **clearly labeled simulated prices**, refreshed once per second, for AAPL, MSFT, GOOGL, AMZN, NVDA, and TSLA. Opening prices and large movements are illustrative, not actual quotes. The demo trading date uses America/New_York.

Each value is normalized to its stock's daily open: `price / open`. The logarithmic vertical axis spans **0.5× to 2×**, with **1× exactly in the middle**. Values outside the range are pinned to the corresponding edge and marked with an arrow; the displayed numbers retain their actual values.

Lines start at the left and grow into rolling trails. Trail speed is proportional to normalized value, bounded to the chart's range: a line at 1.5× moves 50% faster than one at 1×. All heads share a horizontal value scale. When the leader reaches the right edge, the other heads retain gaps proportional to their current differences in value. A stock overtaking another vertically also overtakes it horizontally; ties have matching head positions. The trails continue scrolling behind these heads with bounded histories. Horizontal position is a visual value and motion encoding, not a common timestamp.

Click a stock card to toggle its line. Pause freezes polling and drawing; Resume continues. Restart clears drawing trails while preserving opening prices. A new trading session resets the trails and normalizes against the new opening prices. Reduced-motion preferences replace digit rolling and continuous drawing with updates once per second. Hidden tabs stop polling; leaving the page cleans up its timers and requests.

## Share and embed

**Share / Embed** provides a standalone link and iframe HTML. Choose **Monitor + chart**, **Chart only**, or **Monitor only**. All three use the same quote feed and rolling-price renderer.

```html
<iframe
  src="https://delen0828.github.io/Interact4Trust-showcase/dynamic-lines/embed.html"
  title="Dynamic lines — simulated stock monitor"
  width="1100" height="760"
  style="border:0;width:100%;max-width:1100px"
  loading="lazy"
></iframe>
```

For only the chart, use `embed.html?view=chart` and a height of `420`. For only the six rolling prices and feed status, use `embed.html?view=monitor` and a height of `240` on desktop (about `480` on phones). Stock cards stack on smaller screens; increase the iframe height for a phone layout or allow the frame to scroll. The chart-only view fits its iframe's height.

## Equal-speed version

Open `index.html?motion=equal` or select **Equal speed** beneath the page title. All six lines advance at the same constant horizontal speed (5% of the plot width per second of active drawing), regardless of price. Heads stay aligned, reach the right edge together after 20 seconds, and scroll their histories together. Vertical positions still show price relative to the daily open. Pause, restart, line visibility, live feeds, and reduced motion work in both versions.

**Share / Embed** preserves `motion=equal` in the standalone link and all three iframe views. For a chart-only embed:

```html
<iframe
  src="https://delen0828.github.io/Interact4Trust-showcase/dynamic-lines/embed.html?motion=equal&amp;view=chart"
  title="Dynamic lines — equal speed"
  width="1100" height="420"
  style="border:0;width:100%;max-width:1100px"
  loading="lazy"
></iframe>
```

Omit `view=chart` for the monitor and chart together. The original value-speed version remains the default.

## Connect real quotes

Supply your browser-accessible quote endpoint with the `feed` URL parameter. The page polls at one-second intervals, allows one request at a time, and cancels requests after five seconds. The endpoint must allow cross-origin requests when hosted elsewhere. Provider credentials should stay on your own server; the feed URL is public and appears in shared links.

```text
dynamic-lines/?feed=https%3A%2F%2Fyour-server.example%2Fquotes
```

Return JSON in this format, with real daily opening prices and the actual quote timestamp:

```json
{
  "sessionDate": "2026-10-07",
  "asOf": "2026-10-07T14:30:01Z",
  "quotes": [
    { "symbol": "AAPL",  "price": 224.62, "open": 224.50 },
    { "symbol": "MSFT",  "price": 421.35, "open": 421.20 },
    { "symbol": "GOOGL", "price": 168.52, "open": 168.40 },
    { "symbol": "AMZN",  "price": 186.45, "open": 186.30 },
    { "symbol": "NVDA",  "price": 118.91, "open": 118.80 },
    { "symbol": "TSLA",  "price": 243.25, "open": 243.10 }
  ]
}
```

Those example prices are fictional. `sessionDate` identifies the quote's trading session, including outside trading hours. Failed or invalid responses keep the last prices visible and stop drawing until a valid response returns. Quotes more than ten seconds old display **Delayed quotes** and freeze drawing. The UI does not replace a failed live feed with simulated quotes.

Optionally pass exactly six unique ticker symbols: `?symbols=AAPL,MSFT,GOOGL,AMZN,NVDA,TSLA`. A live endpoint must return one quote for each chosen symbol. Both URL parameters are preserved in links and iframe snippets.

## Verify

```sh
node --test tests/dynamic-lines.test.mjs
```

With the repository root served, open <http://localhost:8000/tests/dynamic-lines.html> to exercise real iframe rendering, updates, relative drawing speeds, horizontal ordering after the border, pause/resume, visibility, all three sharing views, reduced motion, and malformed URLs. The border check lets all six trails advance past their initial window, so the suite takes about 70 seconds.
