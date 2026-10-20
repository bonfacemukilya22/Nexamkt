# NexaMarkets (full-stack)

## Run it
1. Install Node.js 18+ (22 recommended): https://nodejs.org
2. Put your own `index.html` (home page) in this folder next to `app.html`.
3. In this folder run:  `node server.js`
4. Open http://localhost:8000/  (user site) and http://localhost:8000/admin/  (admin).

No `npm install` is needed. All data is stored in `data/db.json` (created automatically — back it up).

## Admin login
First run creates the admin from `ADMIN_USER` / `ADMIN_PASSWORD` (defaults: Tycoon / Tycoon_$#).
Passwords are stored hashed (scrypt). Change it any time from the admin panel ("Change my password").
To use different first-run values:  `ADMIN_USER=Tycoon ADMIN_PASSWORD=YourStrongPass node server.js`
If you ever lock yourself out, stop the server, delete `data/db.json` (this wipes all data) and start again.

## Settings (environment variables)
`PORT`, `BOT_MIN_CONF` (bot entry threshold, default 72), `NO_BINANCE=1` (turn off the Binance crypto feed), `BOT_PASSKEY` (default GK48RP — checked on the server, not in the page), `ADMIN_USER`, `ADMIN_PASSWORD`, `DERIV_APP_ID`, `NO_DERIV=1` (turn off the live feed).

## Putting it online
Run it behind HTTPS (Caddy / nginx / a host such as Render, Railway, a VPS). Users and admin must use the same site address.


## Markets & bot (updated)
- 32 forex pairs, 4 metals (XAUUSD, XAGUSD, XPDUSD, XPTUSD) and 59 cryptos. Forex/metals stream from Deriv; crypto from Binance (Deriv first for the 5 coins it lists).
- The bot trades ONLY the market selected when you press Start (changing market stops it). Each scan loads real candles on 1m/5m/15m/1h/4h, overlays the live price on the forming candle, and scores EMA trend, MACD, RSI, ADX, Bollinger, support/resistance and candle patterns (closed + forming).
- Confidence = how strongly timeframes and candles agree. It is not a win probability.
- The server only accepts a bot trade that matches a fresh passing signal for that market, and refuses bot or real-account trades when the market has no live feed (simulated "OTC" prices stay demo-only).
- Needs outbound access to wss://ws.derivws.com and Binance (data-api.binance.vision / api.binance.com). Some regions/hosts block Binance; those cryptos then stay OTC/demo-only.
